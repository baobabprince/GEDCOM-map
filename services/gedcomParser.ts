

import type { EventInfo, Person, PersonEvent } from '../types.ts';
import { getYearFromDate, compareEventDates } from './utils.ts';

const eventTags: { [key: string]: string } = {
    'BIRT': 'Birth',
    'DEAT': 'Death',
    // 'MARR' is handled specially for individuals and families
    'DIV': 'Divorce',
    'BAPM': 'Baptism',
    'CHR': 'Christening',
    'ADOP': 'Adoption',
    'RESI': 'Residence',
    'EMIG': 'Emigration',
    'IMMI': 'Immigration',
    'CENS': 'Census',
    'EVEN': 'Event',
    'BURI': 'Burial',
};

interface Family {
    id: string;
    husbandId?: string;
    wifeId?: string;
    childrenIds?: string[];
    marriageEvent?: {
        dates: string[];
        place: string | null;
    };
    // Transient property for parsing state, not part of the final data model.
    _isParsingMarriage?: boolean;
}

/**
 * Combines multiple date strings into a single, formatted string.
 * Prioritizes combining Hebrew and Gregorian dates if both are present.
 * @param dates An array of date strings.
 * @returns A single formatted date string, or null.
 */
const combineDates = (dates: string[]): string | null => {
    if (!dates || dates.length === 0) {
        return null;
    }
    if (dates.length === 1) {
        return dates[0];
    }
    
    const hebrewDate = dates.find(d => d.startsWith('@#DHEBREW@'));
    const gregorianDate = dates.find(d => !d.startsWith('@#DHEBREW@'));

    if (hebrewDate && gregorianDate) {
        return `${hebrewDate} (${gregorianDate})`;
    }
    // Return the first available date, preferring Hebrew if present
    return hebrewDate || gregorianDate || dates[0];
};


/**
 * Parses GEDCOM content to extract structured information about persons and places.
 * This is an asynchronous function to avoid blocking the main thread for large files.
 * @param gedcomContent The string content of the GEDCOM file.
 * @param onProgress Optional callback for progress reporting.
 * @returns An object containing two Maps: one for places and their events, and one for persons and their events.
 */
