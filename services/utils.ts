

export const hebrewMonthMap: { [key: string]: string } = {
  TSH: 'Tishrei', CSH: 'Cheshvan', KSL: 'Kislev', TVT: 'Tevet',
  SHV: 'Shevat', ADR: 'Adar', ADS: 'Adar Sheni', NSN: 'Nisan',
  IYR: 'Iyar', SVN: 'Sivan', TMZ: 'Tammuz', AAV: 'Av', ELL: 'Elul',
};

export const formatDate = (dateStr: string | null): string | null => {
    if (!dateStr) return null;

    const hebrewMarker = '@#DHEBREW@';
    const hebrewIndex = dateStr.indexOf(hebrewMarker);

    if (hebrewIndex === -1) {
        return dateStr; // Not a hebrew date
    }

    const prefix = dateStr.substring(0, hebrewIndex).trim();
    let hebrewDateContent = dateStr.substring(hebrewIndex + hebrewMarker.length).trim();
    
    let hebrewPart = hebrewDateContent;
    let gregorianPart = '';

    const gregorianMatch = hebrewPart.match(/\((.*?)\)/);
    if (gregorianMatch && gregorianMatch[1]) {
        gregorianPart = gregorianMatch[1].trim();
        hebrewPart = hebrewPart.replace(gregorianMatch[0], '').trim();
    }

    const parts = hebrewPart.split(' ');
    for (let i = 0; i < parts.length; i++) {
        const monthCandidate = parts[i].toUpperCase();
        if (hebrewMonthMap[monthCandidate]) {
            parts[i] = hebrewMonthMap[monthCandidate];
        }
    }
    hebrewPart = parts.join(' ');

    let formattedDate;
    if (gregorianPart) {
        formattedDate = `${gregorianPart} (${hebrewPart} Hebrew)`;
    } else {
        formattedDate = `${hebrewPart} (Hebrew)`;
    }

    return prefix ? `${prefix} ${formattedDate}` : formattedDate;
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