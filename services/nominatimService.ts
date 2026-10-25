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
  'מעלות': { lat: 33.0167, lon: 35.2708 },
  'מעלות תרשיחא': { lat: 33.0167, lon: 35.2708 },
  'מעלות-תרשיחא': { lat: 33.0167, lon: 35.2708 },
  'אלקנה': { lat: 32.1116, lon: 35.0355 },
  'כפר תפוח': { lat: 32.1191, lon: 35.2501 },
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

/** Well-known diaspora / European cities often mis-mapped to Israeli streets. */
const FORCED_CITIES: Record<string, { lat: number; lon: number }> = {
  burgas: { lat: 42.5048, lon: 27.4626 },
  'burgas, bulgaria': { lat: 42.5048, lon: 27.4626 },
  'בורגס': { lat: 42.5048, lon: 27.4626 },
  'בורגס, בולגריה': { lat: 42.5048, lon: 27.4626 },
  sofia: { lat: 42.6977, lon: 23.3219 },
  'sofia, bulgaria': { lat: 42.6977, lon: 23.3219 },
  plovdiv: { lat: 42.1354, lon: 24.7453 },
  varna: { lat: 43.2141, lon: 27.9147 },
  chernivtsi: { lat: 48.2921, lon: 25.9358 },
  czernowitz: { lat: 48.2921, lon: 25.9358 },
  cernauti: { lat: 48.2921, lon: 25.9358 },
  'chernivtsi, ukraine': { lat: 48.2921, lon: 25.9358 },
  'czernowitz, romania': { lat: 48.2921, lon: 25.9358 },
  'czernowitz, bukovina': { lat: 48.2921, lon: 25.9358 },
  'צרנוביץ': { lat: 48.2921, lon: 25.9358 },
  "צ'רנוביץ": { lat: 48.2921, lon: 25.9358 },
  'צ׳רנוביץ': { lat: 48.2921, lon: 25.9358 },
  'צ׳רנוביץ, רומניה': { lat: 48.2921, lon: 25.9358 },
  "צ'רנוביץ, רומניה": { lat: 48.2921, lon: 25.9358 },
};

