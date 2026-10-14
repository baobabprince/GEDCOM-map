import type { Language } from './i18n.ts';

/**
 * Client-side Gemini service communicating securely with server-side proxy routes.
 */

let staticHostDetected: boolean | null = null;

/**
 * Checks if the app is currently running in a static hosting environment
 * such as GitHub Pages (*.github.io, custom domains, file:, etc.) where server-side /api routes do not exist.
 */
export const isStaticHost = (): boolean => {
  if (staticHostDetected !== null) return staticHostDetected;
  if (typeof window === 'undefined') return false;

  const hostname = window.location.hostname.toLowerCase();
  const protocol = window.location.protocol;
  const port = window.location.port;

  // Known static host signatures
  if (
    hostname.endsWith('github.io') ||
    hostname.includes('github.io') ||
    hostname.endsWith('pages.dev') ||
    hostname.endsWith('netlify.app') ||
    hostname.endsWith('vercel.app') ||
    protocol === 'file:' ||
    port === '4173'
  ) {
    staticHostDetected = true;
    return true;
  }

  return false;
};

/**
 * Mark this session as a static host (e.g. after receiving a 404 on an API route)
 */
export const markAsStaticHost = () => {
  staticHostDetected = true;
};

/**
 * Geocodes a list of place names using the server-side Gemini API.
 * In a static host (like GitHub Pages), skips the server request to avoid 404 errors.
 * @param placeNames An array of strings representing geographical locations.
 * @returns A promise that resolves to an array of geocoded location objects.
 */
export const geocodePlaces = async (
  placeNames: string[]
): Promise<{ name: string; lat: number; lon: number }[]> => {
  if (placeNames.length === 0 || isStaticHost()) {
    return [];
  }

  try {
    const response = await fetch('/api/geocode', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ places: placeNames }),
    });

    if (response.status === 404) {
      // Backend does not exist; mark environment as static to prevent future calls
      markAsStaticHost();
      return [];
    }

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    if (data && Array.isArray(data.results)) {
      return data.results;
    }
    return [];
  } catch {
    markAsStaticHost();
    return [];
  }
};

/**
 * Generates historical context for a person or place based on their timeline events in the selected UI language.
 */
export const generateHistoricalContext = async (
  name: string,
  type: 'person' | 'place',
  eventsSummary: string,
  lang: Language = 'he'
): Promise<string> => {
  const staticErr = lang === 'he'
    ? 'שירותי ההקשר ההיסטורי של Gemini דורשים שרת רקע פעיל ואינם זמינים באירוח סטטי של GitHub Pages. כל שאר יכולות המפה, הקואורדינטות והתובנות פועלות במלואן באופן עצמאי בדפדפן.'
    : 'Gemini historical context services require an active backend server and are unavailable on static GitHub Pages hosting. All map, geocoding, and demographic insights features work fully in the browser.';

  if (isStaticHost()) {
    throw new Error(staticErr);
  }

  const response = await fetch('/api/historical-context', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, type, eventsSummary, lang }),
  });

  if (response.status === 404) {
    markAsStaticHost();
    throw new Error(staticErr);
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Server error (${response.status})`);
  }

  const data = await response.json();
  return data.text || (lang === 'he' ? 'לא התקבל מידע היסטורי.' : 'No historical context received.');
};

/**
 * Handles a follow-up question about the historical context.
 */
export const chatHistoricalContext = async (
  name: string,
  type: 'person' | 'place',
  eventsSummary: string,
  history: { role: 'user' | 'model'; text: string }[],
  latestQuestion: string,
  lang: Language = 'he'
): Promise<string> => {
  const staticErr = lang === 'he'
    ? 'שירותי Gemini דורשים שרת פעיל ואינם זמינים באירוח סטטי של GitHub Pages.'
    : 'Gemini services require an active backend server and are unavailable on static GitHub Pages hosting.';

  if (isStaticHost()) {
    throw new Error(staticErr);
  }

  const response = await fetch('/api/chat-context', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, type, eventsSummary, history, latestQuestion, lang }),
  });

  if (response.status === 404) {
    markAsStaticHost();
    throw new Error(staticErr);
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Server error (${response.status})`);
  }

  const data = await response.json();
  return data.text || (lang === 'he' ? 'לא התקבל מענה.' : 'No response received.');
};
