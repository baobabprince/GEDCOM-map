#!/usr/bin/env python3
from pathlib import Path
import re

def main():
    p = Path('App.tsx')
    t = p.read_text()

    if 'baobabSharedStorage' not in t:
        # insert import after parseGedcom import
        needle = "from './services/gedcomParser.ts';"
        if needle not in t:
            needle = "from './services/gedcomParser';"
        if needle not in t:
            raise SystemExit('parseGedcom import not found')
        t = t.replace(
            needle,
            needle + "\nimport { saveSharedExport, loadSharedExport, hasSharedExport, formatSharedSummary } from './services/baobabSharedStorage';",
            1,
        )

    # auto-save after file process
    old = '''  const handleFileProcess = useCallback(
    async (file: File) => {
      const content = await file.text();
      setOriginalGedcom(content);
      await _processGedcomContent(content);
    },
    [_processGedcomContent]
  );'''
    new = '''  const handleFileProcess = useCallback(
    async (file: File) => {
      const content = await file.text();
      setOriginalGedcom(content);
      try {
        saveSharedExport({
          source: 'GEDCOM-map',
          filename: file.name,
          gedcom: content,
          meta: { title: file.name },
        });
      } catch (_) {}
      await _processGedcomContent(content);
    },
    [_processGedcomContent]
  );

  const handleLoadShared = useCallback(async () => {
    const shared = loadSharedExport();
    if (!shared?.gedcom) return;
    setOriginalGedcom(shared.gedcom);
    await _processGedcomContent(shared.gedcom);
  }, [_processGedcomContent]);

  const handleSaveShared = useCallback(() => {
    if (!originalGedcom) return;
    try {
      saveSharedExport({
        source: 'GEDCOM-map',
        filename: 'from-gedcom-map.ged',
        gedcom: originalGedcom,
        meta: { personCount: persons?.length },
      });
    } catch (_) {}
  }, [originalGedcom, persons]);'''
    if old in t and 'handleLoadShared' not in t:
        t = t.replace(old, new, 1)

    # pass props through - find object with onFileSelect: handleFileProcess
    if 'onLoadShared' not in t:
        t = t.replace(
            'onFileSelect: handleFileProcess,',
            'onFileSelect: handleFileProcess,\n    onLoadShared: handleLoadShared,\n    onSaveShared: handleSaveShared,\n    hasShared: hasSharedExport(),\n    sharedSummary: formatSharedSummary(loadSharedExport()),',
            1,
        )

    # DataInputSection - add optional props and buttons
    if 'onLoadShared' in t and 'טען מהשיתוף' not in t:
        # extend DataInputSection destructure
        old_dis = 'const DataInputSection = ({ onFileSelect, onSampleSelect, onClearCache, hasCache, disabled }) => {'
        new_dis = 'const DataInputSection = ({ onFileSelect, onSampleSelect, onClearCache, hasCache, disabled, onLoadShared, onSaveShared, hasShared, sharedSummary }) => {'
        if old_dis in t:
            t = t.replace(old_dis, new_dis, 1)

        # inject UI after sample button block - look for trySampleData usage end
        anchor = '{t.trySampleData}'
        if anchor in t and 'טען מהשיתוף' not in t:
            # find the button containing trySampleData and add after its closing
            # simpler: after onSampleSelect button's closing tag area
            idx = t.find(anchor)
            # insert a shared box after the sample button - find next </button> after anchor
            close = t.find('</button>', idx)
            if close > 0:
                insert = '''</button>
      <div className="mt-4 p-3 rounded-xl border border-[#e7e8e0] bg-[#fefefb] text-right">
        <p className="text-[10px] font-semibold text-[#82877e] mb-1">שיתוף בין אפליקציות</p>
        <p className="text-[10px] text-[#a4a79f] mb-2 truncate">{sharedSummary || 'אין נתונים משותפים עדיין'}</p>
        <div className="flex gap-2 justify-end flex-wrap">
          <button type="button" className="text-xs px-3 py-1.5 rounded-lg bg-[#edf1e9] text-[#456352] disabled:opacity-40" disabled={!hasShared || disabled} onClick={() => onLoadShared?.()}>
            טען מהשיתוף
          </button>
          <button type="button" className="text-xs px-3 py-1.5 rounded-lg bg-[#ac694c] text-white disabled:opacity-40" disabled={disabled} onClick={() => onSaveShared?.()}>
            שמור לשיתוף
          </button>
        </div>
      </div>'''
                # replace only the first </button> after trySampleData without duplicating
                t = t[:close] + insert + t[close+len('</button>'):]

        # pass props at DataInputSection usages
        for pattern in [
            'onFileSelect={onFileSelect}\n            onSampleSelect={onSampleSelect}',
            'onFileSelect={onFileSelect}\n                  onSampleSelect={onSampleSelect}',
            'onFileSelect={props.onFileSelect}\n            onSampleSelect={props.onSampleSelect}',
        ]:
            if pattern in t and 'onLoadShared=' not in t.split(pattern)[1][:80]:
                repl = pattern + '\n            onLoadShared={onLoadShared || props?.onLoadShared}\n            onSaveShared={onSaveShared || props?.onSaveShared}\n            hasShared={hasShared ?? props?.hasShared}\n            sharedSummary={sharedSummary || props?.sharedSummary}'
                # careful - props version
                pass

        # more reliable prop pass on Initial view
        old_props = 'onFileSelect={props.onFileSelect}\n            onSampleSelect={props.onSampleSelect}'
        if old_props in t:
            t = t.replace(
                old_props,
                'onFileSelect={props.onFileSelect}\n            onSampleSelect={props.onSampleSelect}\n            onLoadShared={props.onLoadShared}\n            onSaveShared={props.onSaveShared}\n            hasShared={props.hasShared}\n            sharedSummary={props.sharedSummary}',
                1,
            )

        # and nested DataInputSection
        old2 = 'onFileSelect={onFileSelect}\n                  onSampleSelect={onSampleSelect}'
        if old2 in t:
            t = t.replace(
                old2,
                'onFileSelect={onFileSelect}\n                  onSampleSelect={onSampleSelect}\n                  onLoadShared={onLoadShared}\n                  onSaveShared={onSaveShared}\n                  hasShared={hasShared}\n                  sharedSummary={sharedSummary}',
                1,
            )

    p.write_text(t)
    print('App.tsx', p.stat().st_size)
    print('import', 'baobabSharedStorage' in t)
    print('load handler', 'handleLoadShared' in t)
    print('ui', 'טען מהשיתוף' in t)

if __name__ == '__main__':
    main()
