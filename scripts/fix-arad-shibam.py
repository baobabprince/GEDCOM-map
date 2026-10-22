#!/usr/bin/env python3
"""Fix ambiguous place names: ערד→Israel Negev, שבאם→Yemen (not Eilat)."""
from pathlib import Path
import re

# Insert before the closing of KNOWN_LOCATIONS_DATABASE
EXTRA = r'''
  // Israel — ambiguous / missing cities (Hebrew + Latin)
  'ערד': { lat: 31.2589, lon: 35.2128 },
  'ערד, ישראל': { lat: 31.2589, lon: 35.2128 },
  'arad, israel': { lat: 31.2589, lon: 35.2128 },
  'arad israel': { lat: 31.2589, lon: 35.2128 },
  // Note: plain "arad" alone is ambiguous (Romania) — only force Israel when Hebrew or explicit
  'אילת': { lat: 29.5577, lon: 34.9519 },
  'אילת, ישראל': { lat: 29.5577, lon: 34.9519 },
  'eilat': { lat: 29.5577, lon: 34.9519 },
  'eilat, israel': { lat: 29.5577, lon: 34.9519 },
  'דימונה': { lat: 31.0694, lon: 35.0333 },
  'dimona': { lat: 31.0694, lon: 35.0333 },
  'dimona, israel': { lat: 31.0694, lon: 35.0333 },
  'באר שבע': { lat: 31.2529, lon: 34.7915 },
  'באר-שבע': { lat: 31.2529, lon: 34.7915 },
  'מצפה רמון': { lat: 30.6103, lon: 34.8019 },
  'מיתר': { lat: 31.3270, lon: 34.9430 },
  'ירוחם': { lat: 30.9878, lon: 34.9300 },
  'שדרות': { lat: 31.5250, lon: 34.5950 },
  'נתיבות': { lat: 31.4230, lon: 34.5890 },
  'אופקים': { lat: 31.3140, lon: 34.6200 },
  'קריית גת': { lat: 31.6100, lon: 34.7640 },
  'אשדוד': { lat: 31.8044, lon: 34.6553 },
  'אשקלון': { lat: 31.6688, lon: 34.5743 },
  'רמת גן': { lat: 32.0684, lon: 34.8248 },
  'פתח תקווה': { lat: 32.0840, lon: 34.8878 },
  'ראשון לציון': { lat: 31.9730, lon: 34.7925 },
  'נתניה': { lat: 32.3215, lon: 34.8532 },
  'חולון': { lat: 32.0158, lon: 34.7874 },
  'בני ברק': { lat: 32.0807, lon: 34.8338 },
  'ירושלים': { lat: 31.7683, lon: 35.2137 },
  'תל אביב': { lat: 32.0853, lon: 34.7818 },
  'תל-אביב': { lat: 32.0853, lon: 34.7818 },
  'חיפה': { lat: 32.7940, lon: 34.9896 },
  'צפת': { lat: 32.9646, lon: 35.4960 },
  'טבריה': { lat: 32.7922, lon: 35.5312 },
  'נצרת': { lat: 32.6996, lon: 35.3035 },
  'עכו': { lat: 32.9281, lon: 35.0820 },
  'נהריה': { lat: 33.0059, lon: 35.0941 },
  'חדרה': { lat: 32.4340, lon: 34.9196 },
  'כפר סבא': { lat: 32.1850, lon: 34.9077 },
  'הרצליה': { lat: 32.1624, lon: 34.8447 },
  'רעננה': { lat: 32.1848, lon: 34.8707 },
  'מודיעין': { lat: 31.8980, lon: 35.0100 },
  'בית שמש': { lat: 31.7510, lon: 34.9880 },
  'לוד': { lat: 31.9510, lon: 34.8880 },
  'רמלה': { lat: 31.9290, lon: 34.8660 },

  // Yemen — Shabam / Shibam (not Eilat!)
  'שבאם': { lat: 15.9269, lon: 48.6267 },
  'שיבאם': { lat: 15.9269, lon: 48.6267 },
  'שibam': { lat: 15.9269, lon: 48.6267 },
  'שבאם, תימן': { lat: 15.9269, lon: 48.6267 },
  'שיבאם, תימן': { lat: 15.9269, lon: 48.6267 },
  'shibam': { lat: 15.9269, lon: 48.6267 },
  'shabam': { lat: 15.9269, lon: 48.6267 },
  'shibam, yemen': { lat: 15.9269, lon: 48.6267 },
  'shabam, yemen': { lat: 15.9269, lon: 48.6267 },
  'shibam hadhramaut': { lat: 15.9269, lon: 48.6267 },
  'צנעא': { lat: 15.3694, lon: 44.1910 },
  'צנעא, תימן': { lat: 15.3694, lon: 44.1910 },
  'sanaa': { lat: 15.3694, lon: 44.1910 },
  "sana'a": { lat: 15.3694, lon: 44.1910 },
  'sanaa, yemen': { lat: 15.3694, lon: 44.1910 },
  'עדן': { lat: 12.7855, lon: 45.0187 },
  'עדן, תימן': { lat: 12.7855, lon: 45.0187 },
  'aden, yemen': { lat: 12.7855, lon: 45.0187 },
  'תימן': { lat: 15.5527, lon: 48.5164 },
  'yemen': { lat: 15.5527, lon: 48.5164 },
'''


