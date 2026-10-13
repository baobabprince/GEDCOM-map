/**
 * Client-side Gemini service communicating securely with server-side proxy routes.
 */

/**
 * Checks if the app is currently running in a static hosting environment
 * such as GitHub Pages (*.github.io) where server-side /api routes do not exist.
 */
export const isStaticHost = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.endsWith('github.io') || window.location.protocol === 'file:';
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

    if (!response.ok) {
      console.warn('Server geocoding API returned non-OK status:', response.status);
      return [];
    }

    const data = await response.json();
    if (data && Array.isArray(data.results)) {
      return data.results;
    }
    return [];
  } catch (error) {
    console.warn('Error fetching geocoding from server API:', error);
    return [];
  }
};

/**
 * Generates historical context for a person or place based on their timeline events in Hebrew.
 */
export const generateHistoricalContext = async (
  name: string,
  type: 'person' | 'place',
  eventsSummary: string
): Promise<string> => {
  if (isStaticHost()) {
    throw new Error('שירותי ההקשר ההיסטורי של Gemini דורשים שרת רקע פעיל ואינם זמינים באירוח סטטי של GitHub Pages. כל שאר יכולות המפה, הקואורדינטות והתובנות פועלות במלואן באופן עצמאי בדפדפן.');
  }

  const response = await fetch('/api/historical-context', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, type, eventsSummary }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Server error (${response.status})`);
  }

  const data = await response.json();
  return data.text || 'לא התקבל מידע היסטורי.';
};

/**
 * Handles a follow-up question about the historical context.
 */
export const chatHistoricalContext = async (
  name: string,
  type: 'person' | 'place',
  eventsSummary: string,
  history: { role: 'user' | 'model'; text: string }[],
  latestQuestion: string
): Promise<string> => {
  if (isStaticHost()) {
    throw new Error('שירותי Gemini דורשים שרת פעיל ואינם זמינים באירוח סטטי של GitHub Pages.');
  }

  const response = await fetch('/api/chat-context', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, type, eventsSummary, history, latestQuestion }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Server error (${response.status})`);
  }

  const data = await response.json();
  return data.text || 'לא התקבל מענה.';
};