export const parseGedcom = async (
    gedcomContent: string,
    onProgress?: (step: string, current: number, total: number) => void
): Promise<{ places: Map<string, EventInfo[]>, persons: Map<string, Person> }> => {
    const lines = gedcomContent.split(/\r?\n/);
    const totalLines = lines.length;
    const placesWithEvents = new Map<string, EventInfo[]>();
    const personsWithEvents = new Map<string, Person>();
    const families = new Map<string, Family>();

    let currentPersonId: string | null = null;
    let currentFamilyId: string | null = null;
    let currentEventData: { dates: string[], place: string | null } | null = null;
    let currentEventType: string | null = null;

    const finalizeEvent = () => {
        if (!currentEventType || !currentEventData || !currentEventData.place) {
            return;
        }

        const combinedDate = combineDates(currentEventData.dates);

        if (currentPersonId) {
            const person = personsWithEvents.get(currentPersonId)!;
            const placeName = currentEventData.place;
            
            const eventForPlace: EventInfo = { personId: person.id, personName: person.name, eventType: currentEventType, date: combinedDate };
            if (!placesWithEvents.has(placeName)) placesWithEvents.set(placeName, []);
            placesWithEvents.get(placeName)!.push(eventForPlace);

            const personEvent: PersonEvent = { eventType: currentEventType, date: combinedDate, place: placeName, sortYear: getYearFromDate(combinedDate) };
            person.events.push(personEvent);
        }
        
        currentEventType = null;
        currentEventData = null;
    };

    // Process lines in chunks to maintain UI responsiveness
    const CHUNK_SIZE = 5000;
    for (let i = 0; i < lines.length; i++) {
        // Yield to the event loop every CHUNK_SIZE lines
        if (i > 0 && i % CHUNK_SIZE === 0) {
            if (onProgress) {
                onProgress('Parsing lines...', i, totalLines);
            }
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        const line = lines[i];
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;
        
        // Faster parsing than split(/\s+/) for the common case
        const firstSpace = trimmedLine.indexOf(' ');
        if (firstSpace === -1) continue;
        
        const levelStr = trimmedLine.substring(0, firstSpace);
        const rest = trimmedLine.substring(firstSpace + 1);
        const level = parseInt(levelStr, 10);
        
        const secondSpace = rest.indexOf(' ');
        let tag: string;
        let value: string;
        
        if (secondSpace === -1) {
            tag = rest.toUpperCase();
            value = '';
        } else {
            tag = rest.substring(0, secondSpace).toUpperCase();
            value = rest.substring(secondSpace + 1);
        }

        // Finalize any pending event when we change context (new person, new L1 tag, etc.)
        if (level < 2) {
            finalizeEvent();
        }

        if (level === 0) {
            currentPersonId = null;
            currentFamilyId = null;
            if (value.endsWith('INDI')) {
                currentPersonId = tag;
                if (!personsWithEvents.has(currentPersonId)) {
                    personsWithEvents.set(currentPersonId, { id: currentPersonId, name: 'Unknown', events: [] });
                }
            } else if (value.endsWith('FAM')) {
                currentFamilyId = tag;
                if (!families.has(currentFamilyId)) {
                    families.set(currentFamilyId, { id: currentFamilyId, childrenIds: [] });
                }
            }
        }

        if (currentPersonId) {
            const person = personsWithEvents.get(currentPersonId)!;
            if (level === 1) {
                if (tag === 'NAME') {
                    person.name = value.replace(/\//g, '').trim();
                } else if (tag === 'SEX') {
                    const g = value.trim().toUpperCase();
                    person.gender = g === 'F' ? 'Female' : g === 'M' ? 'Male' : 'Unknown';
                } else if (eventTags[tag] || tag === 'MARR') {
                    currentEventType = tag === 'MARR' ? 'Marriage' : eventTags[tag];
                    currentEventData = { dates: [], place: null };
                }
            } else if (level === 2 && currentEventData) {
                if (tag === 'DATE') {
                    currentEventData.dates.push(value);
                } else if (tag === 'PLAC') {
                    currentEventData.place = value.trim();
                }
            }
        } else if (currentFamilyId) {
            const family = families.get(currentFamilyId)!;
            if (level === 1) {
                family._isParsingMarriage = false; 
                
                if (tag === 'HUSB') family.husbandId = value;
                else if (tag === 'WIFE') family.wifeId = value;
                else if (tag === 'CHIL') family.childrenIds?.push(value);
                else if (tag === 'MARR') {
                    family.marriageEvent = { dates: [], place: null };
                    family._isParsingMarriage = true;
                }
            } else if (level === 2 && family._isParsingMarriage && family.marriageEvent) {
                if (tag === 'DATE') {
                    family.marriageEvent.dates.push(value);
                }
                else if (tag === 'PLAC') {
                    family.marriageEvent.place = value.trim();
                }
            }
        }
    }
    
    finalizeEvent(); 

  if (onProgress) onProgress('Finalizing relationships...', totalLines, totalLines);
  await new Promise(resolve => setTimeout(resolve, 0));

  // Process family marriages
  for (const family of families.values()) {
      if (family.marriageEvent?.place) {
          const placeName = family.marriageEvent.place;
          const combinedDate = combineDates(family.marriageEvent.dates);
          const husband = family.husbandId ? personsWithEvents.get(family.husbandId) : undefined;
          const wife = family.wifeId ? personsWithEvents.get(family.wifeId) : undefined;

          if (husband) husband.events = husband.events.filter(e => !(e.eventType === 'Marriage' && e.place === placeName));
          if (wife) wife.events = wife.events.filter(e => !(e.eventType === 'Marriage' && e.place === placeName));
          
          let placeEvents = placesWithEvents.get(placeName) || [];
          placeEvents = placeEvents.filter(e => !(e.eventType === 'Marriage' && (e.personName === husband?.name || e.personName === wife?.name)));
          
          if (husband) {
              placeEvents.push({ 
                  personId: husband.id, 
                  personName: husband.name, 
                  eventType: 'Marriage', 
                  date: combinedDate,
                  spouseId: wife?.id,
                  spouseName: wife?.name,
              });
          }
          if (wife) {
              placeEvents.push({ 
                  personId: wife.id, 
                  personName: wife.name, 
                  eventType: 'Marriage', 
                  date: combinedDate,
                  spouseId: husband?.id,
                  spouseName: husband?.name,
              });
          }
          placesWithEvents.set(placeName, placeEvents);

          const marriagePersonEvent: PersonEvent = { eventType: 'Marriage', date: combinedDate, place: placeName, sortYear: getYearFromDate(combinedDate) };
          if (husband) husband.events.push(marriagePersonEvent);
          if (wife) wife.events.push(marriagePersonEvent);
      }
  }

  // Add inferred events and establish family relationships
  for (const family of families.values()) {
    const husband = family.husbandId ? personsWithEvents.get(family.husbandId) : undefined;
    const wife = family.wifeId ? personsWithEvents.get(family.wifeId) : undefined;
    const parents = [husband, wife].filter((p): p is Person => !!p);

    if (husband && wife) {
      if (!husband.spouses) husband.spouses = [];
      if (!husband.spouses.some(s => s.id === wife.id)) {
        husband.spouses.push({ id: wife.id, name: wife.name });
      }

      if (!wife.spouses) wife.spouses = [];
      if (!wife.spouses.some(s => s.id === husband.id)) {
        wife.spouses.push({ id: husband.id, name: husband.name });
      }
    }

    if (family.childrenIds) {
        for (const childId of family.childrenIds) {
            const child = personsWithEvents.get(childId);
            if (!child) continue;

            for (const parent of parents) {
                if (!parent.children) parent.children = [];
                if (!parent.children.some(c => c.id === child.id)) {
                    parent.children.push({ id: child.id, name: child.name });
                }

                if (!child.parents) child.parents = [];
                if (!child.parents.some(p => p.id === parent.id)) {
                    child.parents.push({ id: parent.id, name: parent.name });
                }
            }

            const birthEvent = child.events.find(e => e.eventType === 'Birth');
            if (birthEvent) {
                for (const parent of parents) {
                    parent.events.push({
                        ...birthEvent,
                        eventType: `Birth of child (${child.name})`,
                        isInferred: true,
                    });
                }
            }

            for (const parent of parents) {
                const deathEvent = parent.events.find(e => e.eventType === 'Death');
                if (deathEvent) {
                    child.events.push({
                        ...deathEvent,
                        eventType: `Death of parent (${parent.name})`,
                        isInferred: true,
                    });
                }
            }
        }
    }
  }

  // Sort events
  for (const person of personsWithEvents.values()) {
    person.events.sort((a, b) => {
      if (a.eventType === 'Birth' && b.eventType !== 'Birth') return -1;
      if (b.eventType === 'Birth' && a.eventType !== 'Birth') return 1;

      const dateComparison = compareEventDates(a.date, b.date);
      if (dateComparison !== 0) {
        return dateComparison;
      }

      const getDatelessPriority = (eventType: string): number => {
          if (eventType === 'Residence') return 2;
          if (eventType === 'Death') return 3;
          return 1;
      };
      
      const priorityA = getDatelessPriority(a.eventType);
      const priorityB = getDatelessPriority(b.eventType);

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      return a.eventType.localeCompare(b.eventType);
    });
  }
  
  return { places: placesWithEvents, persons: personsWithEvents };
};