const hardcodePlace = (placeName: string): { lat: number; lon: number } | null => {
  const n = placeName.trim().toLowerCase().replace(/[\"'״׳׳]/g, "'");
  const heKey = placeName.trim().split(',')[0].trim();
  if (HEBREW_ISRAEL_CITIES[heKey]) return HEBREW_ISRAEL_CITIES[heKey];
  if (YEMEN_PLACES[heKey]) return YEMEN_PLACES[heKey];
  if (YEMEN_PLACES[n]) return YEMEN_PLACES[n];
  if (FORCED_CITIES[n]) return FORCED_CITIES[n];
  if (FORCED_CITIES[heKey]) return FORCED_CITIES[heKey];
  const n2 = n.replace(/['׳]/g, "'");
  if (FORCED_CITIES[n2]) return FORCED_CITIES[n2];
  if (/\barad\b/.test(n) && /israel|ישראל/.test(n)) return { lat: 31.2589, lon: 35.2128 };
  if (/\b(shibam|shabam)\b/.test(n)) return { lat: 15.9269, lon: 48.6267 };
  if (/\bburgas\b/.test(n)) return { lat: 42.5048, lon: 27.4626 };
  if (/chernivtsi|czernowitz|cernauti|צרנוביץ|צ.?רנוביץ/.test(n)) return { lat: 48.2921, lon: 25.9358 };
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
const isMostlyLatin = (s: string) => /[a-zA-Z]/.test(s) && !hasHebrew(s);

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
    if (l.some(x => x === t)) hits += 1;
    else if (t.length >= 4 && l.some(x => x.startsWith(t) || t.startsWith(x))) hits += 0.6;
  }
  return hits / q.length;
};

type BBox = { minLat: number; maxLat: number; minLon: number; maxLon: number };
const ISRAEL_BBOX: BBox = { minLat: 29.4, maxLat: 33.5, minLon: 34.15, maxLon: 35.95 };

const COUNTRY_BOXES: { re: RegExp; box: BBox; names: string[] }[] = [
  { re: /ישראל|\bisrael\b|palestine|פלסטין/, box: ISRAEL_BBOX, names: ['israel', 'ישראל'] },
  { re: /poland|פולין|galicia|גליציה/, box: { minLat: 49, maxLat: 55, minLon: 14, maxLon: 25 }, names: ['poland', 'פולין'] },
  { re: /ukraine|אוקראינה|\bkiev\b|\bkyiv\b/, box: { minLat: 44, maxLat: 53, minLon: 22, maxLon: 41 }, names: ['ukraine', 'אוקראינה'] },
  { re: /russia|רוסיה|moscow|מוסקבה/, box: { minLat: 41, maxLat: 72, minLon: 27, maxLon: 180 }, names: ['russia', 'רוסיה'] },
  { re: /germany|גרמניה|deutschland/, box: { minLat: 47, maxLat: 55.2, minLon: 5.8, maxLon: 15.1 }, names: ['germany', 'גרמניה'] },
  { re: /england|britain|\buk\b|united kingdom|אנגליה|בריטניה|scotland|wales/, box: { minLat: 49.8, maxLat: 61, minLon: -8.7, maxLon: 2 }, names: ['united kingdom', 'england'] },
  { re: /\busa\b|united states|\bamerica\b|ארצות הברית/, box: { minLat: 24, maxLat: 50, minLon: -125, maxLon: -66 }, names: ['united states', 'usa'] },
  { re: /france|צרפת/, box: { minLat: 41, maxLat: 51.5, minLon: -5.5, maxLon: 10 }, names: ['france', 'צרפת'] },
  { re: /morocco|מרוקו/, box: { minLat: 27, maxLat: 36, minLon: -13.5, maxLon: -0.5 }, names: ['morocco', 'מרוקו'] },
  { re: /iraq|עיראק/, box: { minLat: 29, maxLat: 38, minLon: 38, maxLon: 49 }, names: ['iraq', 'עיראק'] },
  { re: /yemen|תימן/, box: { minLat: 12, maxLat: 19, minLon: 42, maxLon: 55 }, names: ['yemen', 'תימן'] },
  { re: /egypt|מצרים/, box: { minLat: 22, maxLat: 32, minLon: 24, maxLon: 37 }, names: ['egypt', 'מצרים'] },
  { re: /bulgaria|בולגריה|\bburgas\b|בורגס/, box: { minLat: 41.2, maxLat: 44.3, minLon: 22.3, maxLon: 28.7 }, names: ['bulgaria', 'בולגריה'] },
  { re: /romania|רומניה|bukovina|בוקובינה|czernowitz|chernivtsi|cernauti|צרנוביץ|צ.?רנוביץ/, box: { minLat: 43.5, maxLat: 48.5, minLon: 20, maxLon: 30 }, names: ['romania', 'רומניה', 'ukraine'] },
  { re: /hungary|הונגריה/, box: { minLat: 45.7, maxLat: 48.6, minLon: 16, maxLon: 23 }, names: ['hungary', 'הונגריה'] },
  { re: /austria|אוסטריה|vienna|ווינה|וינה/, box: { minLat: 46.3, maxLat: 49.1, minLon: 9.4, maxLon: 17.2 }, names: ['austria', 'אוסטריה'] },
  { re: /lithuania|ליטא|vilna|vilnius/, box: { minLat: 53.8, maxLat: 56.5, minLon: 20.9, maxLon: 26.9 }, names: ['lithuania', 'ליטא'] },
  { re: /latvia|לטביה|\briga\b/, box: { minLat: 55.6, maxLat: 58.1, minLon: 20.9, maxLon: 28.3 }, names: ['latvia', 'לטביה'] },
  { re: /belarus|בלארוס|white russia|minsk/, box: { minLat: 51.2, maxLat: 56.2, minLon: 23.1, maxLon: 32.8 }, names: ['belarus', 'בלארוס'] },
  { re: /moldova|מולדובה|kishinev|chisinau/, box: { minLat: 45.4, maxLat: 48.5, minLon: 26.6, maxLon: 30.2 }, names: ['moldova', 'מולדובה'] },
  { re: /greece|יוון|salonica|thessaloniki/, box: { minLat: 34.8, maxLat: 41.8, minLon: 19.3, maxLon: 29.7 }, names: ['greece', 'יוון'] },
  { re: /turkey|טורקיה|ottoman|istanbul/, box: { minLat: 35.8, maxLat: 42.3, minLon: 25.6, maxLon: 45 }, names: ['turkey', 'טורקיה'] },
];

const detectCountry = (place: string): { box: BBox; names: string[]; isIsrael: boolean } | null => {
  const p = place.toLowerCase();
  for (const c of COUNTRY_BOXES) {
    if (c.re.test(p)) return { box: c.box, names: c.names, isIsrael: c.box === ISRAEL_BBOX };
  }
  return null;
};

const inBox = (lat: number, lon: number, box: BBox) =>
  lat >= box.minLat && lat <= box.maxLat && lon >= box.minLon && lon <= box.maxLon;
const isInIsrael = (lat: number, lon: number) => inBox(lat, lon, ISRAEL_BBOX);

const isStreetLike = (label: string, osmClass?: string, osmType?: string): boolean => {
  const l = label.toLowerCase();
  if (/\b(street|st\.|road|rd\.|avenue|ave\.|lane|boulevard|blvd|square|plaza|alley)\b/.test(l)) return true;
  if (/(רחוב|שדרות|סמטה|כיכר|דרך)\s/.test(label) || /^(רחוב|שדרות|כיכר|דרך)\b/.test(label)) return true;
  if (osmClass === 'highway') return true;
  if (osmType && /^(residential|secondary|tertiary|primary|pedestrian|living_street|footway)$/.test(osmType)) return true;
  if (osmClass === 'place' && osmType === 'square') return true;
  return false;
};

const isSettlementLike = (osmClass?: string, osmType?: string): boolean => {
  if (!osmClass && !osmType) return false;
  if (osmClass === 'place' && osmType && /^(city|town|village|hamlet|municipality|suburb)$/.test(osmType)) return true;
  if (osmClass === 'boundary' && osmType === 'administrative') return true;
  return false;
};

export const getGeocodingCandidates = (placeName: string): string[] => {
  const trimmed = placeName.trim();
  if (!trimmed) return [];
  const candidates: string[] = [trimmed];
  const cleanedBrackets = trimmed.replace(/\((.*?)\)/g, ', $1').replace(/\[(.*?)\]/g, ', $1').replace(/\s+/g, ' ').trim();
  if (cleanedBrackets !== trimmed && cleanedBrackets) candidates.push(cleanedBrackets);
  const withoutPrefix = trimmed.replace(/^(near|at|near to|church of|cemetery in|בית עלמין|בית קברות|בית כנסת)\s+/i, '').trim();
  if (withoutPrefix && withoutPrefix !== trimmed) candidates.push(withoutPrefix);
  const parts = trimmed.split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length > 1) {
    candidates.push(`${parts[0]}, ${parts[parts.length - 1]}`);
    candidates.push(parts.slice(1).join(', '));
    if (parts.length > 2) candidates.push(parts.slice(-2).join(', '));
    if (parts[0].length >= 3) candidates.push(parts[0]);
  }
  return Array.from(new Set(candidates)).filter(c => c.length > 1);
};

type Hit = { lat: number; lon: number; label: string; score: number; osmClass?: string; osmType?: string };

const rankHits = (query: string, hits: Hit[]): Hit | null => {
  if (!hits.length) return null;
  const country = detectCountry(query);
  const foreignCountry = country && !country.isIsrael;
  const ranked = hits
    .map(h => {
      let score = h.score;
      if (foreignCountry && isInIsrael(h.lat, h.lon)) return { ...h, score: -10 };
      if (country) {
        score += inBox(h.lat, h.lon, country.box) ? 0.45 : -0.7;
        const labelL = h.label.toLowerCase();
        if (country.names.some(n => labelL.includes(n.toLowerCase()))) score += 0.25;
      }
      if (isStreetLike(h.label, h.osmClass, h.osmType)) score -= 0.85;
      if (isSettlementLike(h.osmClass, h.osmType)) score += 0.35;
      return { ...h, score };
    })
    .filter(h => h.score > -5)
    .sort((a, b) => b.score - a.score);
  if (!ranked.length) return null;
  const best = ranked[0];
  if (tokens(query).length >= 2 && best.score < 0.25) return null;
  if (isInIsrael(best.lat, best.lon) && isMostlyLatin(query) && !/israel|palestine/i.test(query) && isStreetLike(best.label, best.osmClass, best.osmType)) return null;
  return best;
};

async function tryNominatim(query: string, preferHe: boolean): Promise<Hit[]> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=8&addressdetails=0`;
  const response = await fetchWithTimeout(url, {
    headers: {
      'User-Agent': 'GEDCOM-Map-Visualizer/2.2 (Genealogy Research; github.com/baobabprince)',
      Accept: 'application/json',
      'Accept-Language': preferHe ? 'he,en' : 'en,de,fr,pl,ru,he',
    },
  }, 4500);
  if (!response.ok) return [];
  const data = await response.json();
  if (!Array.isArray(data)) return [];
  const hits: Hit[] = [];
  for (const row of data) {
    const lat = parseFloat(row.lat);
    const lon = parseFloat(row.lon);
    if (isNaN(lat) || isNaN(lon)) continue;
    const label = String(row.display_name || query);
    hits.push({ lat, lon, label, score: scoreMatch(query, label), osmClass: row.class, osmType: row.type });
  }
  return hits;
}

async function tryPhoton(query: string): Promise<Hit[]> {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=8`;
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
    hits.push({ lat, lon, label: label || query, score: scoreMatch(query, label || query), osmClass: props.osm_key, osmType: props.osm_value });
  }
  return hits;
}

