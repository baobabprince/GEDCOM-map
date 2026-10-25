#!/usr/bin/env python3
"""Apply Photon-skip + dictionary expansion on GEDCOM-map main."""
from pathlib import Path
import re

p = Path('services/nominatimService.ts')
text = p.read_text()

extra_he = """  'רמלה': { lat: 31.9292, lon: 34.8667 },
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
"""

if "'רמלה'" not in text:
    m = re.search(r"(const HEBREW_ISRAEL_CITIES: Record<string, \{ lat: number; lon: number \}> = \{[\s\S]*?)(\n\};)", text)
    if not m:
        raise SystemExit('HEBREW block missing')
    text = text[:m.start()] + m.group(1) + extra_he + m.group(2) + text[m.end():]
    print('HEBREW expanded')
else:
    print('HEBREW ok')

extra_forced = """
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
"""

if "'בגדד'" not in text:
    m = re.search(r"(const FORCED_CITIES: Record<string, \{ lat: number; lon: number \}> = \{[\s\S]*?)(\n\};)", text)
    if not m:
        raise SystemExit('FORCED missing')
    text = text[:m.start()] + m.group(1).rstrip() + ',\n' + extra_forced + m.group(2) + text[m.end():]
    print('FORCED expanded')
else:
    print('FORCED ok')

if 'skipPhoton' not in text:
    start = text.find('  const candidates = getGeocodingCandidates(trimmed);')
    end = text.find('  const best = rankHits(trimmed, allHits);', start)
    if start < 0 or end < 0:
        raise SystemExit('flow markers missing')
    new_flow = """  const candidates = getGeocodingCandidates(trimmed);
  const preferHe = hasHebrew(trimmed) && !isMostlyLatin(trimmed);
  const allHits: Hit[] = [];
  // On GitHub Pages both Nominatim and Photon block browser CORS (or time out).
  const staticHost = isStaticHost();
  const skipNominatim = staticHost;
  const skipPhoton = staticHost;

  if (!skipPhoton) {
    for (const query of candidates.slice(0, 3)) {
      try {
        const hits = await tryPhoton(query);
        const boosted = hits.map(h => ({ ...h, score: h.score + (query === trimmed ? 0.12 : 0) }));
        allHits.push(...boosted);
        const best = rankHits(trimmed, boosted);
        if (best && best.score >= 0.45) {
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
        if (best && best.score >= 0.35) {
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
        if (best && best.score >= 0.4) {
          return { name: placeName, lat: Number(best.lat.toFixed(5)), lon: Number(best.lon.toFixed(5)) };
        }
      } catch { /* continue */ }
    }
  }

"""
    text = text[:start] + new_flow + text[end:]
    print('flow updated')
else:
    print('flow ok')

text = text.replace('},,', '},')
p.write_text(text)
print('nominatim written', len(text))

p = Path('services/knownLocations.ts')
text = p.read_text()
extra = """
  'בגדד': { lat: 33.3152, lon: 44.3661 },
  'בגדאד': { lat: 33.3152, lon: 44.3661 },
  'בגדד, עיראק': { lat: 33.3152, lon: 44.3661 },
  'רמלה': { lat: 31.9292, lon: 34.8667 },
  'כפר סבא': { lat: 32.1858, lon: 34.9077 },
  'נתניה': { lat: 32.3215, lon: 34.8532 },
  'טריפולי': { lat: 32.8872, lon: 13.1913 },
  'רומניה': { lat: 45.9432, lon: 24.9668 },
  'אושוויץ': { lat: 50.0359, lon: 19.1783 },
  'תטואן': { lat: 35.5889, lon: -5.3626 },
  'וטרה דורנה': { lat: 47.3480, lon: 25.3670 },
  'קבוצת יבנה': { lat: 31.8170, lon: 34.7210 },
  'יבנה': { lat: 31.8770, lon: 34.7398 },
  'קרית שמואל': { lat: 32.8380, lon: 35.0690 },
  'מעלה לבונה': { lat: 32.0530, lon: 35.2410 },
  'נוה צוף': { lat: 31.9860, lon: 35.1480 },
  'טלמון': { lat: 31.9790, lon: 35.1350 },
  'הושעיה': { lat: 32.7590, lon: 35.3200 },
  'ראש צורים': { lat: 31.6680, lon: 35.1230 },
  'מצפה נטופה': { lat: 32.8220, lon: 35.3830 },
  'קלם': { lat: 55.6300, lon: 22.9340 },
  'קוניאו': { lat: 44.3900, lon: 7.5470 },
  'ויזניץ': { lat: 48.2480, lon: 25.1950 },
"""
if "'בגדד'" not in text:
    idx = text.find('export const normalizePlaceKey')
    close = text.rfind('\n};', 0, idx)
    text = text[:close] + ',\n' + extra + text[close:]
    print('knownLocations expanded')
else:
    print('knownLocations ok')
text = text.replace('},,', '},')
p.write_text(text)
print('done')
