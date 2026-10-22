#!/usr/bin/env python3
"""Fix ambiguous place names: Arad (Israel), Shabam (Yemen)."""
from pathlib import Path
import re

EXTRA_LINES = [
    "  // Israel — Hebrew cities (avoid European namesakes)",
    "  'ערד': { lat: 31.2589, lon: 35.2128 },",
    "  'ערד, ישראל': { lat: 31.2589, lon: 35.2128 },",
    "  'arad, israel': { lat: 31.2589, lon: 35.2128 },",
    "  'אילת': { lat: 29.5577, lon: 34.9519 },",
    "  'אילת, ישראל': { lat: 29.5577, lon: 34.9519 },",
    "  'eilat': { lat: 29.5577, lon: 34.9519 },",
    "  'eilat, israel': { lat: 29.5577, lon: 34.9519 },",
    "  'דימונה': { lat: 31.0694, lon: 35.0333 },",
    "  'dimona': { lat: 31.0694, lon: 35.0333 },",
    "  'באר שבע': { lat: 31.2529, lon: 34.7915 },",
    "  'באר-שבע': { lat: 31.2529, lon: 34.7915 },",
    "  'מצפה רמון': { lat: 30.6103, lon: 34.8019 },",
    "  'ירושלים': { lat: 31.7683, lon: 35.2137 },",
    "  'תל אביב': { lat: 32.0853, lon: 34.7818 },",
    "  'תל-אביב': { lat: 32.0853, lon: 34.7818 },",
    "  'חיפה': { lat: 32.7940, lon: 34.9896 },",
    "  'צפת': { lat: 32.9646, lon: 35.4960 },",
    "  'טבריה': { lat: 32.7922, lon: 35.5312 },",
    "  'רמת גן': { lat: 32.0684, lon: 34.8248 },",
    "  'פתח תקווה': { lat: 32.0840, lon: 34.8878 },",
    "  'ראשון לציון': { lat: 31.9730, lon: 34.7925 },",
    "  'נתניה': { lat: 32.3215, lon: 34.8532 },",
    "  'חולון': { lat: 32.0158, lon: 34.7874 },",
    "  'אשדוד': { lat: 31.8044, lon: 34.6553 },",
    "  'אשקלון': { lat: 31.6688, lon: 34.5743 },",
    "  // Yemen — Shabam/Shibam (must not map to Eilat)",
    "  'שבאם': { lat: 15.9269, lon: 48.6267 },",
    "  'שיבאם': { lat: 15.9269, lon: 48.6267 },",
    "  'שibam': { lat: 15.9269, lon: 48.6267 },",
    "  'שבאם, תימן': { lat: 15.9269, lon: 48.6267 },",
    "  'שיבאם, תימן': { lat: 15.9269, lon: 48.6267 },",
    "  'shibam': { lat: 15.9269, lon: 48.6267 },",
    "  'shabam': { lat: 15.9269, lon: 48.6267 },",
    "  'shibam, yemen': { lat: 15.9269, lon: 48.6267 },",
    "  'shabam, yemen': { lat: 15.9269, lon: 48.6267 },",
    "  'צנעא': { lat: 15.3694, lon: 44.1910 },",
    "  'צנעא, תימן': { lat: 15.3694, lon: 44.1910 },",
    "  'sanaa': { lat: 15.3694, lon: 44.1910 },",
    "  'sanaa, yemen': { lat: 15.3694, lon: 44.1910 },",
    "  'עדן': { lat: 12.7855, lon: 45.0187 },",
    "  'עדן, תימן': { lat: 12.7855, lon: 45.0187 },",
    "  'aden, yemen': { lat: 12.7855, lon: 45.0187 },",
    "  'תימן': { lat: 15.5527, lon: 48.5164 },",
    "  'yemen': { lat: 15.5527, lon: 48.5164 },",
]


def patch_known(path: Path) -> None:
    t = path.read_text()
    if "'שבאם'" in t and "'ערד'" in t:
        print('knownLocations already has fixes')
        return
    extra = "\n".join(EXTRA_LINES) + "\n"
    m = re.search(r"\n\};\n\n/\*\*\n \* Normalizes a place name", t)
    if m:
        t = t[: m.start()] + ",\n" + extra + t[m.start() :]
    else:
        m2 = re.search(r"\n\};\s*\n\s*/\*\*", t)
        if not m2:
            raise SystemExit('insert point not found in knownLocations')
        t = t[: m2.start()] + ",\n" + extra + t[m2.start() :]
    path.write_text(t)
    print('knownLocations updated')