async function tryOpenMeteo(query: string, preferHe: boolean): Promise<Hit[]> {
  const simple = query.split(',')[0].trim();
  if (simple.length < 2) return [];
  const lang = preferHe ? 'he' : 'en';
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(simple)}&count=8&language=${lang}&format=json`;
  const res = await fetchWithTimeout(url, {}, 3500);
  if (!res.ok) return [];
  const data = await res.json();
  const hits: Hit[] = [];
  for (const row of data?.results || []) {
    const { latitude, longitude, name, country, admin1, feature_code } = row;
    if (typeof latitude !== 'number' || typeof longitude !== 'number') continue;
    const label = [name, admin1, country].filter(Boolean).join(', ');
    let score = scoreMatch(query, label) + 0.15;
    if (feature_code && String(feature_code).startsWith('PPL')) score += 0.1;
    hits.push({ lat: latitude, lon: longitude, label, score, osmClass: 'place', osmType: 'city' });
  }
  return hits;
}

export const geocodeSinglePlace = async (
  placeName: string
): Promise<{ name: string; lat: number; lon: number } | null> => {
  const trimmed = placeName.trim();
  if (!trimmed) return null;
  const forced = hardcodePlace(trimmed);
  if (forced) return { name: placeName, lat: forced.lat, lon: forced.lon };
  const known = findKnownLocation(trimmed);
  if (known) return { name: placeName, lat: known.lat, lon: known.lon };
  const candidates = getGeocodingCandidates(trimmed);
  const preferHe = hasHebrew(trimmed) && !isMostlyLatin(trimmed);
  const allHits: Hit[] = [];
  for (const query of candidates.slice(0, 4)) {
    try {
      const hits = await tryNominatim(query, preferHe);
      const boosted = hits.map(h => ({ ...h, score: h.score + (query === trimmed ? 0.12 : 0) }));
      allHits.push(...boosted);
      const best = rankHits(trimmed, boosted);
      if (best && best.score >= 0.4) {
        return { name: placeName, lat: Number(best.lat.toFixed(5)), lon: Number(best.lon.toFixed(5)) };
      }
    } catch { /* continue */ }
  }
  for (const query of candidates.slice(0, 3)) {
    try { allHits.push(...(await tryPhoton(query))); } catch { /* continue */ }
  }
  for (const query of candidates.slice(0, 3)) {
    try { allHits.push(...(await tryOpenMeteo(query, preferHe))); } catch { /* continue */ }
  }
  const best = rankHits(trimmed, allHits);
  if (!best) return null;
  return { name: placeName, lat: Number(best.lat.toFixed(5)), lon: Number(best.lon.toFixed(5)) };
};
