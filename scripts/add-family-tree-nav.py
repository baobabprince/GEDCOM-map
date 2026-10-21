#!/usr/bin/env python3
from pathlib import Path
import re

# Add a small link component and show it beside LanguageSwitcher usages in chrome
COMPONENT = '''
const FamilyTreeLink = ({ className = '' }: { className?: string }) => {
  const { language } = useLanguage();
  const he = language === 'he' || language === 'he-IL';
  return (
    <a
      href="https://baobabprince.github.io/anafim/"
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center text-xs px-2.5 py-1.5 rounded-md border border-slate-600/60 bg-slate-800/80 text-slate-100 hover:bg-slate-700 transition-colors no-underline ${className}`}
      title={he ? 'פתיחת אותו אילן במבט משפחתי' : 'Open the same tree in family view'}
    >
      {he ? 'אילן המשפחה' : 'Family tree'}
    </a>
  );
};
'''

def main():
    p = Path('App.tsx')
    t = p.read_text()
    if 'FamilyTreeLink' in t and 'אילן המשפחה' in t:
        print('already')
        return

    # Insert component after LanguageSwitcher definition ends — find LanguageSwitcher const and next const
    if 'const FamilyTreeLink' not in t:
        # Place before SidebarContent or after LanguageSwitcher function
        anchor = 'const SidebarContent = ({'
        if anchor not in t:
            anchor = 'const DataInputSection'
        if 'const LanguageSwitcher' in t and anchor in t:
            # insert FamilyTreeLink before SidebarContent
            t = t.replace(anchor, COMPONENT + '\n' + anchor, 1)
            print('component added')
        else:
            raise SystemExit('anchors not found')

    # Wrap LanguageSwitcher appearances: <LanguageSwitcher /> -> flex with FamilyTreeLink
    # Only for standalone LanguageSwitcher in headers (not if already wrapped)
    def repl(m):
        inner = m.group(0)
        if 'FamilyTreeLink' in inner:
            return inner
        cls = m.group(1) or ''
        return f'<div className="flex items-center gap-2">{inner}<FamilyTreeLink /></div>'

    # Replace <LanguageSwitcher /> and <LanguageSwitcher className="..." />
    t2, n = re.subn(
        r'<LanguageSwitcher(\s+className="[^"]*")?\s*/>',
        lambda m: f'<div className="flex items-center gap-2"><LanguageSwitcher{m.group(1) or ""} /><FamilyTreeLink /></div>',
        t,
    )
    if n == 0:
        print('no LanguageSwitcher self-closing found')
    else:
        t = t2
        print('wrapped', n, 'switchers')

    p.write_text(t)
    print('ok')

if __name__ == '__main__':
    main()
