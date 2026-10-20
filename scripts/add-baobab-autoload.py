#!/usr/bin/env python3
from pathlib import Path

def main():
    p = Path('App.tsx')
    t = p.read_text()
    if 'baobab=shared' in t:
        print('already present')
        return
    if 'handleLoadShared' not in t:
        raise SystemExit('handleLoadShared missing')
    effect = '''
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('baobab') === 'shared') {
        handleLoadShared();
        params.delete('baobab');
        const next = params.toString();
        window.history.replaceState({}, '', window.location.pathname + (next ? '?' + next : '') + window.location.hash);
      }
    } catch (_) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

'''
    # insert before a known late return in App - after handlers assigned
    marker = '  const handleFileProcess = useCallback('
    # place after handleSaveShared block ends - after handleLoadShared definition
    if 'handleSaveShared' in t:
        # find "const handleSampleData" which follows file process
        idx = t.find('  const handleSampleData')
        if idx > 0:
            t = t[:idx] + effect + t[idx:]
        else:
            raise SystemExit('insert point not found')
    else:
        raise SystemExit('handleSaveShared missing')
    p.write_text(t)
    print('ok', p.stat().st_size)

if __name__ == '__main__':
    main()
