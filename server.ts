import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '10mb' }));

  // Initialize Gemini AI client on the server side
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const geocodingSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        name: {
          type: Type.STRING,
          description: 'The exact place name string from the input list.',
        },
        lat: {
          type: Type.NUMBER,
          description: 'Geographic latitude as a decimal number.',
        },
        lon: {
          type: Type.NUMBER,
          description: 'Geographic longitude as a decimal number.',
        },
      },
      required: ['name', 'lat', 'lon'],
      description: 'A geocoded location with latitude and longitude.',
    },
    description: 'A list of geocoded locations.',
  };

  // Open Geocoding helper (Photon OSM + Open-Meteo) requiring no API key
  // In-memory server-side geocoding cache
  const serverGeocodeCache = new Map<string, { name: string; lat: number; lon: number }>();

  // Fetch with strict timeout helper
  async function fetchWithTimeout(url: string, options: any = {}, timeoutMs = 2500): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);
      return response;
    } catch (err) {
      clearTimeout(id);
      throw err;
    }
  }

  // Open Geocoding helper (Photon OSM + Open-Meteo) requiring no API key
  async function openGeocodePlace(placeName: string): Promise<{ name: string; lat: number; lon: number } | null> {
    const trimmed = placeName.trim();
    if (!trimmed) return null;

    if (serverGeocodeCache.has(trimmed)) {
      return serverGeocodeCache.get(trimmed)!;
    }

    // 1. Try Photon (Komoot OSM Geocoder)
    try {
      const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(trimmed)}&limit=1`;
      const res = await fetchWithTimeout(photonUrl, {
        headers: {
          'User-Agent': 'GEDCOM-Map-Visualizer/2.0 (Family History Research App)',
          'Accept': 'application/json',
        },
      }, 2500);

      if (res.ok) {
        const data = await res.json();
        if (data?.features?.length > 0) {
          const [lon, lat] = data.features[0].geometry.coordinates;
          if (typeof lat === 'number' && typeof lon === 'number' && !isNaN(lat) && !isNaN(lon)) {
            const result = { name: placeName, lat: Number(lat.toFixed(5)), lon: Number(lon.toFixed(5)) };
            serverGeocodeCache.set(trimmed, result);
            return result;
          }
        }
      }
    } catch {
      // Continue to next provider
    }

    // 2. Try Open-Meteo with parsed segments
    try {
      const parts = trimmed.split(',').map(s => s.trim()).filter(Boolean);
      const candidates = [
        trimmed,
        parts.length > 1 ? parts.slice(1).join(', ') : null,
        parts.length > 2 ? `${parts[0]}, ${parts[parts.length - 1]}` : null,
        parts[0],
      ].filter((s): s is string => Boolean(s));

      for (const query of candidates) {
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;
        const res = await fetchWithTimeout(url, {}, 2500);
        if (res.ok) {
          const data = await res.json();
          if (data?.results?.length > 0) {
            const r = data.results[0];
            if (typeof r.latitude === 'number' && typeof r.longitude === 'number' && !isNaN(r.latitude) && !isNaN(r.longitude)) {
              const result = { name: placeName, lat: Number(r.latitude.toFixed(5)), lon: Number(r.longitude.toFixed(5)) };
              serverGeocodeCache.set(trimmed, result);
              return result;
            }
          }
        }
      }
    } catch {
      // Continue
    }

    return null;
  }

  // GET /api/health - Dev server and platform readiness probe
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // POST /api/geocode - Batch geocoding: Open Services first, Gemini as fallback
  app.post('/api/geocode', async (req, res) => {
    try {
      const { places } = req.body;
      if (!Array.isArray(places) || places.length === 0) {
        return res.json({ results: [] });
      }

      const resultsMap = new Map<string, { name: string; lat: number; lon: number }>();
      const needLookup: string[] = [];

      // Check server cache first
      for (const p of places) {
        const trimmed = String(p).trim();
        if (serverGeocodeCache.has(trimmed)) {
          resultsMap.set(p, serverGeocodeCache.get(trimmed)!);
        } else {
          needLookup.push(p);
        }
      }

      // Run open geocoding with controlled worker pool (concurrency 10)
      const concurrency = 10;
      let nextIndex = 0;
      const unresolved: string[] = [];

      const worker = async () => {
        while (nextIndex < needLookup.length) {
          const idx = nextIndex++;
          const place = needLookup[idx];
          const result = await openGeocodePlace(place);
          if (result) {
            resultsMap.set(place, result);
          } else {
            unresolved.push(place);
          }
        }
      };

      if (needLookup.length > 0) {
        await Promise.all(Array.from({ length: Math.min(concurrency, needLookup.length) }, () => worker()));
      }

      // If any unresolved places remain and an API key is available, use Gemini as fallback
      if (unresolved.length > 0 && apiKey) {
        try {
          const prompt = `
Geocode the following list of place names for a genealogical application. For each place name, provide the latitude and longitude.

Rules:
1. The 'name' property in your JSON output MUST match the original string provided in the list below.
2. Only return locations you are confident about.
3. If multiple locations exist for a name, provide the most prominent historical or likely location for genealogy records.
4. Ensure latitude and longitude are valid decimal numbers.

Places to geocode:
${unresolved.join('\n')}
          `.trim();

          const response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              responseSchema: geocodingSchema,
            },
          });

          const jsonText = response.text?.trim();
          if (jsonText) {
            const parsed = JSON.parse(jsonText);
            if (Array.isArray(parsed)) {
              for (const item of parsed) {
                if (
                  item &&
                  typeof item.name === 'string' &&
                  typeof item.lat === 'number' &&
                  !isNaN(item.lat) &&
                  typeof item.lon === 'number' &&
                  !isNaN(item.lon)
                ) {
                  resultsMap.set(item.name, item);
                  serverGeocodeCache.set(item.name.trim(), item);
                }
              }
            }
          }
        } catch (geminiErr) {
          console.warn('Gemini fallback geocoding failed (safely handled):', geminiErr);
        }
      }

      return res.json({ results: Array.from(resultsMap.values()) });
    } catch (error: any) {
      console.error('Server geocode error:', error);
      return res.json({ results: [], error: error.message || 'Geocoding failed' });
    }
  });

  // POST /api/historical-context - Generate rich historical overview in Hebrew or English
  app.post('/api/historical-context', async (req, res) => {
    try {
      const { name, type, eventsSummary, lang = 'he' } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Missing name' });
      }

      if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not set on server' });
      }

      const isEn = lang === 'en';
      const prompt = isEn
        ? `
You are an expert genealogist and historian specializing in bringing rich historical context to family trees.

Please create an engaging, in-depth, and fact-based historical overview in English for the following ${type === 'person' ? 'person' : 'location'}:
Name: ${name}
Timeline & Events:
${eventsSummary || ''}

Writing guidelines:
1. Write in clear, engaging, and respectful English.
2. Describe the historical background of the places and years in which the person lived or where the events occurred (e.g., major historical events in that decade, wars, social changes, migrations, industrial developments, or local history).
3. Help the reader visualize everyday life in that era and place (housing, transport, livelihoods, and daily challenges).
4. Organize the response clearly with Markdown headings, bullet points, and readable paragraphs.
5. Maintain historical accuracy alongside a warm narrative suitable for family roots research.

Start directly with an appropriate Markdown heading without conversational meta-introductions.
        `.trim()
        : `
אתה גנאולוג והיסטוריון מומחה העוסק בהנגשת הקשרים היסטוריים עשירים למשפחות ואילנות יוחסין.

אנא צור סקירה היסטורית מרתקת, מעמיקה ומבוססת עובדות בעברית עבור ${type === 'person' ? 'האדם הבא' : 'המיקום הבא'}:
שם: ${name}
אירועים וציר זמן:
${eventsSummary || ''}

הנחיות לכתיבה:
1. כתוב בעברית קולחת, מכובדת ומרתקת.
2. תאר את הרקע ההיסטורי של המקומות והשנים שבהם האדם חי או שבהם התרחשו האירועים (למשל: אירועים היסטוריים מרכזיים באותו עשור, מלחמות, תהליכים חברתיים, הגירות, מהפכות תעשייתיות או אירועים מקומיים).
3. עזור למשתמש לדמיין את חיי היומיום באותה תקופה ובאותם מקומות (איך נראו המגורים, התחבורה, מקורות הפרנסה, או קשיי היום-יום).
4. ארגן את התשובה בצורה יפהפייה עם כותרות, נקודות בולטות (bullet points) ופסקאות קריאות בפורמט Markdown.
5. שמור על אובייקטיביות היסטורית לצד חיבור רגשי ומרגש שמתאים למחקר שורשים משפחתי.

אנא התחל את הסקירה ישירות בכותרת מעוצבת ומתאימה, ללא הקדמות מטא-טקסטואליות (כמו "בוודאי, הנה הסקירה...").
        `.trim();

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: prompt,
      });

      return res.json({ text: response.text || (isEn ? 'No historical context received.' : 'לא התקבל מידע היסטורי.') });
    } catch (error: any) {
      console.error('Server historical-context error:', error);
      return res.status(500).json({ error: error.message || 'Failed to generate context' });
    }
  });

  // POST /api/chat-context - Interactive chat regarding genealogical history
  app.post('/api/chat-context', async (req, res) => {
    try {
      const { name, type, eventsSummary, history, latestQuestion, lang = 'he' } = req.body;
      if (!latestQuestion) {
        return res.status(400).json({ error: 'Missing question' });
      }

      if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not set on server' });
      }

      const isEn = lang === 'en';
      const contents: any[] = [
        {
          role: 'user',
          parts: [
            {
              text: isEn
                ? `I am researching my family history. Here are the details of the ${type === 'person' ? 'person' : 'location'} I am researching:
Name: ${name}
Timeline & Events:
${eventsSummary || ''}

Help me understand the historical background and daily life. Always respond in clear, professional English.`
                : `אני חוקר את ההיסטוריה המשפחתית שלי. הנה פרטי ${type === 'person' ? 'האדם' : 'המיקום'} שאני חוקר:
שם: ${name}
ציר זמן ואירועים:
${eventsSummary || ''}

עזור לי להבין את הרקע ההיסטורי ואת חיי היומיום. אנא ענה תמיד בעברית קריאה ומקצועית.`,
            },
          ],
        },
      ];

      if (Array.isArray(history)) {
        for (const turn of history) {
          contents.push({
            role: turn.role === 'model' ? 'model' : 'user',
            parts: [{ text: turn.text || '' }],
          });
        }
      }

      contents.push({
        role: 'user',
        parts: [{ text: latestQuestion }],
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents,
      });

      return res.json({ text: response.text || (isEn ? 'No response received.' : 'לא התקבל מענה.') });
    } catch (error: any) {
      console.error('Server chat-context error:', error);
      return res.status(500).json({ error: error.message || 'Failed in chat context' });
    }
  });

  // Setup Vite middleware in dev or express static in prod
  const distDir = path.resolve(__dirname, 'dist');
  const distIndexHtml = path.resolve(distDir, 'index.html');
  const hasDist = fs.existsSync(distIndexHtml);

  if (isProd && hasDist) {
    app.use(express.static(distDir));
    app.use((_req, res) => {
      res.sendFile(distIndexHtml);
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
      root: __dirname,
      configFile: path.resolve(__dirname, 'vite.config.ts'),
    });
    app.use(vite.middlewares);
    app.use(async (req, res, next) => {
      if (req.method !== 'GET') {
        return next();
      }
      try {
        const url = req.originalUrl;
        const indexHtmlPath = path.resolve(__dirname, 'index.html');
        if (!fs.existsSync(indexHtmlPath)) {
          return next();
        }
        let template = fs.readFileSync(indexHtmlPath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        next(e);
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
