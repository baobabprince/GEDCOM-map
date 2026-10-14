import type { Language } from './i18n.ts';

export const hebrewMonthMapEn: { [key: string]: string } = {
  TSH: 'Tishrei', CSH: 'Cheshvan', KSL: 'Kislev', TVT: 'Tevet',
  SHV: 'Shevat', ADR: 'Adar', ADS: 'Adar II', NSN: 'Nisan',
  IYR: 'Iyar', SVN: 'Sivan', TMZ: 'Tammuz', AAV: 'Av', ELL: 'Elul',
};

export const hebrewMonthMapHe: { [key: string]: string } = {
  TSH: 'תשרי', CSH: 'חשוון', KSL: 'כסלו', TVT: 'טבת',
  SHV: 'שבט', ADR: 'אדר', ADS: 'אדר ב׳', NSN: 'ניסן',
  IYR: 'אייר', SVN: 'סיוון', TMZ: 'תמוז', AAV: 'אב', ELL: 'אלול',
};

const gregorianMonthsEn: { [key: string]: string } = {
  JAN: 'Jan', FEB: 'Feb', MAR: 'Mar', APR: 'Apr',
  MAY: 'May', JUN: 'Jun', JUL: 'Jul', AUG: 'Aug',
  SEP: 'Sep', OCT: 'Oct', NOV: 'Nov', DEC: 'Dec',
};

const gregorianMonthsHeStandalone: { [key: string]: string } = {
  JAN: 'ינואר', FEB: 'פברואר', MAR: 'מרץ', APR: 'אפריל',
  MAY: 'מאי', JUN: 'יוני', JUL: 'יולי', AUG: 'אוגוסט',
  SEP: 'ספטמבר', OCT: 'אוקטובר', NOV: 'נובמבר', DEC: 'דצמבר',
};

const gregorianMonthsHeWithDay: { [key: string]: string } = {
  JAN: 'בינואר', FEB: 'בפברואר', MAR: 'במרץ', APR: 'באפריל',
  MAY: 'במאי', JUN: 'ביוני', JUL: 'ביולי', AUG: 'באוגוסט',
  SEP: 'בספטמבר', OCT: 'באוקטובר', NOV: 'בנובמבר', DEC: 'בדצמבר',
};

const hebrewDaysGematria: { [day: number]: string } = {
  1: 'א׳', 2: 'ב׳', 3: 'ג׳', 4: 'ד׳', 5: 'ה׳',
  6: 'ו׳', 7: 'ז׳', 8: 'ח׳', 9: 'ט׳', 10: 'י׳',
  11: 'י״א', 12: 'י״ב', 13: 'י״ג', 14: 'י״ד', 15: 'ט״ו',
  16: 'ט״ז', 17: 'י״ז', 18: 'י״ח', 19: 'י״ט', 20: 'כ׳',
  21: 'כ״א', 22: 'כ״ב', 23: 'כ״ג', 24: 'כ״ד', 25: 'כ״ה',
  26: 'כ״ו', 27: 'כ״ז', 28: 'כ״ח', 29: 'כ״ט', 30: 'ל׳',
};

/**
 * Converts a Hebrew year (e.g., 5741) to Hebrew letters (e.g., תשמ"א).
 */
const formatHebrewYearGematria = (year: number): string | null => {
  if (year < 5000 || year >= 6000) return null;
  let rem = year % 1000;
  const hundredsMap: [number, string][] = [
    [400, 'ת'], [300, 'ש'], [200, 'ר'], [100, 'ק']
  ];
  const tensMap: [number, string][] = [
    [90, 'צ'], [80, 'פ'], [70, 'ע'], [60, 'ס'], [50, 'נ'],
    [40, 'מ'], [30, 'ל'], [20, 'כ'], [10, 'י']
  ];
  const onesMap: [number, string][] = [
    [9, 'ט'], [8, 'ח'], [7, 'ז'], [6, 'ו'], [5, 'ה'],
    [4, 'ד'], [3, 'ג'], [2, 'ב'], [1, 'א']
  ];

  let letters = '';
  for (const [val, letStr] of hundredsMap) {
    while (rem >= val) {
      letters += letStr;
      rem -= val;
    }
  }

  if (rem === 15) {
    letters += 'טו';
    rem = 0;
  } else if (rem === 16) {
    letters += 'טז';
    rem = 0;
  } else {
    for (const [val, letStr] of tensMap) {
      if (rem >= val) {
        letters += letStr;
        rem -= val;
        break;
      }
    }
    for (const [val, letStr] of onesMap) {
      if (rem >= val) {
        letters += letStr;
        rem -= val;
        break;
      }
    }
  }

  if (!letters) return null;
  if (letters.length === 1) {
    return `${letters}׳`;
  }
  return `${letters.slice(0, -1)}״${letters.slice(-1)}`;
};

