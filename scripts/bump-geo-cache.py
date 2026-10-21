#!/usr/bin/env python3
from pathlib import Path

def main():
    p = Path('services/geocodingService.ts')
    t = p.read_text()
    t2 = t.replace("const CACHE_KEY = 'gedcom_geocode_cache_v2';", "const CACHE_KEY = 'gedcom_geocode_cache_v3';")
    t2 = t2.replace('const CLIENT_CONCURRENCY = 6;', 'const CLIENT_CONCURRENCY = 2;')
    # also clear v2 when clearing
    if "gedcom_geocode_cache_v2" not in t2[t2.find('clearGeocodeCache'):t2.find('clearGeocodeCache')+400]:
        t2 = t2.replace(
            "localStorage.removeItem('gedcom_geocode_cache_v1');",
            "localStorage.removeItem('gedcom_geocode_cache_v1');\n    localStorage.removeItem('gedcom_geocode_cache_v2');",
        )
    if t2 == t:
        print('no change')
    else:
        p.write_text(t2)
        print('updated cache v3 + concurrency 2')

if __name__ == '__main__':
    main()
