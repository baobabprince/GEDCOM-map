#!/usr/bin/env python3
from pathlib import Path
import re

COMPONENT = '''
const FamilyTreeLink = ({ className = '' }: { className?: string }) => {
  const { lang } = useLanguage();
  const he = lang === 'he';
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
    if 'const FamilyTreeLink' in t and 'אילן המשפחה' in t and 'flex items-center gap-2"><LanguageSwitcher' in t:
        print('already fully applied')
        return

    if 'const FamilyTreeLink' not in t:
        anchor = 'const SidebarContent = ({'
        if anchor not in t:
            raise SystemExit('SidebarContent not found')
        t = t.replace(anchor, COMPONENT + '\n' + anchor, 1)
        print('component added')

    if 'FamilyTreeLink />' not in t:
        t2, n = re.subn(
            r'<LanguageSwitcher(\s+className="[^"]*")?\s*/>',
            lambda m: f'<div className="flex items-center gap-2"><LanguageSwitcher{m.group(1) or ""} /><FamilyTreeLink /></div>',
            t,
        )
        print('wrapped', n)
        t = t2

    p.write_text(t)
    print('ok')

if __name__ == '__main__':
    main()
