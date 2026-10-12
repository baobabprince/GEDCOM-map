
import type { Place } from '../types.ts';

/**
 * Inserts geocoded coordinates into an existing GEDCOM file content.
 * It finds PLAC tags and adds MAP/LATI/LONG sub-records in a format
 * compatible with software like Gramps.
 *
 * @param originalGedcom - The original string content of the GEDCOM file.
 * @param places - An array of place objects, some of which may have lat/lon coordinates.
 * @returns A new string with the GEDCOM content including coordinates.
 */
export const generateGedcomWithCoords = (originalGedcom: string, places: Place[]): string => {
  const placeMap = new Map(
    places
      .filter(p => p.name && p.lat != null && p.lon != null)
      .map(p => [p.name, { lat: p.lat!, lon: p.lon! }])
  );

  if (placeMap.size === 0) {
    console.warn("No geocoded places available to export.");
    return originalGedcom;
  }

  const lines = originalGedcom.split(/\r?\n/);
  const newLines: string[] = [];
  const placTagRegex = /^(\d+)\s+PLAC\s+(.+)$/;

  for (const line of lines) {
    newLines.push(line);
    const match = line.match(placTagRegex);

    if (match) {
      const level = parseInt(match[1], 10);
      const placeName = match[2].trim();

      if (placeMap.has(placeName)) {
        const coords = placeMap.get(placeName)!;
        const latDirection = coords.lat >= 0 ? 'N' : 'S';
        const lonDirection = coords.lon >= 0 ? 'E' : 'W';

        // Add the MAP structure according to GEDCOM standard 5.5.1
        newLines.push(`${level + 1} MAP`);
        newLines.push(`${level + 2} LATI ${latDirection}${Math.abs(coords.lat).toFixed(4)}`);
        newLines.push(`${level + 2} LONG ${lonDirection}${Math.abs(coords.lon).toFixed(4)}`);
      }
    }
  }

  return newLines.join('\n');
};
