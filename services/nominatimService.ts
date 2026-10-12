
/**
 * Geocodes a single place name using the Nominatim API.
 * @param placeName The name of the place to geocode.
 * @returns A promise that resolves to a geocoded location object or null if not found.
 */
export const geocodeSinglePlace = async (placeName: string): Promise<{ name: string; lat: number; lon: number } | null> => {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(placeName)}&format=json&limit=1`, {
        headers: {
            // Nominatim API usage policy requires a custom User-Agent.
            'User-Agent': 'GEDCOM-Map-Visualizer/1.0 (https://web.dev/)'
        }
    });

    if (!response.ok) {
      console.warn(`Nominatim API request failed for "${placeName}" with status: ${response.status}`);
      return null;
    }
    const data = await response.json();
    
    if (data && data.length > 0) {
      const result = data[0];
      const lat = parseFloat(result.lat);
      const lon = parseFloat(result.lon);
      return { name: placeName, lat: lat, lon: lon };
    }
    return null;
  } catch (error) {
    console.error(`Error fetching from Nominatim API for "${placeName}":`, error);
    return null;
  }
};