/**
 * Formats a single simple Gregorian date fragment (without range keywords) in the target language.
 * E.g. "12 MAR 1955", "MAR 1955", "1955"
 */
const formatSimpleGregorianPart = (part: string, lang: Language): string => {
  const trimmed = part.trim();
  if (!trimmed) return '';

  // Match optional modifier prefix: ABT, BEF, AFT, EST, CAL, INT
  const prefixMatch = trimmed.match(/^(ABT|ABOUT|BEF|BEFORE|AFT|AFTER|EST|CAL|INT)\b\s*(.*)$/i);
  if (prefixMatch) {
    const mod = prefixMatch[1].toUpperCase();
    const rest = formatSimpleGregorianPart(prefixMatch[2], lang);
    const modMap: Record<string, { he: string; en: string }> = {
      ABT: { he: 'בסביבות', en: 'About' },
      ABOUT: { he: 'בסביבות', en: 'About' },
      BEF: { he: 'לפני', en: 'Before' },
      BEFORE: { he: 'לפני', en: 'Before' },
      AFT: { he: 'אחרי', en: 'After' },
      AFTER: { he: 'אחרי', en: 'After' },
      EST: { he: 'מוערך', en: 'Est.' },
      CAL: { he: 'מחושב', en: 'Calc.' },
      INT: { he: 'משוער', en: 'Interp.' },
    };
    const modText = modMap[mod]?.[lang] || prefixMatch[1];
    return rest ? `${modText} ${rest}` : modText;
  }

  // Match "DD MMM YYYY"
  const dmyMatch = trimmed.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{3,4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const monthKey = dmyMatch[2].toUpperCase().slice(0, 3);
    const year = dmyMatch[3];
    if (lang === 'he' && gregorianMonthsHeWithDay[monthKey]) {
      return `${day} ${gregorianMonthsHeWithDay[monthKey]} ${year}`;
    }
    if (lang === 'en' && gregorianMonthsEn[monthKey]) {
      return `${day} ${gregorianMonthsEn[monthKey]} ${year}`;
    }
  }

  // Match "MMM YYYY"
  const myMatch = trimmed.match(/^([A-Za-z]{3,9})\s+(\d{3,4})$/);
  if (myMatch) {
    const monthKey = myMatch[1].toUpperCase().slice(0, 3);
    const year = myMatch[2];
    if (lang === 'he' && gregorianMonthsHeStandalone[monthKey]) {
      return `${gregorianMonthsHeStandalone[monthKey]} ${year}`;
    }
    if (lang === 'en' && gregorianMonthsEn[monthKey]) {
      return `${gregorianMonthsEn[monthKey]} ${year}`;
    }
  }

  // Match "DD MMM" (without year)
  const dmMatch = trimmed.match(/^(\d{1,2})\s+([A-Za-z]{3,9})$/);
  if (dmMatch) {
    const day = parseInt(dmMatch[1], 10);
    const monthKey = dmMatch[2].toUpperCase().slice(0, 3);
    if (lang === 'he' && gregorianMonthsHeWithDay[monthKey]) {
      return `${day} ${gregorianMonthsHeWithDay[monthKey]}`;
    }
    if (lang === 'en' && gregorianMonthsEn[monthKey]) {
      return `${day} ${gregorianMonthsEn[monthKey]}`;
    }
  }

  return trimmed;
};

/**
 * Formats a Gregorian date expression (supporting BET..AND.., FROM..TO.., prefixes, and standard GEDCOM dates).
 */
