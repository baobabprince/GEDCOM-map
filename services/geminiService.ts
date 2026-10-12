/**
 * Client-side Gemini service communicating securely with server-side proxy routes.
 */

/**
 * Geocodes a list of place names using the server-side Gemini API.
 * @param placeNames An array of strings representing geographical locations.
 * @returns A promise that resolves to an array of geocoded location objects.
 */
export const geocodePlaces = async (
  placeNames: string[]
): Promise<{ name: string; lat: number; lon: number }[]> => {
  if (placeNames.length === 0) {
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
