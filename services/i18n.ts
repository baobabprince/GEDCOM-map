import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'he' | 'en';

const LANG_STORAGE_KEY = 'gedcom_visualizer_lang';

const EVENT_TYPE_MAP: Record<string, { he: string; en: string }> = {
  Birth: { he: 'לידה', en: 'Birth' },
  Death: { he: 'פטירה', en: 'Death' },
  Marriage: { he: 'נישואין', en: 'Marriage' },
  Divorce: { he: 'גירושין', en: 'Divorce' },
  Baptism: { he: 'טבילה', en: 'Baptism' },
  Christening: { he: 'הטבלה', en: 'Christening' },
  Adoption: { he: 'אימוץ', en: 'Adoption' },
  Residence: { he: 'מגורים', en: 'Residence' },
  Emigration: { he: 'הגירה (יציאה)', en: 'Emigration' },
  Immigration: { he: 'עלייה / הגירה', en: 'Immigration' },
  Census: { he: 'מפקד אוכלוסין', en: 'Census' },
  Event: { he: 'אירוע', en: 'Event' },
  Burial: { he: 'קבורה', en: 'Burial' },
  Occupation: { he: 'עיסוק', en: 'Occupation' },
  Education: { he: 'לימודים', en: 'Education' },
  Naturalization: { he: 'התאזרחות', en: 'Naturalization' },
  Graduation: { he: 'סיום לימודים', en: 'Graduation' },
  Retirement: { he: 'פרישה', en: 'Retirement' },
  Probate: { he: 'צוואות ועיזבון', en: 'Probate' },
  Will: { he: 'צוואה', en: 'Will' },
  'Bar Mitzvah': { he: 'בר מצווה', en: 'Bar Mitzvah' },
  'Bat Mitzvah': { he: 'בת מצווה', en: 'Bat Mitzvah' },
  Blessing: { he: 'ברכה', en: 'Blessing' },
  Confirmation: { he: 'אישור דתי', en: 'Confirmation' },
  'First Communion': { he: 'סעודה ראשונה', en: 'First Communion' },
  Ordination: { he: 'הסמכה', en: 'Ordination' },
  // Raw GEDCOM tag fallbacks
  BIRT: { he: 'לידה', en: 'Birth' },
  DEAT: { he: 'פטירה', en: 'Death' },
  MARR: { he: 'נישואין', en: 'Marriage' },
  DIV: { he: 'גירושין', en: 'Divorce' },
  BAPM: { he: 'טבילה', en: 'Baptism' },
  CHR: { he: 'הטבלה', en: 'Christening' },
  ADOP: { he: 'אימוץ', en: 'Adoption' },
  RESI: { he: 'מגורים', en: 'Residence' },
  EMIG: { he: 'הגירה (יציאה)', en: 'Emigration' },
  IMMI: { he: 'עלייה / הגירה', en: 'Immigration' },
  CENS: { he: 'מפקד אוכלוסין', en: 'Census' },
  EVEN: { he: 'אירוע', en: 'Event' },
  BURI: { he: 'קבורה', en: 'Burial' },
  OCCU: { he: 'עיסוק', en: 'Occupation' },
  EDUC: { he: 'לימודים', en: 'Education' },
  // Reverse lookup support if already Hebrew
  'נישואין': { he: 'נישואין', en: 'Marriage' },
  'חתונה': { he: 'נישואין', en: 'Marriage' },
  'לידה': { he: 'לידה', en: 'Birth' },
  'פטירה': { he: 'פטירה', en: 'Death' },
  'הטבלה': { he: 'הטבלה', en: 'Baptism' },
};

/**
 * Translates any canonical or inferred eventType into the requested UI language.
 */
