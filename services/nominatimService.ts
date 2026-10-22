import { findKnownLocation } from './knownLocations.ts';

/** Hebrew city names that must resolve in Israel (not European namesakes). */
const HEBREW_ISRAEL_CITIES: Record<string, { lat: number; lon: number }> = {
  'ערד': { lat: 31.2589, lon: 35.2128 },
  'אילת': { lat: 29.5577, lon: 34.9519 },
  'דימונה': { lat: 31.0694, lon: 35.0333 },
  'באר שבע': { lat: 31.2529, lon: 34.7915 },
  'ירושלים': { lat: 31.7683, lon: 35.2137 },
  'תל אביב': { lat: 32.0853, lon: 34.7818 },
  'חיפה': { lat: 32.7940, lon: 34.9896 },
};

/** Yemen places — do not confuse with southern Israel. */
const YEMEN_PLACES: Record<string, { lat: number; lon: number }> = {
  'שבאם': { lat: 15.9269, lon: 48.6267 },
  'שיבאם': { lat: 15.9269, lon: 48.6267 },
  'שibam': { lat: 15.9269, lon: 48.6267 },
  'צנעא': { lat: 15.3694, lon: 44.1910 },
  'עדן': { lat: 12.7855, lon: 45.0187 },
  shibam: { lat: 15.9269, lon: 48.6267 },
  shabam: { lat: 15.9269, lon: 48.6267 },
};

