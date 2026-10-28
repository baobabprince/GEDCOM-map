import { findKnownLocation } from './knownLocations.ts';
import { isStaticHost } from './geminiService.ts';

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
  'רעות': { lat: 31.9103, lon: 35.0097 },
  'מודיעין': { lat: 31.9077, lon: 35.0076 },
  'מודיעין מכבים רעות': { lat: 31.9077, lon: 35.0076 },
  'בית שמש': { lat: 31.7514, lon: 34.9886 },
  'ירוחם': { lat: 30.9878, lon: 34.9303 },
  'יצהר': { lat: 32.1681, lon: 35.2361 },
  'קבוץ לביא': { lat: 32.7858, lon: 35.4417 },
  'לביא': { lat: 32.7858, lon: 35.4417 },
  'אלעזר': { lat: 31.6603, lon: 35.1422 },
  'חאן יונס': { lat: 31.3462, lon: 34.3029 },
  'הרצליה': { lat: 32.1624, lon: 34.8447 },  'רמלה': { lat: 31.9292, lon: 34.8667 },
  'כפר סבא': { lat: 32.1858, lon: 34.9077 },
  'נתניה': { lat: 32.3215, lon: 34.8532 },
  'יבנה': { lat: 31.8770, lon: 34.7398 },
  'קבוצת יבנה': { lat: 31.8170, lon: 34.7210 },
  'קרית שמואל': { lat: 32.8380, lon: 35.0690 },
  'קריית שמואל': { lat: 32.8380, lon: 35.0690 },
  'מעלה לבונה': { lat: 32.0530, lon: 35.2410 },
  'נוה צוף': { lat: 31.9860, lon: 35.1480 },
  'נווה צוף': { lat: 31.9860, lon: 35.1480 },
  'טלמון': { lat: 31.9790, lon: 35.1350 },
  'הושעיה': { lat: 32.7590, lon: 35.3200 },
  'ראש צורים': { lat: 31.6680, lon: 35.1230 },
  'מצפה נטופה': { lat: 32.8220, lon: 35.3830 },
  'אשדוד': { lat: 31.8044, lon: 34.6553 },
  'אשקלון': { lat: 31.6688, lon: 34.5743 },
  'חולון': { lat: 32.0158, lon: 34.7874 },
  'בת ים': { lat: 32.0231, lon: 34.7506 },
  'צפת': { lat: 32.9646, lon: 35.4960 },
  'טבריה': { lat: 32.7922, lon: 35.5312 },
  'עכו': { lat: 32.9269, lon: 35.0818 },
  'נהריה': { lat: 33.0059, lon: 35.0941 },
  'כרמיאל': { lat: 32.9200, lon: 35.2950 },
  'אריאל': { lat: 32.1060, lon: 35.1850 },
  'מעלה אדומים': { lat: 31.7770, lon: 35.2980 },

};