const formatGregorianDate = (dateStr: string, lang: Language): string => {
  const trimmed = dateStr.trim();

  // BET X AND Y
  const betMatch = trimmed.match(/^BET(?:WEEN)?\s+(.+?)\s+AND\s+(.+)$/i);
  if (betMatch) {
    const d1 = formatSimpleGregorianPart(betMatch[1], lang);
    const d2 = formatSimpleGregorianPart(betMatch[2], lang);
    return lang === 'he' ? `בין ${d1} ל-${d2}` : `Between ${d1} and ${d2}`;
  }

  // FROM X TO Y
  const fromToMatch = trimmed.match(/^FROM\s+(.+?)\s+TO\s+(.+)$/i);
  if (fromToMatch) {
    const d1 = formatSimpleGregorianPart(fromToMatch[1], lang);
    const d2 = formatSimpleGregorianPart(fromToMatch[2], lang);
    return lang === 'he' ? `מ-${d1} עד ${d2}` : `From ${d1} to ${d2}`;
  }

  // FROM X
  const fromMatch = trimmed.match(/^FROM\s+(.+)$/i);
  if (fromMatch) {
    const d1 = formatSimpleGregorianPart(fromMatch[1], lang);
    return lang === 'he' ? `מ-${d1}` : `From ${d1}`;
  }

  // TO Y
  const toMatch = trimmed.match(/^TO\s+(.+)$/i);
  if (toMatch) {
    const d2 = formatSimpleGregorianPart(toMatch[1], lang);
    return lang === 'he' ? `עד ${d2}` : `To ${d2}`;
  }

  return formatSimpleGregorianPart(trimmed, lang);
};

/**
 * Formats a GEDCOM date string (Hebrew or Gregorian) into the active UI language ('he' or 'en').
 */
export const formatDate = (dateStr: string | null | undefined, lang: Language = 'he'): string | null => {
  if (!dateStr) return null;

  const hebrewMarker = '@#DHEBREW@';
  const hebrewIndex = dateStr.indexOf(hebrewMarker);

  if (hebrewIndex === -1) {
    return formatGregorianDate(dateStr, lang);
  }

  const rawPrefix = dateStr.substring(0, hebrewIndex).trim();
  const formattedPrefix = rawPrefix ? formatSimpleGregorianPart(rawPrefix, lang) : '';
  const hebrewDateContent = dateStr.substring(hebrewIndex + hebrewMarker.length).trim();

  let hebrewPart = hebrewDateContent;
  let gregorianPart = '';

  const gregorianMatch = hebrewPart.match(/\((.*?)\)/);
  if (gregorianMatch && gregorianMatch[1]) {
    gregorianPart = formatGregorianDate(gregorianMatch[1].trim(), lang);
    hebrewPart = hebrewPart.replace(gregorianMatch[0], '').trim();
  }

  if (lang === 'he') {
    // Parse tokens of Hebrew date e.g. "15 IYR 5741" or "IYR 5741"
    const parts = hebrewPart.split(/\s+/);
    let dayNum: number | null = null;
    let monthHe: string | null = null;
    let yearNum: number | null = null;
    const otherTokens: string[] = [];

    for (const token of parts) {
      const upper = token.toUpperCase();
      if (hebrewMonthMapHe[upper]) {
        monthHe = hebrewMonthMapHe[upper];
      } else if (/^\d{1,2}$/.test(token)) {
        dayNum = parseInt(token, 10);
      } else if (/^\d{4}$/.test(token)) {
        yearNum = parseInt(token, 10);
      } else {
        otherTokens.push(formatSimpleGregorianPart(token, 'he'));
      }
    }

    let formattedHebrew = '';
    if (monthHe) {
      const dayStr = dayNum && hebrewDaysGematria[dayNum] ? hebrewDaysGematria[dayNum] : (dayNum ? String(dayNum) : '');
      const monthStr = dayStr ? `ב${monthHe}` : monthHe;
      const yearGematria = yearNum ? formatHebrewYearGematria(yearNum) : null;
      const yearStr = yearNum
        ? (yearGematria ? `${yearGematria} (${yearNum})` : String(yearNum))
        : '';
      formattedHebrew = [
        ...otherTokens,
        dayStr,
        monthStr,
        yearStr,
      ].filter(Boolean).join(' ');
    } else {
      formattedHebrew = hebrewPart;
    }

    const combined = gregorianPart
      ? `${gregorianPart} (${formattedHebrew})`
      : `${formattedHebrew}`;

    return formattedPrefix ? `${formattedPrefix} ${combined}` : combined;
  } else {
    // English formatting for @#DHEBREW@
    const parts = hebrewPart.split(/\s+/);
    for (let i = 0; i < parts.length; i++) {
      const monthCandidate = parts[i].toUpperCase();
      if (hebrewMonthMapEn[monthCandidate]) {
        parts[i] = hebrewMonthMapEn[monthCandidate];
      } else {
        parts[i] = formatSimpleGregorianPart(parts[i], 'en');
      }
    }
    const formattedHebrewEn = parts.join(' ');

    const combined = gregorianPart
      ? `${gregorianPart} (${formattedHebrewEn} Hebrew)`
      : `${formattedHebrewEn} (Hebrew)`;

    return formattedPrefix ? `${formattedPrefix} ${combined}` : combined;
  }
};