const hardcodeHebrewOrYemen = (placeName: string): { lat: number; lon: number } | null => {
  const n = placeName.trim().toLowerCase().replace(/["'״׳]/g, '');
  const heKey = placeName.trim().split(',')[0].trim();
  if (HEBREW_ISRAEL_CITIES[heKey]) return HEBREW_ISRAEL_CITIES[heKey];
  if (YEMEN_PLACES[heKey]) return YEMEN_PLACES[heKey];
  if (YEMEN_PLACES[n]) return YEMEN_PLACES[n];
  if (/\barad\b/.test(n) && /israel|ישראל/.test(n)) return { lat: 31.2589, lon: 35.2128 };
  if (/\b(shibam|shabam)\b/.test(n)) return { lat: 15.9269, lon: 48.6267 };
  return null;
};

const fetchWithTimeout = async (
  url: string,
  options: RequestInit = {},
  timeoutMs = 4000
): Promise<Response> => {
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
};

const hasHebrew = (s: string) => /[\u0590-\u05FF]/.test(s);

const tokens = (s: string): string[] =>
  s
    .toLowerCase()
    .replace(/[\"'״׳()\[\]]/g, ' ')
    .split(/[,\s/;|]+/)
    .map(x => x.trim())
    .filter(x => x.length >= 2);

const scoreMatch = (query: string, label: string): number => {
  const q = tokens(query);
  const l = tokens(label);
  if (!q.length || !l.length) return 0;
  let hits = 0;
  for (const t of q) {
    if (l.some(x => x === t || x.includes(t) || t.includes(x))) hits++;
  }
  return hits / q.length;
};

const countryHint = (
  place: string
): { minLat: number; maxLat: number; minLon: number; maxLon: number } | null => {
  const p = place.toLowerCase();
  if (/ישראל|israel|palestine|פלסטין|יהודה|שומרון|גליל|נגב/.test(p))
    return { minLat: 29.4, maxLat: 33.5, minLon: 34.2, maxLon: 35.95 };
  if (/poland|פולין|galicia|גליציה|warsaw|ורשה|krak/.test(p))
    return { minLat: 49, maxLat: 55, minLon: 14, maxLon: 25 };
  if (/ukraine|אוקראינה|kiev|kyiv|odesa|odessa/.test(p))
    return { minLat: 44, maxLat: 53, minLon: 22, maxLon: 41 };
  if (/russia|רוסיה|moscow|מוסקבה|petersburg/.test(p))
    return { minLat: 41, maxLat: 72, minLon: 27, maxLon: 180 };
  if (/germany|גרמניה|deutschland|berlin/.test(p))
    return { minLat: 47, maxLat: 55.2, minLon: 5.8, maxLon: 15.1 };
  if (/england|britain|uk|united kingdom|אנגליה|בריטניה|london|לונדון|scotland|wales/.test(p))
    return { minLat: 49.8, maxLat: 61, minLon: -8.7, maxLon: 2 };
  if (/usa|united states|america|ארצות הברית|new york|chicago|california/.test(p))
    return { minLat: 24, maxLat: 50, minLon: -125, maxLon: -66 };
  if (/france|צרפת|paris|פריז/.test(p))
    return { minLat: 41, maxLat: 51.5, minLon: -5.5, maxLon: 10 };
  if (/morocco|מרוקו|casablanca|fez|מרקש|marrakech/.test(p))
    return { minLat: 27, maxLat: 36, minLon: -13.5, maxLon: -0.5 };
  if (/iraq|עיראק|baghdad|בגדד/.test(p))
    return { minLat: 29, maxLat: 38, minLon: 38, maxLon: 49 };
  if (/yemen|תימן|aden|sanaa/.test(p))
    return { minLat: 12, maxLat: 19, minLon: 42, maxLon: 55 };
  if (/egypt|מצרים|cairo|קהיר|alexandria/.test(p))
    return { minLat: 22, maxLat: 32, minLon: 24, maxLon: 37 };
  return null;
};

const inHint = (
  lat: number,
  lon: number,
  hint: { minLat: number; maxLat: number; minLon: number; maxLon: number } | null
): boolean => {
  if (!hint) return true;
  return lat >= hint.minLat && lat <= hint.maxLat && lon >= hint.minLon && lon <= hint.maxLon;
};

export const getGeocodingCandidates = (placeName: string): string[] => {
  const trimmed = placeName.trim();
  if (!trimmed) return [];
  const candidates: string[] = [trimmed];
  const cleanedBrackets = trimmed
    .replace(/\((.*?)\)/g, ', $1')
    .replace(/\[(.*?)\]/g, ', $1')
    .replace(/\s+/g, ' ')
    .trim();
  if (cleanedBrackets !== trimmed && cleanedBrackets) candidates.push(cleanedBrackets);
  const withoutPrefix = trimmed
    .replace(/^(near|at|near to|church of|cemetery in|בית עלמין|בית קברות|בית כנסת)\s+/i, '')
    .trim();
  if (withoutPrefix && withoutPrefix !== trimmed) candidates.push(withoutPrefix);
  const parts = trimmed.split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length > 1) {
    candidates.push(parts.slice(1).join(', '));
    if (parts.length > 2) {
      candidates.push(`${parts[0]}, ${parts[parts.length - 1]}`);
      candidates.push(parts.slice(-2).join(', '));
    }
    for (const part of parts) {
      if (part.length >= 3) candidates.push(part);
    }
  }
  return Array.from(new Set(candidates)).filter(c => c.length > 1);
};

type Hit = { lat: number; lon: number; label: string; score: number };

const pickBest = (query: string, hits: Hit[]): Hit | null => {
  if (!hits.length) return null;
  const hint = countryHint(query);
  const ranked = hits
    .map(h => ({
      ...h,
      score: h.score + (inHint(h.lat, h.lon, hint) ? 0.35 : -0.5),
    }))
    .sort((a, b) => b.score - a.score);
  const best = ranked[0];
  if (tokens(query).length >= 2 && best.score < 0.15) return null;
  return best;
};

async function tryNominatim(query: string, langHe: boolean): Promise<Hit[]> {
  const url =
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}` +
    `&format=json&limit=5&addressdetails=0`;
  const response = await fetchWithTimeout(
    url,
    {
      headers: {
        'User-Agent': 'GEDCOM-Map-Visualizer/2.1 (Genealogy Research; github.com/baobabprince)',
        Accept: 'application/json',
        'Accept-Language': langHe ? 'he,en' : 'en,he',
      },
    },
    4500
  );
  if (!response.ok) return [];
  const data = await response.json();
  if (!Array.isArray(data)) return [];
  const hits: Hit[] = [];
  for (const row of data) {
    const lat = parseFloat(row.lat);
    const lon = parseFloat(row.lon);
    if (isNaN(lat) || isNaN(lon)) continue;
    const label = String(row.display_name || query);
    hits.push({ lat, lon, label, score: scoreMatch(query, label) });
  }
  return hits;
}

async function tryPhoton(query: string): Promise<Hit[]> {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`;
  const res = await fetchWithTimeout(url, { headers: { Accept: 'application/json' } }, 3500);
  if (!res.ok) return [];
  const data = await res.json();
  const hits: Hit[] = [];
  for (const f of data?.features || []) {
    const coords = f?.geometry?.coordinates;
    if (!coords || coords.length < 2) continue;
    const [lon, lat] = coords;
    if (typeof lat !== 'number' || typeof lon !== 'number') continue;
    const props = f.properties || {};
    const label = [props.name, props.city, props.state, props.country].filter(Boolean).join(', ');
    hits.push({ lat, lon, label: label || query, score: scoreMatch(query, label || query) });
  }
  return hits;
}

async function tryOpenMeteo(query: string, langHe: boolean): Promise<Hit[]> {
  const simple = query.split(',')[0].trim();
  if (simple.length < 2) return [];
  const lang = langHe ? 'he' : 'en';
  const url =
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(simple)}` +
    `&count=5&language=${lang}&format=json`;
  const res = await fetchWithTimeout(url, {}, 3500);
  if (!res.ok) return [];
  const data = await res.json();
  const hits: Hit[] = [];
  for (const row of data?.results || []) {
    const { latitude, longitude, name, country, admin1 } = row;
    if (typeof latitude !== 'number' || typeof longitude !== 'number') continue;
    const label = [name, admin1, country].filter(Boolean).join(', ');
    hits.push({ lat: latitude, lon: longitude, label, score: scoreMatch(query, label) });
  }
  return hits;
}

export const geocodeSinglePlace = async (
  placeName: string
): Promise<{ name: string; lat: number; lon: number } | null> => {
  const trimmed = placeName.trim();
  if (!trimmed) return null;

  const forced = hardcodeHebrewOrYemen(trimmed);
  if (forced) {
    return { name: placeName, lat: forced.lat, lon: forced.lon };
  }

  const known = findKnownLocation(trimmed);
  if (known) return { name: placeName, lat: known.lat, lon: known.lon };

  const candidates = getGeocodingCandidates(trimmed);
  const langHe = hasHebrew(trimmed);
  const allHits: Hit[] = [];

  for (const query of candidates.slice(0, 4)) {
    try {
      const hits = await tryNominatim(query, langHe);
      allHits.push(...hits.map(h => ({ ...h, score: h.score + (query === trimmed ? 0.1 : 0) })));
      const best = pickBest(trimmed, hits);
      if (best && best.score >= 0.35) {
        return {
          name: placeName,
          lat: Number(best.lat.toFixed(5)),
          lon: Number(best.lon.toFixed(5)),
        };
      }
    } catch {
      /* continue */
    }
  }

  for (const query of candidates.slice(0, 3)) {
    try {
      allHits.push(...(await tryPhoton(query)));
    } catch {
      /* continue */
    }
  }

  for (const query of candidates.slice(0, 3)) {
    try {
      allHits.push(...(await tryOpenMeteo(query, langHe)));
    } catch {
      /* continue */
    }
  }

  const best = pickBest(trimmed, allHits);
  if (!best) return null;
  return {
    name: placeName,
    lat: Number(best.lat.toFixed(5)),
    lon: Number(best.lon.toFixed(5)),
  };
};
