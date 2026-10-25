import { geocodeSinglePlace } from './nominatimService.ts';
import { geocodePlaces as geocodeWithServer, isStaticHost } from './geminiService.ts';
import { KNOWN_LOCATIONS_DATABASE, findKnownLocation } from './knownLocations.ts';
import { translations, type Language } from './i18n.ts';
import type { ProgressState } from '../types.ts';

const CACHE_KEY = 'gedcom_geocode_cache_v7';

/** Isolate cache per GEDCOM source file so trees don't mix pins. */
const cacheKeyFor = (fileScope?: string | null) =>
  fileScope && fileScope.trim()
    ? `${CACHE_KEY}::${fileScope.trim().toLowerCase()}`
    : CACHE_KEY;
const CLIENT_CONCURRENCY = 2;

export interface CachedLocation {
  lat: number;
  lon: number;
}

/**
 * Reads the geocode cache from localStorage, pre-populated with our instant known locations dictionary.
 */
export const getGeocodeCache = (fileScope?: string | null): Record<string, CachedLocation> => {
  try {
    const stored = localStorage.getItem(cacheKeyFor(fileScope));
    const parsed = stored ? JSON.parse(stored) : {};
    return { ...KNOWN_LOCATIONS_DATABASE, ...parsed };
  } catch (e) {
    console.warn('Error reading geocode cache from localStorage:', e);
    return { ...KNOWN_LOCATIONS_DATABASE };
  }
};

/**
 * Saves a specific geocoded location to the persistent localStorage cache.
 */
export const saveGeocodeToCache = (name: string, lat: number, lon: number, fileScope?: string | null) => {
  try {
    const key = cacheKeyFor(fileScope);
    const stored = localStorage.getItem(key);
    const cache = stored ? JSON.parse(stored) : {};
    cache[name] = { lat, lon };
    localStorage.setItem(key, JSON.stringify(cache));
  } catch (e) {
    console.warn('Error saving geocode to cache:', e);
  }
};

/**
 * Saves multiple geocoded locations to the persistent cache at once.
 */
export const saveMultipleGeocodesToCache = (results: { name: string; lat: number; lon: number }[], fileScope?: string | null) => {
  try {
    const key = cacheKeyFor(fileScope);
    const stored = localStorage.getItem(key);
    const cache = stored ? JSON.parse(stored) : {};
    for (const r of results) {
      cache[r.name] = { lat: r.lat, lon: r.lon };
    }
    localStorage.setItem(key, JSON.stringify(cache));
  } catch (e) {
    console.warn('Error saving batch geocodes to cache:', e);
  }
};

/**
 * Clears the persistent geocoding cache.
 */
export const clearGeocodeCache = (fileScope?: string | null) => {
  try {
    if (fileScope) {
      localStorage.removeItem(cacheKeyFor(fileScope));
    } else {
      localStorage.removeItem(CACHE_KEY);
      const prefix = CACHE_KEY + '::';
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) localStorage.removeItem(k);
      }
    }
    localStorage.removeItem('gedcom_geocode_cache_v1');
    localStorage.removeItem('gedcom_geocode_cache_v2');
    localStorage.removeItem('gedcom_geocode_cache_v4');
    localStorage.removeItem('gedcom_geocode_cache_v5');
    localStorage.removeItem('gedcom_geocode_cache_v6');
    localStorage.removeItem('gedcom_geocode_cache_v7');
  } catch (e) {
    console.warn('Error clearing geocode cache:', e);
  }
};

const getActiveTranslation = () => {
  try {
    const saved = localStorage.getItem('gedcom_visualizer_lang') as Language | null;
    if (saved === 'en' || saved === 'he') return translations[saved];
  } catch {
    // ignore
  }
  return translations.he;
};

/**
 * High-speed geocoding engine:
 * 1. Instant 0ms lookup from built-in knowledge base (countries, capitals, common hubs).
 * 2. Instant localStorage cache lookup.
 * 3. Fast server-side proxy route (/api/geocode) if available with short timeout.
 * 4. High-concurrency client-side parallel workers (Open-Meteo on Pages; Photon+Nominatim when CORS allows).
 */
