
/**
 * Geocodes a single place name using the Nominatim API.
 * @param placeName The name of the place to geocode.
 * @returns A promise that resolves to a geocoded location object or null if not found.
 */
export const geocodeSinglePlace = async (placeName: string): Promise<{ name: string; lat: number; lon: number } | null> => {
  // 1. Try Photon (Komoot/OSM) - fast, CORS-enabled, reliable for static hosting like GitHub Pages
  try {
    const photonRes = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(placeName)}&limit=1`);
    if (photonRes.ok) {
      const photonData = await photonRes.json();
      if (photonData?.features?.[0]?.geometry?.coordinates) {
        const [lon, lat] = photonData.features[0].geometry.coordinates;
        return { name: placeName, lat: Number(lat), lon: Number(lon) };
      }
    }
  } catch {
    // Continue to Nominatim fallback
  }

  // 2. Fallback to OpenStreetMap Nominatim
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(placeName)}&format=json&limit=1`, {
      headers: {
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
      return { name: placeName, lat, lon };
    }
    return null;
  } catch (error) {
    console.error(`Error fetching from Nominatim API for "${placeName}":`, error);
    return null;
  }
};