def patch_nominatim(path: Path) -> None:
    t = path.read_text()
    if 'HEBREW_ISRAEL_CITIES' in t:
        print('nominatim already patched')
        return

    helper_lines = [
        "",
        "/** Hebrew city names that must resolve in Israel (not European namesakes). */",
        "const HEBREW_ISRAEL_CITIES: Record<string, { lat: number; lon: number }> = {",
        "  'ערד': { lat: 31.2589, lon: 35.2128 },",
        "  'אילת': { lat: 29.5577, lon: 34.9519 },",
        "  'דימונה': { lat: 31.0694, lon: 35.0333 },",
        "  'באר שבע': { lat: 31.2529, lon: 34.7915 },",
        "  'ירושלים': { lat: 31.7683, lon: 35.2137 },",
        "  'תל אביב': { lat: 32.0853, lon: 34.7818 },",
        "  'חיפה': { lat: 32.7940, lon: 34.9896 },",
        "};",
        "",
        "/** Yemen places — do not confuse with southern Israel. */",
        "const YEMEN_PLACES: Record<string, { lat: number; lon: number }> = {",
        "  'שבאם': { lat: 15.9269, lon: 48.6267 },",
        "  'שיבאם': { lat: 15.9269, lon: 48.6267 },",
        "  'שibam': { lat: 15.9269, lon: 48.6267 },",
        "  'צנעא': { lat: 15.3694, lon: 44.1910 },",
        "  'עדן': { lat: 12.7855, lon: 45.0187 },",
        "  shibam: { lat: 15.9269, lon: 48.6267 },",
        "  shabam: { lat: 15.9269, lon: 48.6267 },",
        "};",
        "",
        "const hardcodeHebrewOrYemen = (placeName: string): { lat: number; lon: number } | null => {",
        "  const n = placeName.trim().toLowerCase().replace(/[\"'״׳]/g, '');",
        "  const heKey = placeName.trim().split(',')[0].trim();",
        "  if (HEBREW_ISRAEL_CITIES[heKey]) return HEBREW_ISRAEL_CITIES[heKey];",
        "  if (YEMEN_PLACES[heKey]) return YEMEN_PLACES[heKey];",
        "  if (YEMEN_PLACES[n]) return YEMEN_PLACES[n];",
        "  if (/\\barad\\b/.test(n) && /israel|ישראל/.test(n)) return { lat: 31.2589, lon: 35.2128 };",
        "  if (/\\b(shibam|shabam)\\b/.test(n)) return { lat: 15.9269, lon: 48.6267 };",
        "  return null;",
        "};",
        "",
    ]
    helper = "\n".join(helper_lines)

    import_line = "import { findKnownLocation } from './knownLocations.ts';\n"
    if import_line in t:
        t = t.replace(import_line, import_line + helper, 1)
    else:
        t = helper + t

    old = (
        "  const trimmed = placeName.trim();\n"
        "  if (!trimmed) return null;\n"
        "\n"
        "  const known = findKnownLocation(trimmed);\n"
    )
    new = (
        "  const trimmed = placeName.trim();\n"
        "  if (!trimmed) return null;\n"
        "\n"
        "  const forced = hardcodeHebrewOrYemen(trimmed);\n"
        "  if (forced) {\n"
        "    return { name: placeName, lat: forced.lat, lon: forced.lon };\n"
        "  }\n"
        "\n"
        "  const known = findKnownLocation(trimmed);\n"
    )
    if old not in t:
        raise SystemExit('geocodeSinglePlace anchor missing')
    t = t.replace(old, new, 1)
    path.write_text(t)
    print('nominatim patched')


def patch_cache(path: Path) -> None:
    t = path.read_text()
    if 'gedcom_geocode_cache_v4' in t:
        print('cache already v4')
        return
    t = t.replace('gedcom_geocode_cache_v3', 'gedcom_geocode_cache_v4')
    t = t.replace(
        "localStorage.removeItem('gedcom_geocode_cache_v2');",
        "localStorage.removeItem('gedcom_geocode_cache_v2');\n    localStorage.removeItem('gedcom_geocode_cache_v3');",
    )
    path.write_text(t)
    print('cache -> v4')


def main() -> None:
    patch_known(Path('services/knownLocations.ts'))
    patch_nominatim(Path('services/nominatimService.ts'))
    patch_cache(Path('services/geocodingService.ts'))


if __name__ == '__main__':
    main()