export const geocode = async (
  placeNames: string[],
  onProgress?: (progress: ProgressState) => void,
  onBatchResolved?: (resolved: { name: string; lat: number; lon: number }[]) => void,
  fileScope?: string | null
): Promise<{ name: string; lat: number; lon: number }[]> => {
  const totalPlaces = placeNames.length;
  if (totalPlaces === 0) return [];
  const t = getActiveTranslation();

  if (onProgress) {
    onProgress({ step: t.geocodeLoadingCache, current: 0, total: totalPlaces });
  }

  const cache = getGeocodeCache(fileScope);
  const cachedResults: { name: string; lat: number; lon: number }[] = [];
  const uncachedNames: string[] = [];

  // Step 1: Check cache and dictionary (instant 0ms)
  const newlyDiscoveredFromDictionary: { name: string; lat: number; lon: number }[] = [];
  for (const name of placeNames) {
    if (cache[name]) {
      cachedResults.push({ name, lat: cache[name].lat, lon: cache[name].lon });
    } else {
      // Check if normalized dictionary matches
      const known = findKnownLocation(name);
      if (known) {
        const item = { name, lat: known.lat, lon: known.lon };
        cachedResults.push(item);
        newlyDiscoveredFromDictionary.push(item);
      } else {
        uncachedNames.push(name);
      }
    }
  }

  if (newlyDiscoveredFromDictionary.length > 0) {
    saveMultipleGeocodesToCache(newlyDiscoveredFromDictionary, fileScope);
  }

  // If initial cache results were found, stream them to the map immediately!
  if (cachedResults.length > 0 && onBatchResolved) {
    onBatchResolved(cachedResults);
  }

  // If all places are resolved from dictionary/cache, finish immediately!
  if (uncachedNames.length === 0) {
    if (onProgress) {
      onProgress({
        step: t.geocodeAllFoundInstant(totalPlaces),
        current: totalPlaces,
        total: totalPlaces,
      });
    }
    return cachedResults;
  }

  const resolvedMap = new Map<string, { name: string; lat: number; lon: number }>();
  cachedResults.forEach(r => resolvedMap.set(r.name, r));

  const remainingToResolve: string[] = [...uncachedNames];

  // Step 2: Try Server API in fast chunks of 25 (if not in a purely static environment like GitHub Pages)
  let isServerWorking = !isStaticHost();
  const SERVER_CHUNK_SIZE = 25;

  for (let i = 0; i < remainingToResolve.length; i += SERVER_CHUNK_SIZE) {
    if (!isServerWorking) break;

    const chunk = remainingToResolve.slice(i, i + SERVER_CHUNK_SIZE);
    if (onProgress) {
      onProgress({
        step: t.geocodeServerBatch(Math.floor(i / SERVER_CHUNK_SIZE) + 1),
        current: resolvedMap.size,
        total: totalPlaces,
      });
    }

    try {
      // Strict timeout wrapper for server call
      const serverPromise = geocodeWithServer(chunk);
      const timeoutPromise = new Promise<{ name: string; lat: number; lon: number }[]>((_, reject) =>
        setTimeout(() => reject(new Error('Server timeout')), 3500)
      );

      const serverResults = await Promise.race([serverPromise, timeoutPromise]);
      if (Array.isArray(serverResults) && serverResults.length > 0) {
        saveMultipleGeocodesToCache(serverResults, fileScope);
        for (const item of serverResults) {
          resolvedMap.set(item.name, item);
        }
        if (onBatchResolved) {
          onBatchResolved(serverResults);
        }
      } else if (serverResults.length === 0 && i === 0) {
        // First batch returned empty (e.g. 404 on GitHub Pages or no server)
        isServerWorking = false;
        break;
      }
    } catch {
      // Server not reachable or 404 (e.g., GitHub Pages)
      isServerWorking = false;
      break;
    }
  }

  // Step 3: Fast concurrent client-side worker pool for any remaining unresolved places
  const unresolvedForClient = remainingToResolve.filter(name => !resolvedMap.has(name));

  if (unresolvedForClient.length > 0) {
    let nextIndex = 0;
    let completedCount = 0;
    const clientBatchBuffer: { name: string; lat: number; lon: number }[] = [];

    const worker = async () => {
      while (nextIndex < unresolvedForClient.length) {
        const currentIndex = nextIndex++;
        const name = unresolvedForClient[currentIndex];

        try {
          const res = await geocodeSinglePlace(name);
          if (res) {
            resolvedMap.set(name, res);
            clientBatchBuffer.push(res);
            saveGeocodeToCache(res.name, res.lat, res.lon, fileScope);

            // Stream resolved places in real-time batches of 2 or immediately
            if (clientBatchBuffer.length >= 2) {
              const toEmit = [...clientBatchBuffer];
              clientBatchBuffer.length = 0;
              if (onBatchResolved) {
                onBatchResolved(toEmit);
              }
            }
          }
        } catch (err) {
          console.warn(`Geocoding error for ${name}:`, err);
        }

        completedCount++;
        if (onProgress) {
          onProgress({
            step: t.geocodeClientFast(name, resolvedMap.size, totalPlaces),
            current: resolvedMap.size,
            total: totalPlaces,
          });
        }
      }
    };

    // Run parallel workers simultaneously
    const workerCount = Math.min(CLIENT_CONCURRENCY, unresolvedForClient.length);
    await Promise.all(Array.from({ length: workerCount }, () => worker()));

    // Flush any remaining buffered places
    if (clientBatchBuffer.length > 0 && onBatchResolved) {
      onBatchResolved(clientBatchBuffer);
      saveMultipleGeocodesToCache(clientBatchBuffer, fileScope);
    }
  }

  if (onProgress) {
    onProgress({
      step: t.geocodeComplete(resolvedMap.size, totalPlaces),
      current: totalPlaces,
      total: totalPlaces,
    });
  }

  return Array.from(resolvedMap.values());
};