/** Yemen places — do not confuse with southern Israel. */
const YEMEN_PLACES: Record<string, { lat: number; lon: number }> = {
  'שבאם': { lat: 15.9269, lon: 48.6267 },
  'שיבאם': { lat: 15.9269, lon: 48.6267 },
  'שיבם': { lat: 15.9269, lon: 48.6267 },
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
  hamburg: { lat: 53.5511, lon: 9.9937 },
  'המבורג': { lat: 53.5511, lon: 9.9937 },
  'המבורג, גרמניה': { lat: 53.5511, lon: 9.9937 },
  'טרנוב': { lat: 50.0121, lon: 20.9858 },
  tarnow: { lat: 50.0121, lon: 20.9858 },
  'tarnów': { lat: 50.0121, lon: 20.9858 },
  'צרפת': { lat: 46.6034, lon: 1.8883 },
  france: { lat: 46.6034, lon: 1.8883 },
  'ארצות הברית': { lat: 39.8283, lon: -98.5795 },
  'united states': { lat: 39.8283, lon: -98.5795 },
  'רעיות': { lat: 31.9103, lon: 35.0097 },
  'בלז׳': { lat: 50.3819, lon: 24.0106 },
  'בלז': { lat: 50.3819, lon: 24.0106 },
  belz: { lat: 50.3819, lon: 24.0106 },
  'קדומים': { lat: 32.2131, lon: 35.1578 },
  'נתניה': { lat: 32.3215, lon: 34.8532 },
  'מילנו': { lat: 45.4642, lon: 9.1900 },
  milan: { lat: 45.4642, lon: 9.1900 },
  'טריאסטה': { lat: 45.6495, lon: 13.7768 },
  trieste: { lat: 45.6495, lon: 13.7768 },
  'ונציה': { lat: 45.4408, lon: 12.3155 },
  venice: { lat: 45.4408, lon: 12.3155 },
  'ruda zazamcze': { lat: 50.0667, lon: 22.0167 },

  auschwitz: { lat: 50.0359, lon: 19.1783 },
  'auschwitz, poland': { lat: 50.0359, lon: 19.1783 },
  'אושוויץ': { lat: 50.0359, lon: 19.1783 },
  oswiecim: { lat: 50.0359, lon: 19.1783 },
  chrzanow: { lat: 50.1414, lon: 19.4020 },
  trzebinia: { lat: 50.1590, lon: 19.4690 },
  sanok: { lat: 49.5550, lon: 22.2050 },
  wiznitz: { lat: 48.2480, lon: 25.1950 },
  'ויזניץ': { lat: 48.2480, lon: 25.1950 },
  'vatra dornei': { lat: 47.3480, lon: 25.3670 },
  'וטרה דורנה': { lat: 47.3480, lon: 25.3670 },
  'dorna watra': { lat: 47.3480, lon: 25.3670 },
  cuneo: { lat: 44.3900, lon: 7.5470 },
  'קוניאו': { lat: 44.3900, lon: 7.5470 },
  tetouan: { lat: 35.5889, lon: -5.3626 },
  'תטואן': { lat: 35.5889, lon: -5.3626 },
  baghdad: { lat: 33.3152, lon: 44.3661 },
  'בגדד': { lat: 33.3152, lon: 44.3661 },
  'בגדאד': { lat: 33.3152, lon: 44.3661 },
  tripoli: { lat: 32.8872, lon: 13.1913 },
  'טריפולי': { lat: 32.8872, lon: 13.1913 },
  romania: { lat: 45.9432, lon: 24.9668 },
  'רומניה': { lat: 45.9432, lon: 24.9668 },
  kelme: { lat: 55.6300, lon: 22.9340 },
  'קלם': { lat: 55.6300, lon: 22.9340 },

};