export const formatEventType = (eventType: string | null | undefined, lang: Language = 'he'): string => {
  if (!eventType) return '';
  const trimmed = eventType.trim();

  // Direct match
  if (EVENT_TYPE_MAP[trimmed]) {
    return EVENT_TYPE_MAP[trimmed][lang];
  }

  // Case-insensitive match
  const foundKey = Object.keys(EVENT_TYPE_MAP).find(
    k => k.toLowerCase() === trimmed.toLowerCase()
  );
  if (foundKey) {
    return EVENT_TYPE_MAP[foundKey][lang];
  }

  // Inferred event: "Birth of child (Name)"
  const birthChildMatch = trimmed.match(/^Birth of child \((.+)\)$/i);
  if (birthChildMatch) {
    return lang === 'he'
      ? `לידת ילד/ה (${birthChildMatch[1]})`
      : `Birth of child (${birthChildMatch[1]})`;
  }
  const hebrewBirthChildMatch = trimmed.match(/^לידת ילד(?:\/ה)? \((.+)\)$/);
  if (hebrewBirthChildMatch) {
    return lang === 'he'
      ? `לידת ילד/ה (${hebrewBirthChildMatch[1]})`
      : `Birth of child (${hebrewBirthChildMatch[1]})`;
  }

  // Inferred event: "Death of parent (Name)"
  const deathParentMatch = trimmed.match(/^Death of parent \((.+)\)$/i);
  if (deathParentMatch) {
    return lang === 'he'
      ? `פטירת הורה (${deathParentMatch[1]})`
      : `Death of parent (${deathParentMatch[1]})`;
  }
  const hebrewDeathParentMatch = trimmed.match(/^פטירת הורה \((.+)\)$/);
  if (hebrewDeathParentMatch) {
    return lang === 'he'
      ? `פטירת הורה (${hebrewDeathParentMatch[1]})`
      : `Death of parent (${hebrewDeathParentMatch[1]})`;
  }

  return trimmed;
};

