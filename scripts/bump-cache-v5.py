#!/usr/bin/env python3
from pathlib import Path

def main():
    p = Path('services/geocodingService.ts')
    t = p.read_text()
    if "gedcom_geocode_cache_v5" in t:
        print('already v5')
        return
    t = t.replace("gedcom_geocode_cache_v4", "gedcom_geocode_cache_v5")
    if "removeItem('gedcom_geocode_cache_v4')" not in t:
        t = t.replace(
            "localStorage.removeItem('gedcom_geocode_cache_v2');",
            "localStorage.removeItem('gedcom_geocode_cache_v2');\n    localStorage.removeItem('gedcom_geocode_cache_v4');",
        )
    p.write_text(t)
    print('cache v5')

if __name__ == '__main__':
    main()