const hardcodePlace = (placeName: string): { lat: number; lon: number } | null => {
  const n = placeName.trim().toLowerCase().replace(/[\"'\u05f4\u05f3\u05f3]/g, "'");
  const heKey = placeName.trim().split(',')[0].trim();
  if (HEBREW_ISRAEL_CITIES[heKey]) return HEBREW_ISRAEL_CITIES[heKey];
  if (YEMEN_PLACES[heKey]) return YEMEN_PLACES[heKey];
  if (YEMEN_PLACES[n]) return YEMEN_PLACES[n];
  if (FORCED_CITIES[n]) return FORCED_CITIES[n];
  if (FORCED_CITIES[heKey]) return FORCED_CITIES[heKey];
  const n2 = n.replace(/['\u05f3]/g, "'");
  if (FORCED_CITIES[n2]) return FORCED_CITIES[n2];
  if (/\barad\b/.test(n) && /israel|\u05d9\u05e9\u05e8\u05d0\u05dc/.test(n)) return { lat: 31.2589, lon: 35.2128 };
  if (/\b(shibam|shabam)\b/.test(n)) return { lat: 15.9269, lon: 48.6267 };
  if (/\bburgas\b/.test(n)) return { lat: 42.5048, lon: 27.4626 };
  if (/chernivtsi|czernowitz|cernauti|\u05e6\u05e8\u05e0\u05d5\u05d1\u05d9\u05e5|\u05e6.?\u05e8\u05e0\u05d5\u05d1\u05d9\u05e5/.test(n)) return { lat: 48.2921, lon: 25.9358 };
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
    .replace(/[\"'\u05f4\u05f3()\[\]]/g, ' ')
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
  { re: /\u05d9\u05e9\u05e8\u05d0\u05dc|\bisrael\b|palestine|\u05e4\u05dc\u05e1\u05d8\u05d9\u05df/, box: ISRAEL_BBOX, names: ['israel', '\u05d9\u05e9\u05e8\u05d0\u05dc'] },
  { re: /poland|\u05e4\u05d5\u05dc\u05d9\u05df|galicia|\u05d2\u05dc\u05d9\u05e6\u05d9\u05d4/, box: { minLat: 49, maxLat: 55, minLon: 14, maxLon: 25 }, names: ['poland', '\u05e4\u05d5\u05dc\u05d9\u05df'] },
  { re: /ukraine|\u05d0\u05d5\u05e7\u05e8\u05d0\u05d9\u05e0\u05d4|\bkiev\b|\bkyiv\b/, box: { minLat: 44, maxLat: 53, minLon: 22, maxLon: 41 }, names: ['ukraine', '\u05d0\u05d5\u05e7\u05e8\u05d0\u05d9\u05e0\u05d4'] },
  { re: /russia|\u05e8\u05d5\u05e1\u05d9\u05d4|moscow|\u05de\u05d5\u05e1\u05e7\u05d1\u05d4/, box: { minLat: 41, maxLat: 72, minLon: 27, maxLon: 180 }, names: ['russia', '\u05e8\u05d5\u05e1\u05d9\u05d4'] },
  { re: /germany|\u05d2\u05e8\u05de\u05e0\u05d9\u05d4|deutschland/, box: { minLat: 47, maxLat: 55.2, minLon: 5.8, maxLon: 15.1 }, names: ['germany', '\u05d2\u05e8\u05de\u05e0\u05d9\u05d4'] },
  { re: /england|britain|\buk\b|united kingdom|\u05d0\u05e0\u05d2\u05dc\u05d9\u05d4|\u05d1\u05e8\u05d9\u05d8\u05e0\u05d9\u05d4|scotland|wales/, box: { minLat: 49.8, maxLat: 61, minLon: -8.7, maxLon: 2 }, names: ['united kingdom', 'england'] },
  { re: /\busa\b|united states|\bamerica\b|\u05d0\u05e8\u05e6\u05d5\u05ea \u05d4\u05d1\u05e8\u05d9\u05ea/, box: { minLat: 24, maxLat: 50, minLon: -125, maxLon: -66 }, names: ['united states', 'usa'] },
  { re: /france|\u05e6\u05e8\u05e4\u05ea/, box: { minLat: 41, maxLat: 51.5, minLon: -5.5, maxLon: 10 }, names: ['france', '\u05e6\u05e8\u05e4\u05ea'] },
  { re: /morocco|\u05de\u05e8\u05d5\u05e7\u05d5/, box: { minLat: 27, maxLat: 36, minLon: -13.5, maxLon: -0.5 }, names: ['morocco', '\u05de\u05e8\u05d5\u05e7\u05d5'] },
  { re: /iraq|\u05e2\u05d9\u05e8\u05d0\u05e7/, box: { minLat: 29, maxLat: 38, minLon: 38, maxLon: 49 }, names: ['iraq', '\u05e2\u05d9\u05e8\u05d0\u05e7'] },
  { re: /yemen|\u05ea\u05d9\u05de\u05df/, box: { minLat: 12, maxLat: 19, minLon: 42, maxLon: 55 }, names: ['yemen', '\u05ea\u05d9\u05de\u05df'] },
  { re: /egypt|\u05de\u05e6\u05e8\u05d9\u05dd/, box: { minLat: 22, maxLat: 32, minLon: 24, maxLon: 37 }, names: ['egypt', '\u05de\u05e6\u05e8\u05d9\u05dd'] },
  { re: /bulgaria|\u05d1\u05d5\u05dc\u05d2\u05e8\u05d9\u05d4|\bburgas\b|\u05d1\u05d5\u05e8\u05d2\u05e1/, box: { minLat: 41.2, maxLat: 44.3, minLon: 22.3, maxLon: 28.7 }, names: ['bulgaria', '\u05d1\u05d5\u05dc\u05d2\u05e8\u05d9\u05d4'] },
  { re: /romania|\u05e8\u05d5\u05de\u05e0\u05d9\u05d4|bukovina|\u05d1\u05d5\u05e7\u05d5\u05d1\u05d9\u05e0\u05d4|czernowitz|chernivtsi|cernauti|\u05e6\u05e8\u05e0\u05d5\u05d1\u05d9\u05e5|\u05e6.?\u05e8\u05e0\u05d5\u05d1\u05d9\u05e5/, box: { minLat: 43.5, maxLat: 48.5, minLon: 20, maxLon: 30 }, names: ['romania', '\u05e8\u05d5\u05de\u05e0\u05d9\u05d4', 'ukraine'] },
  { re: /hungary|\u05d4\u05d5\u05e0\u05d2\u05e8\u05d9\u05d4/, box: { minLat: 45.7, maxLat: 48.6, minLon: 16, maxLon: 23 }, names: ['hungary', '\u05d4\u05d5\u05e0\u05d2\u05e8\u05d9\u05d4'] },
  { re: /austria|\u05d0\u05d5\u05e1\u05d8\u05e8\u05d9\u05d4|vienna|\u05d5\u05d5\u05d9\u05e0\u05d4|\u05d5\u05d9\u05e0\u05d4/, box: { minLat: 46.3, maxLat: 49.1, minLon: 9.4, maxLon: 17.2 }, names: ['austria', '\u05d0\u05d5\u05e1\u05d8\u05e8\u05d9\u05d4'] },
  { re: /lithuania|\u05dc\u05d9\u05d8\u05d0|vilna|vilnius/, box: { minLat: 53.8, maxLat: 56.5, minLon: 20.9, maxLon: 26.9 }, names: ['lithuania', '\u05dc\u05d9\u05d8\u05d0'] },
  { re: /latvia|\u05dc\u05d8\u05d1\u05d9\u05d4|\briga\b/, box: { minLat: 55.6, maxLat: 58.1, minLon: 20.9, maxLon: 28.3 }, names: ['latvia', '\u05dc\u05d8\u05d1\u05d9\u05d4'] },
  { re: /belarus|\u05d1\u05dc\u05d0\u05e8\u05d5\u05e1|white russia|minsk/, box: { minLat: 51.2, maxLat: 56.2, minLon: 23.1, maxLon: 32.8 }, names: ['belarus', '\u05d1\u05dc\u05d0\u05e8\u05d5\u05e1'] },
  { re: /moldova|\u05de\u05d5\u05dc\u05d3\u05d5\u05d1\u05d4|kishinev|chisinau/, box: { minLat: 45.4, maxLat: 48.5, minLon: 26.6, maxLon: 30.2 }, names: ['moldova', '\u05de\u05d5\u05dc\u05d3\u05d5\u05d1\u05d4'] },
  { re: /greece|\u05d9\u05d5\u05d5\u05df|salonica|thessaloniki/, box: { minLat: 34.8, maxLat: 41.8, minLon: 19.3, maxLon: 29.7 }, names: ['greece', '\u05d9\u05d5\u05d5\u05df'] },
  { re: /turkey|\u05d8\u05d5\u05e8\u05e7\u05d9\u05d4|ottoman|istanbul/, box: { minLat: 35.8, maxLat: 42.3, minLon: 25.6, maxLon: 45 }, names: ['turkey', '\u05d8\u05d5\u05e8\u05e7\u05d9\u05d4'] },
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
  if (/(\u05e8\u05d7\u05d5\u05d1|\u05e9\u05d3\u05e8\u05d5\u05ea|\u05e1\u05de\u05d8\u05d4|\u05db\u05d9\u05db\u05e8|\u05d3\u05e8\u05da)\s/.test(label) || /^(\u05e8\u05d7\u05d5\u05d1|\u05e9\u05d3\u05e8\u05d5\u05ea|\u05db\u05d9\u05db\u05e8|\u05d3\u05e8\u05da)\b/.test(label)) return true;
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
  const withoutPrefix = trimmed.replace(/^(near|at|near to|church of|cemetery in|\u05d1\u05d9\u05ea \u05e2\u05dc\u05de\u05d9\u05df|\u05d1\u05d9\u05ea \u05e7\u05d1\u05e8\u05d5\u05ea|\u05d1\u05d9\u05ea \u05db\u05e0\u05e1\u05ea)\s+/i, '').trim();
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
  const queryHasHebrew = hasHebrew(query);
  // Broader Israel area (includes Golan Heights + Judea & Samaria). Used to avoid
  // punishing legitimate Israeli / territories results, especially for Hebrew queries.
  const inIsraelArea = (lat: number, lon: number) => isInIsrael(lat, lon);

  const ranked = hits
    .map(h => {
      let score = h.score;
      const hitInIsraelArea = inIsraelArea(h.lat, h.lon);

      // Soften former hard reject: only mildly penalize Israel-area hits when the
      // query is clearly a different country AND the query is not Hebrew.
      // Golan / Judea & Samaria must not be rejected.
      if (foreignCountry && hitInIsraelArea && !queryHasHebrew) {
        score -= 1.2;
      }

      if (country) {
        // Milder in/out-of-box scoring
        score += inBox(h.lat, h.lon, country.box) ? 0.4 : -0.35;
        const labelL = h.label.toLowerCase();
        if (country.names.some(n => labelL.includes(n.toLowerCase()))) score += 0.25;
      } else if (queryHasHebrew && hitInIsraelArea) {
        // Hebrew query with no explicit foreign country → prefer Israel-area results
        score += 0.35;
      }

      // Softened street penalty (was -0.85)
      if (isStreetLike(h.label, h.osmClass, h.osmType)) score -= 0.45;
      if (isSettlementLike(h.osmClass, h.osmType)) score += 0.4;
      return { ...h, score };
    })
    .filter(h => h.score > -4)
    .sort((a, b) => b.score - a.score);
  if (!ranked.length) return null;
  const best = ranked[0];
  // Softened rejection threshold (was 0.25)
  if (tokens(query).length >= 2 && best.score < 0.12) return null;
  // Keep street filter only for clearly foreign Latin queries landing on Israeli streets
  if (
    isInIsrael(best.lat, best.lon) &&
    isMostlyLatin(query) &&
    !queryHasHebrew &&
    !/israel|palestine|judea|samaria|golan|\u05d9\u05e9\u05e8\u05d0\u05dc|\u05e4\u05dc\u05e1\u05d8\u05d9\u05df/i.test(query) &&
    isStreetLike(best.label, best.osmClass, best.osmType)
  ) {
    return null;
  }
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
    const p = f.properties || {};
    const label = [p.name, p.city, p.state, p.country].filter(Boolean).join(', ') || query;
    hits.push({
      lat,
      lon,
      label,
      score: scoreMatch(query, label),
      osmClass: p.osm_key,
      osmType: p.osm_value,
    });
  }
  return hits;
}

async function tryOpenMeteo(query: string, preferHe: boolean): Promise<Hit[]> {
  const lang = preferHe ? 'he' : 'en';
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=8&language=${lang}&format=json`;
  const res = await fetchWithTimeout(url, { headers: { Accept: 'application/json' } }, 3500);
  if (!res.ok) return [];
  const data = await res.json();
  const hits: Hit[] = [];
  for (const r of data?.results || []) {
    const latitude = r.latitude;
    const longitude = r.longitude;
    if (typeof latitude !== 'number' || typeof longitude !== 'number') continue;
    const label = [r.name, r.admin1, r.country].filter(Boolean).join(', ');
    let score = scoreMatch(query, label);
    if (r.feature_code && /PPL|PPLA|PPLC/.test(r.feature_code)) score += 0.1;
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
  // On GitHub Pages Nominatim usually blocks browser CORS.
  // Photon (komoot) allows CORS (*) and works well for Hebrew place names — keep it enabled.
  const staticHost = isStaticHost();
  const skipNominatim = staticHost;
  const skipPhoton = false;

  if (!skipPhoton) {
    for (const query of candidates.slice(0, 3)) {
      try {
        const hits = await tryPhoton(query);
        const boosted = hits.map(h => ({ ...h, score: h.score + (query === trimmed ? 0.12 : 0) }));
        allHits.push(...boosted);
        const best = rankHits(trimmed, boosted);
        if (best && best.score >= 0.32) {
          return { name: placeName, lat: Number(best.lat.toFixed(5)), lon: Number(best.lon.toFixed(5)) };
        }
      } catch { /* continue */ }
    }
  }

  for (const query of candidates.slice(0, 4)) {
    for (const he of preferHe ? [true, false] : [false, true]) {
      try {
        const hits = await tryOpenMeteo(query, he);
        const boosted = hits.map(h => ({ ...h, score: h.score + (query === trimmed ? 0.1 : 0) }));
        allHits.push(...boosted);
        const best = rankHits(trimmed, boosted);
        if (best && best.score >= 0.25) {
          return { name: placeName, lat: Number(best.lat.toFixed(5)), lon: Number(best.lon.toFixed(5)) };
        }
      } catch { /* continue */ }
    }
  }

  if (!skipNominatim) {
    for (const query of candidates.slice(0, 2)) {
      try {
        const hits = await tryNominatim(query, preferHe);
        const boosted = hits.map(h => ({ ...h, score: h.score + (query === trimmed ? 0.12 : 0) }));
        allHits.push(...boosted);
        const best = rankHits(trimmed, boosted);
        if (best && best.score >= 0.28) {
          return { name: placeName, lat: Number(best.lat.toFixed(5)), lon: Number(best.lon.toFixed(5)) };
        }
      } catch { /* continue */ }
    }
  }

  const best = rankHits(trimmed, allHits);
  if (!best) return null;
  return { name: placeName, lat: Number(best.lat.toFixed(5)), lon: Number(best.lon.toFixed(5)) };
};
