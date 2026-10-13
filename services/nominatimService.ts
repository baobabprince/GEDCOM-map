import { findKnownLocation } from './knownLocations.ts';

/**
 * Helper to fetch with a strict timeout so slow external endpoints never block execution.
 */
const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeoutMs = 2800): Promise<Response> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
};

/**
 * Extracts candidate search strings for a location name, ordered from most specific to broader:
 * e.g. "The Rookery, Ottery St Catchpole, Devon, England"
 * -> ["The Rookery, Ottery St Catchpole, Devon, England", "Ottery St Catchpole, Devon, England", "Devon, England"]
 */
export const getGeocodingCandidates = (placeName: string): string[] => {
  const trimmed = placeName.trim();
  if (!trimmed) return [];

  const candidates: string[] = [trimmed];

  // Remove parentheses or brackets e.g. "London (UK)" -> "London, UK"
  const cleanedBrackets = trimmed.replace(/\((.*?)\)/g, ', $1').replace(/\[(.*?)\]/g, ', $1').replace(/\s+/g, ' ').trim();
  if (cleanedBrackets !== trimmed && cleanedBrackets) {
    candidates.push(cleanedBrackets);
  }

  // Remove prefix labels like "Near", "At", "St.", "Cemetery", etc.
  const withoutPrefix = trimmed.replace(/^(near|at|near to|church of|cemetery in)\s+/i, '').trim();
  if (withoutPrefix && withoutPrefix !== trimmed) {
    candidates.push(withoutPrefix);
  }

  // Comma split
  const parts = trimmed.split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length > 1) {
    // Drop first segment (often specific house/estate/cemetery)
    candidates.push(parts.slice(1).join(', '));

    // First and last segment (e.g. City, Country)
    if (parts.length > 2) {
      candidates.push(`${parts[0]}, ${parts[parts.length - 1]}`);
    }

    // Try just city if longer than 3 chars
    if (parts[0].length >= 3) {
      candidates.push(parts[0]);
    }
  }

  // Deduplicate while preserving priority order
  return Array.from(new Set(candidates)).filter(c => c.length > 1);
};

/**
 * High-speed single place geocoder.
 * 1. Checks instant knowledge base (0ms).
 * 2. Tries Photon (Komoot OSM) with timeout.
 * 3. Tries Open-Meteo Geocoding API with candidates.
 * 4. Nominatim as fallback.
 */
export const geocodeSinglePlace = async (
  placeName: string
): Promise<{ name: string; lat: number; lon: number } | null> => {
  const trimmed = placeName.trim();
  if (!trimmed) return null;

  // 1. Instant dictionary lookup (0ms)
  const known = findKnownLocation(trimmed);
  if (known) {
    return { name: placeName, lat: known.lat, lon: known.lon };
  }

  const candidates = getGeocodingCandidates(trimmed);

  // 2. Try Photon (Komoot/OSM) - very fast, CORS enabled, no 1-sec rate limit
  for (const query of candidates.slice(0, 2)) {
    try {
      const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1`;
      const photonRes = await fetchWithTimeout(photonUrl, {
        headers: {
          'Accept': 'application/json',
        },
      }, 2500);

      if (photonRes.ok) {
        const photonData = await photonRes.json();
        if (photonData?.features?.[0]?.geometry?.coordinates) {
          const [lon, lat] = photonData.features[0].geometry.coordinates;
          if (typeof lat === 'number' && typeof lon === 'number' && !isNaN(lat) && !isNaN(lon)) {
            return { name: placeName, lat: Number(lat.toFixed(5)), lon: Number(lon.toFixed(5)) };
          }
        }
      }
    } catch {
      // Continue to next candidate or provider
    }
  }

  // 3. Try Open-Meteo Geocoding API - fast, free, no API key, CORS enabled
  for (const query of candidates) {
    try {
      const meteoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;
      const meteoRes = await fetchWithTimeout(meteoUrl, {}, 2500);

      if (meteoRes.ok) {
        const meteoData = await meteoRes.json();
        if (meteoData?.results?.[0]) {
          const { latitude, longitude } = meteoData.results[0];
          if (typeof latitude === 'number' && typeof longitude === 'number' && !isNaN(latitude) && !isNaN(longitude)) {
            return { name: placeName, lat: Number(latitude.toFixed(5)), lon: Number(longitude.toFixed(5)) };
          }
        }
      }
    } catch {
      // Continue
    }
  }

  // 4. Fallback to OpenStreetMap Nominatim for the primary query
  try {
    const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(candidates[0] || trimmed)}&format=json&limit=1`;
    const response = await fetchWithTimeout(nomUrl, {
      headers: {
        'User-Agent': 'GEDCOM-Map-Visualizer/2.0 (Genealogy Research Tool)',
        'Accept': 'application/json',
      },
    }, 3000);

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        if (!isNaN(lat) && !isNaN(lon)) {
          return { name: placeName, lat: Number(lat.toFixed(5)), lon: Number(lon.toFixed(5)) };
        }
      }
    }
  } catch {
    // Safely ignore
  }

  return null;
};