export const getYearFromDate = (dateStr: string | null): number | undefined => {
  if (!dateStr) return undefined;

  // For dates with a Hebrew calendar indicator, prioritize explicit Gregorian year first.
  if (dateStr.includes('@#DHEBREW@')) {
    // Prefer explicit Gregorian year from parentheses, as it's more reliable
    const gregorianMatch = dateStr.match(/\((.*?)\)/);
    if (gregorianMatch && gregorianMatch[1]) {
      const gregorianPart = gregorianMatch[1];
      const yearMatch = gregorianPart.match(/\b(\d{4})\b/);
      if (yearMatch) {
        return parseInt(yearMatch[1], 10);
      }
    }

    // Fallback to finding a 4-digit number and assuming it's a Hebrew year to be converted.
    const hebrewYearMatch = dateStr.match(/\b(\d{4})\b/);
    if (hebrewYearMatch) {
      const hebrewYear = parseInt(hebrewYearMatch[1], 10);
      // Simple sanity check: if the year is high, assume it's Hebrew.
      if (hebrewYear > 3760) {
        // Approximate conversion from Hebrew to Gregorian civil year.
        return hebrewYear - 3760;
      }
      // Otherwise, it might be a Gregorian year provided alongside the Hebrew tag without parens.
      return hebrewYear;
    }
    return undefined;
  }

  // Handle standard Gregorian dates (or dates without a Hebrew tag)
  const match = dateStr.match(/\b(\d{4})\b/);
  return match ? parseInt(match[1], 10) : undefined;
};

export const parseSortableDate = (dateStr: string | null): number | null => {
  if (!dateStr) return null;

  // Check for Hebrew calendar
  if (dateStr.includes('@#DHEBREW@')) {
    // Prefer explicit Gregorian year/date in parentheses
    const gregorianMatch = dateStr.match(/\((.*?)\)/);
    if (gregorianMatch && gregorianMatch[1]) {
      const parsed = parseSortableDate(gregorianMatch[1]);
      if (parsed !== null) return parsed;
    }

    // Fallback to year extraction
    const year = getYearFromDate(dateStr);
    return year !== undefined ? year * 10000 : null;
  }

  // Clean common GEDCOM date prefixes (ABT, BEF, AFT, CAL, EST, FROM, TO, INT)
  const cleaned = dateStr.replace(/\b(ABT|BEF|AFT|CAL|EST|FROM|TO|INT|BET|AND)\b/gi, ' ').trim();

  // Standard month mapping
  const months: { [key: string]: number } = {
    JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
    JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12
  };

  // Pattern: [DAY] [MONTH] YEAR  e.g. "12 MAR 1955" or "MAR 1955" or "1955"
  const fullMatch = cleaned.match(/^(?:(\d{1,2})\s+)?([A-Za-z]{3,4})\s+(\d{3,4})$/);
  if (fullMatch) {
    const day = fullMatch[1] ? parseInt(fullMatch[1], 10) : 1;
    const monthStr = fullMatch[2].toUpperCase().slice(0, 3);
    const month = months[monthStr] || 1;
    const year = parseInt(fullMatch[3], 10);
    return year * 10000 + month * 100 + day;
  }

  // Pattern: Year only or trailing year: e.g. "1955"
  const yearMatch = cleaned.match(/\b(\d{3,4})\b/);
  if (yearMatch) {
    const year = parseInt(yearMatch[1], 10);
    return year * 10000;
  }

  const year = getYearFromDate(dateStr);
  return year !== undefined ? year * 10000 : null;
};

/**
 * Compares two date strings chronologically:
 * - Valid dates come first, sorted from earliest to latest (from top to bottom)
 * - Events without a date (or unparseable dates) are placed strictly at the end
 */
export const compareEventDates = (dateA: string | null, dateB: string | null): number => {
  const valA = parseSortableDate(dateA);
  const valB = parseSortableDate(dateB);

  const hasA = valA !== null;
  const hasB = valB !== null;

  if (hasA && hasB) {
    return valA! - valB!;
  }
  if (hasA) return -1; // A has date, B doesn't -> A comes before B
  if (hasB) return 1;  // B has date, A doesn't -> B comes before A
  return 0;            // Neither has a date
};

export const calculateAgeAtEvent = (birthDate: string | null, eventDate: string | null): number | null => {
  if (!birthDate || !eventDate) return null;

  const birthYear = getYearFromDate(birthDate);
  const eventYear = getYearFromDate(eventDate);

  if (birthYear === undefined || eventYear === undefined) return null;

  const age = eventYear - birthYear;
  return age >= 0 ? age : null;
};