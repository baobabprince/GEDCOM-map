#!/usr/bin/env python3
from pathlib import Path

def main():
    p = Path('services/geocodingService.ts')
    t = p.read_text()
    old = '''export const geocode = async (
  placeNames: string[],
  onProgress?: (progress: ProgressState) => void,
  onBatchResolved?: (resolved: { name: string; lat: number; lon: number }[]) => void
): Promise<{ name: string; lat: number; lon: number }[]> => {'''
    new = '''export const geocode = async (
  placeNames: string[],
  onProgress?: (progress: ProgressState) => void,
  onBatchResolved?: (resolved: { name: string; lat: number; lon: number }[]) => void,
  fileScope?: string | null
): Promise<{ name: string; lat: number; lon: number }[]> => {'''
    if 'fileScope?: string | null' in t[t.find('export const geocode'):t.find('export const geocode')+350]:
        print('already has param')
    elif old in t:
        t = t.replace(old, new, 1)
        p.write_text(t)
        print('signature fixed')
    else:
        raise SystemExit('signature pattern not found')

    # Also verify App has collapsible
    app = Path('App.tsx').read_text()
    print('mappedCollapsed', 'mappedCollapsed' in app)
    print('sourceFilename', 'sourceFilename' in app)
    print('scope in geocode call', ',\n            scope' in app or ', scope)' in app or 'scope\n          )' in app)

if __name__ == '__main__':
    main()