export const translations = {
  he: {
    appTitle: 'ממפה שורשים GEDCOM',
    appSubtitle: 'מיפוי אינטראקטיבי של היסטוריה משפחתית',
    welcomeTitle: 'ברוכים הבאים לממפה השורשים!',
    welcomeSubtitle: 'העלה קובץ GEDCOM או התנסה בנתוני הדוגמה כדי לצפות במסע המשפחתי על גבי המפה.',
    uploadGedcom: 'העלאת קובץ GEDCOM',
    dragAndDropHint: 'או גרור ושחרר קובץ לכאן (.ged)',
    invalidFileError: 'נא להעלות קובץ GEDCOM תקין (.ged או .gedcom).',
    orSeparator: 'או',
    trySampleData: 'התנסות עם נתוני דוגמה',
    clearSavedLocationsCache: 'ניקוי מטמון מיקומים שמורים',
    clearGeocodingCache: 'ניקוי מטמון קואורדינטות',
    uploadNewFile: 'העלאת קובץ חדש',
    exportWithCoords: 'ייצוא GEDCOM עם קואורדינטות',
    cannotExportError: 'לא ניתן לייצא. הקובץ המקורי אינו זמין.',
    startOver: 'התחל מחדש',
    processingTitle: 'מעבד נתונים...',
    parsingGedcomStep: 'מפענח קובץ GEDCOM...',
    parsingLinesStep: 'קורא רשומות מהקובץ...',
    finalizingRelationshipsStep: 'ממפה קשרי משפחה ואירועים...',
    analyzingFamilyDataStep: 'מנתח נתונים משפחתיים...',
    errorTitle: 'אירעה שגיאה',
    noDataError: 'לא נמצאו אנשים או מיקומים בקובץ ה-GEDCOM.',
    unknownError: 'אירעה שגיאה בלתי צפויה בעיבוד הקובץ.',
    // Tabs
    tabMap: 'מפת אירועים',
    tabMapShort: 'מפה',
    tabInsights: 'תובנות דמוגרפיות',
    tabInsightsShort: 'דמוגרפיה',
    // Filters & Search
    filtersTitle: 'סינון אירועים ותאריכים',
    eventTypesTitle: 'סוגי אירועים',
    dateRangeTitle: 'טווח שנים',
    resetFilters: 'איפוס סינון',
    searchPlaceholder: 'חיפוש אנשים או מיקומים...',
    clearSearch: 'נקה חיפוש',
    // View Modes & Lists
    byLocation: 'לפי מיקום',
    byPerson: 'לפי אדם',
    mappedLocations: 'מיקומים ממופים',
    unmappedLocations: 'מיקומים ללא קואורדינטות',
    unmappedExplanation: 'לא נמצאו קואורדינטות אוטומטיות עבור מיקומים אלו. ניתן למקם אותם ידנית על המפה.',
    personsCount: 'אנשים בעץ',
    eventsCount: (count: number) => count === 1 ? 'אירוע אחד' : `${count} אירועים`,
    noLocationsMatch: 'לא נמצאו מיקומים התואמים את הסינון הנוכחי.',
    noPeopleMatch: 'לא נמצאו אנשים התואמים את הסינון הנוכחי.',
    // Person & Location Details
    timelineTitle: 'ציר זמן ואירועים',
    ageAtEvent: (age: number) => `גיל: ${age}`,
    locationNotOnMap: 'המיקום אינו מופיע על המפה',
    addPinToMap: 'הוסף סיכה למפה',
    noEventsForPerson: 'לא נמצאו אירועים עבור אדם זה.',
    eventsAtLocation: 'אירועים שהתרחשו במיקום זה',
    noEventsForLocation: 'לא נמצאו אירועים במיקום זה.',
    spousesLabel: 'בני זוג:',
    couplePopupLabel: 'חתן וכלה / בני זוג:',
    forPersonLabel: 'עבור:',
    // Map Display
    mapLayersButtonTitle: 'שכבות וסגנון מפה',
    mapLayerMenuHeader: 'סגנון שכבת מפה:',
    layerOsm: 'פירוט רחובות (OpenStreetMap)',
    layerEsriTopo: 'מפה טופוגרפית (Esri Topo)',
    layerSatellite: 'תצלומי לוויין (Esri Imagery)',
    layerVoyager: 'מפה מעודנת (CARTO Voyager)',
    pinDropBanner: (placeName: string) => `לחץ על נקודה במפה כדי למקם סיכה עבור "${placeName}"`,
    cancelButton: 'ביטול',
    startPoint: '🟢 נקודת התחלה',
    endPoint: '🔴 נקודה אחרונה',
    waypoint: (index: number) => `נקודת ציון ${index}`,
    eventsForPersonPopup: (name: string) => `אירועים עבור ${name}`,
    eventsHereHeader: 'אירועים שהתרחשו כאן:',
    dragPinHint: 'גרור את הסיכה כדי לעדכן את המיקום במפה',
    // Geocoding progress
    geocodeLoadingCache: 'טוען מיקומים ממסד נתונים פנימי ומטמון מקומי...',
    geocodeAllFoundInstant: (total: number) => `כל ${total} המיקומים נמצאו באופן מיידי!`,
    geocodeServerBatch: (batchNum: number) => `מאתר קואורדינטות בשרת (קבוצה ${batchNum})...`,
    geocodeClientFast: (name: string, current: number, total: number) => `מאתר קואורדינטות: ${name} (${current}/${total})`,
    geocodeComplete: (resolved: number, total: number) => `הושלם! נמצאו ${resolved} מתוך ${total} מיקומים.`,
  },
  en: {
    appTitle: 'GEDCOM Visualizer',
    appSubtitle: 'Interactive family history mapping',
    welcomeTitle: 'Welcome to GEDCOM Visualizer!',
    welcomeSubtitle: 'Upload a GEDCOM file or try sample data to explore your family journey on the map.',
    uploadGedcom: 'Upload GEDCOM File',
    dragAndDropHint: 'or drag and drop a file here (.ged)',
    invalidFileError: 'Please upload a valid GEDCOM (.ged or .gedcom) file.',
    orSeparator: 'OR',
    trySampleData: 'Try with Sample Data',
    clearSavedLocationsCache: 'Clear Cache of Saved Locations',
    clearGeocodingCache: 'Clear Geocoding Cache',
    uploadNewFile: 'Upload New File',
    exportWithCoords: 'Export with Coordinates',
    cannotExportError: 'Cannot export. Original file not available.',
    startOver: 'Start Over',
    processingTitle: 'Processing...',
    parsingGedcomStep: 'Parsing GEDCOM file...',
    parsingLinesStep: 'Reading records...',
    finalizingRelationshipsStep: 'Mapping family relationships and events...',
    analyzingFamilyDataStep: 'Analyzing family data...',
    errorTitle: 'An Error Occurred',
    noDataError: 'No people or places found in the GEDCOM file.',
    unknownError: 'An unexpected error occurred while processing the file.',
    // Tabs
    tabMap: 'Event Map',
    tabMapShort: 'Map',
    tabInsights: 'Demographic Insights',
    tabInsightsShort: 'Insights',
    // Filters & Search
    filtersTitle: 'Event & Date Filters',
    eventTypesTitle: 'Event Types',
    dateRangeTitle: 'Year Range',
    resetFilters: 'Reset Filters',
    searchPlaceholder: 'Search persons or locations...',
    clearSearch: 'Clear search',
    // View Modes & Lists
    byLocation: 'By Location',
    byPerson: 'By Person',
    mappedLocations: 'Mapped Locations',
    unmappedLocations: 'Unmapped Locations',
    unmappedExplanation: 'These places could not be automatically geocoded. You can place them manually on the map.',
    personsCount: 'Persons',
    eventsCount: (count: number) => count === 1 ? '1 event' : `${count} events`,
    noLocationsMatch: 'No locations match the current filters.',
    noPeopleMatch: 'No people match the current filters.',
    // Person & Location Details
    timelineTitle: 'Timeline & Events',
    ageAtEvent: (age: number) => `Age: ${age}`,
    locationNotOnMap: 'Location not on map',
    addPinToMap: 'Add Pin to Map',
    noEventsForPerson: 'No events found for this person.',
    eventsAtLocation: 'Events at this Location',
    noEventsForLocation: 'No events found for this location.',
    spousesLabel: 'Spouses:',
    couplePopupLabel: 'Couple / Spouses:',
    forPersonLabel: 'For:',
    // Map Display
    mapLayersButtonTitle: 'Map Layers & Style',
    mapLayerMenuHeader: 'Map Layer Style:',
    layerOsm: 'Street Detail (OpenStreetMap)',
    layerEsriTopo: 'Topographic Map (Esri Topo)',
    layerSatellite: 'Satellite Imagery (Esri Imagery)',
    layerVoyager: 'Refined Map (CARTO Voyager)',
    pinDropBanner: (placeName: string) => `Click on the map to place a pin for "${placeName}"`,
    cancelButton: 'Cancel',
    startPoint: '🟢 Start Point',
    endPoint: '🔴 Last Point',
    waypoint: (index: number) => `Waypoint ${index}`,
    eventsForPersonPopup: (name: string) => `Events for ${name}`,
    eventsHereHeader: 'Events at this location:',
    dragPinHint: 'Drag the pin to update its location on the map',
    // Geocoding progress
    geocodeLoadingCache: 'Loading locations from built-in database & local cache...',
    geocodeAllFoundInstant: (total: number) => `All ${total} locations found instantly!`,
    geocodeServerBatch: (batchNum: number) => `Geocoding via server (Batch ${batchNum})...`,
    geocodeClientFast: (name: string, current: number, total: number) => `Geocoding: ${name} (${current}/${total})`,
    geocodeComplete: (resolved: number, total: number) => `Complete! Found ${resolved} of ${total} locations.`,
  }
};

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: typeof translations['he'];
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'he',
  setLang: () => {},
  toggleLang: () => {},
  t: translations.he,
  isRTL: true,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(LANG_STORAGE_KEY);
      if (saved === 'en' || saved === 'he') return saved;
    } catch {
      // ignore localStorage errors
    }
    return 'he';
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, newLang);
    } catch {
      // ignore
    }
  };

  const toggleLang = () => {
    setLang(lang === 'he' ? 'en' : 'he');
  };

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
  }, [lang]);

  const value: LanguageContextType = {
    lang,
    setLang,
    toggleLang,
    t: translations[lang],
    isRTL: lang === 'he',
  };

  return React.createElement(LanguageContext.Provider, { value }, children);
};

export const useLanguage = () => useContext(LanguageContext);
