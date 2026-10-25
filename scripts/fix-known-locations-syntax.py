#!/usr/bin/env python3
"""Fix double-comma syntax error in knownLocations.ts that breaks vite build."""
from pathlib import Path

p = Path('services/knownLocations.ts')
t = p.read_text()
old = "'south africa': { lat: -30.5595, lon: 22.9375 },,"
new = "'south africa': { lat: -30.5595, lon: 22.9375 },"
if old not in t:
    if new in t and '},,' not in t:
        print('already fixed')
        raise SystemExit(0)
    # broader fix: any },,
    import re
    t2, n = re.subn(r'\},\s*,', '},', t)
    if n == 0:
        raise SystemExit('pattern not found')
    p.write_text(t2)
    print(f'fixed {n} double-comma(s) via regex')
else:
    p.write_text(t.replace(old, new, 1))
    print('fixed south africa double-comma')