def patch_known(path: Path) -> None:
    t = path.read_text()
    if "'שבאם'" in t and "'ערד'" in t:
        print('knownLocations already has fixes')
        return
    # Insert before closing `};` of KNOWN_LOCATIONS_DATABASE
    marker = "  'south africa': { lat: -30.5595, lon: 22.9375 },\n};"
    if marker not in t:
        # fallback: last entry before };
        m = re.search(r"(\n\};\n\n/\*\*\n \* Normalizes)", t)
        if not m:
            raise SystemExit('insert point not found')
        t = t[: m.start()] + ',\n' + EXTRA + t[m.start() :]
    else:
        t = t.replace(marker, "  'south africa': { lat: -30.5595, lon: 22.9375 },\n" + EXTRA + '\n};", 1)
    path.write_text(t)
    print('knownLocations updated')


def patch_nominatim(path: Path) -> None:
    t = path.read_text()
    if 'HEBREW_ISRAEL_CITIES' in t:
        print('nominatim already patched')
        return

    helper = r'''
/** Hebrew-only city names that must resolve in Israel (not European namesakes). */
const HEBREW_ISRAEL_CITIES: Record<string, { lat: number; lon: number }> = {
  'ערד': { lat: 31.2589, lon: 35.2128 },
  'אילת': { lat: 29.5577, lon: 34.9519 },
  'דימונה': { lat: 31.0694, lon: 35.0333 },
  'באר שבע': { lat: 31.2529, lon: 34.7915 },
  'ירושלים': { lat: 31.7683, lon: 35.2137 },
  'תל אביב': { lat: 32.0853, lon: 34.7818 },
  'חיפה': { lat: 32.7940, lon: 34.9896 },
};

/** Yemen places often misspelled / confused with Israeli south. */
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
  // exact Hebrew keys (preserve original case for Hebrew map lookup)
  const raw = placeName.trim();
  const heKey = raw.split(',')[0].trim();
  if (HEBREW_ISRAEL_CITIES[heKey]) return HEBREW_ISRAEL_CITIES[heKey];
  if (YEMEN_PLACES[heKey]) return YEMEN_PLACES[heKey];
  if (YEMEN_PLACES[n]) return YEMEN_PLACES[n];
  // Latin arad only when Israel is explicit
  if (/\barad\b/.test(n) && /israel|ישראל/.test(n)) return { lat: 31.2589, lon: 35.2128 };
  if (/\b(shibam|shabam)\b/.test(n)) return { lat: 15.9269, lon: 48.6267 };
  return null;
};

'''

    # inject after imports
    if "import { findKnownLocation }" in t:
        t = t.replace(
            "import { findKnownLocation } from './knownLocations.ts';\n",
            "import { findKnownLocation } from './knownLocations.ts';\n" + helper,
            1,
        )
    else:
        t = helper + t

    # at start of geocodeSinglePlace after trimmed check
    old = '''  const trimmed = placeName.trim();
  if (!trimmed) return null;

  const known = findKnownLocation(trimmed);
'''
    new = '''  const trimmed = placeName.trim();
  if (!trimmed) return null;

  const forced = hardcodeHebrewOrYemen(trimmed);
  if (forced) {
    return { name: placeName, lat: forced.lat, lon: forced.lon };
  }

  const known = findKnownLocation(trimmed);
'''
    if old not in t:
        raise SystemExit('geocodeSinglePlace anchor missing')
    t = t.replace(old, new, 1)

    # strengthen countryHint for Hebrew-only queries that are Israeli cities
    # already handled by hardcode

    path.write_text(t)
    print('nominatim patched')


def patch_cache(path: Path) -> None:
    t = path.read_text()
    if "gedcom_geocode_cache_v4" in t:
        print('cache already v4')
        return
    t = t.replace("gedcom_geocode_cache_v3", "gedcom_geocode_cache_v4")
    t = t.replace("gedcom_geocode_cache_v2", "gedcom_geocode_cache_v4")
    if "removeItem('gedcom_geocode_cache_v3')" not in t:
        t = t.replace(
            "localStorage.removeItem('gedcom_geocode_cache_v2');",
            "localStorage.removeItem('gedcom_geocode_cache_v2');\n    localStorage.removeItem('gedcom_geocode_cache_v3');",
        )
    path.write_text(t)
    print('cache -> v4')


def main():
    patch_known(Path('services/knownLocations.ts'))
    patch_nominatim(Path('services/nominatimService.ts'))
    patch_cache(Path('services/geocodingService.ts'))

if __name__ == '__main__':
    main()
