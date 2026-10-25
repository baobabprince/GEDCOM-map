#!/usr/bin/env python3
"""Improve Anafim family-tree navigation placement and person timeline link."""
from pathlib import Path
import re

NEW_COMPONENTS = r"""
const ANAFIM_URL = 'https://baobabprince.github.io/anafim/';

/** Compact chip for top bars next to language switcher */
const FamilyTreeLink = ({ className = '' }: { className?: string }) => {
  const { lang } = useLanguage();
  const he = lang === 'he';
  return (
    <a
      href={ANAFIM_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center text-xs px-2.5 py-1.5 rounded-md border border-slate-600/60 bg-slate-800/80 text-slate-100 hover:bg-slate-700 transition-colors no-underline ${className}`}
      title={he ? 'פתיחת אותו אילן במבט משפחתי' : 'Open the same tree in family view'}
    >
      {he ? 'אילן המשפחה' : 'Family tree'}
    </a>
  );
};

/** Full-width nav row for sidebar (desktop) */
const FamilyTreeNavRow = () => {
  const { lang, isRTL } = useLanguage();
  const he = lang === 'he';
  return (
    <a
      href={ANAFIM_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`mt-3 flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-indigo-500/30 bg-indigo-950/40 text-indigo-100 hover:bg-indigo-900/50 transition-colors no-underline text-sm`}
      title={he ? 'פתיחת אותו אילן במבט משפחתי' : 'Open the same tree in family view'}
    >
      <span className="text-base leading-none" aria-hidden>
        🌳
      </span>
      <span className="font-medium">{he ? 'מעבר לאילן המשפחה' : 'Open family tree view'}</span>
      <span className={`text-indigo-400/80 text-xs ${isRTL ? 'mr-auto' : 'ml-auto'}`}>
        {he ? 'ענפים ↗' : 'Anafim ↗'}
      </span>
    </a>
  );
};

/** Link from a person's timeline to Anafim */
const PersonInTreeLink = ({ personName }: { personName: string }) => {
  const { lang } = useLanguage();
  const he = lang === 'he';
  const href = `${ANAFIM_URL}?q=${encodeURIComponent(personName)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-3 inline-flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg border border-teal-600/40 bg-teal-950/30 text-teal-100 hover:bg-teal-900/40 transition-colors no-underline text-xs font-medium"
      title={he ? 'פתיחת האדם הזה באילן המשפחה' : 'Open this person in the family tree view'}
    >
      <span aria-hidden>🌳</span>
      {he ? `הצג את ${personName.split(' ')[0]} באילן המשפחה` : `View in family tree`}
      <span className="opacity-70">↗</span>
    </a>
  );
};
"""


def main():
    p = Path('App.tsx')
    t = p.read_text()
    if 'FamilyTreeNavRow' in t and 'PersonInTreeLink' in t and t.count('PersonInTreeLink') >= 2:
        print('already fully applied')
        return

    old_pat = re.compile(
        r"const FamilyTreeLink = \(\{ className = '' \}: \{ className\?: string \}\) => \{.*?\n\};\n",
        re.S,
    )
    if old_pat.search(t):
        t = old_pat.sub(NEW_COMPONENTS.strip() + '\n\n', t, count=1)
        print('replaced FamilyTreeLink block')
    elif 'const FamilyTreeLink' not in t:
        anchor = 'const SidebarContent = ({'
        if anchor not in t:
            raise SystemExit('SidebarContent not found')
        t = t.replace(anchor, NEW_COMPONENTS.strip() + '\n\n' + anchor, 1)
        print('component inserted')

    old_header = (
        '          <div className="flex items-center gap-2"><LanguageSwitcher /><FamilyTreeLink /></div>\n'
        '        </div>\n'
        '        {appState === AppState.Success && isGeocoding && ('
    )
    new_header = (
        '          <LanguageSwitcher />\n'
        '        </div>\n'
        '        <FamilyTreeNavRow />\n'
        '        {appState === AppState.Success && isGeocoding && ('
    )
    if old_header in t:
        t = t.replace(old_header, new_header, 1)
        print('sidebar header updated')

    old_pd = (
        '      <div className="flex items-center gap-2 pb-3 border-b border-gray-700 mb-4 flex-shrink-0">\n'
        '        <button\n'
        '          onClick={onBack}\n'
        '          className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"\n'
        '          aria-label="Back"\n'
        '        >\n'
        "          <ChevronLeftIcon className={`h-5 w-5 ${isRTL ? 'rotate-180' : ''}`} />\n"
        '        </button>\n'
        '        <h2 className="text-lg font-semibold truncate" title={person.name}>\n'
        '          {person.name}\n'
        '        </h2>\n'
        '      </div>\n'
        '      <div className="flex-grow overflow-y-auto min-h-0">\n'
        '        <h3 className="text-sm font-semibold text-gray-300 mb-3">{t.timelineTitle}</h3>'
    )
    new_pd = (
        '      <div className="flex items-center gap-2 pb-3 border-b border-gray-700 mb-2 flex-shrink-0">\n'
        '        <button\n'
        '          onClick={onBack}\n'
        '          className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"\n'
        '          aria-label="Back"\n'
        '        >\n'
        "          <ChevronLeftIcon className={`h-5 w-5 ${isRTL ? 'rotate-180' : ''}`} />\n"
        '        </button>\n'
        '        <h2 className="text-lg font-semibold truncate" title={person.name}>\n'
        '          {person.name}\n'
        '        </h2>\n'
        '      </div>\n'
        '      <div className="flex-shrink-0 mb-3">\n'
        '        <PersonInTreeLink personName={person.name} />\n'
        '      </div>\n'
        '      <div className="flex-grow overflow-y-auto min-h-0">\n'
        '        <h3 className="text-sm font-semibold text-gray-300 mb-3">{t.timelineTitle}</h3>'
    )
    if old_pd in t:
        t = t.replace(old_pd, new_pd, 1)
        print('person detail link added')
    else:
        print('person detail pattern not found')

    p.write_text(t)
    print('ok')


if __name__ == '__main__':
    main()
