#!/usr/bin/env python3
from pathlib import Path
import re
p = Path('services/knownLocations.ts')
t = p.read_text()
# Remove lone comma lines and double commas
t2 = re.sub(r',\s*,', ',', t)
t2 = re.sub(r'\n\s*,\s*\n', '\n', t2)
if t2 == t:
    # try specific pattern around yemen / baghdad
    t2 = t.replace("},\n  ,\n", "},\n")
    t2 = t2.replace("},\n,\n", "},\n")
p.write_text(t2)
print('fixed' if t2 != t else 'no change', 'double commas left', t2.count('},,'))
# verify no lone comma line
for i, line in enumerate(t2.splitlines(), 1):
    if line.strip() == ',':
        print('lone comma at', i)
