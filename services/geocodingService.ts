
import { geocodeSinglePlace } from './nominatimService.ts';
import { geocodePlaces as geocodeWithGemini } from './geminiService.ts';
import type { ProgressState } from '../types.ts';

const GEMINI_BATCH_SIZE = 100;
const CACHE_KEY = 'gedcom_geocode_cache_v1';

// Helper to add delay, respecting Nominatim's usage policy (max 1 req/sec).
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export interface CachedLocation {
    lat: number;
    lon: number;
}

const DEFAULT_KNOWN_LOCATIONS: Record<string, CachedLocation> = {
    'Salt Lake City, Utah, USA': { lat: 40.7608, lon: -111.8910 },
    'Provo, Utah, USA': { lat: 40.2338, lon: -111.6585 },
    'London, England': { lat: 51.5074, lon: -0.1278 },
    'Oxford, Oxfordshire, England': { lat: 51.7520, lon: -1.2577 },
    'New Forest, Hampshire, England': { lat: 50.8652, lon: -1.5647 },
    'Jerusalem, Israel': { lat: 31.7683, lon: 35.2137 },
    'Tel Aviv, Israel': { lat: 32.0853, lon: 34.7818 },
    'New York, NY, USA': { lat: 40.7128, lon: -74.0060 },
    'Paris, France': { lat: 48.8566, lon: 2.3522 },
    'Berlin, Germany': { lat: 52.5200, lon: 13.4050 },
    'Warsaw, Poland': { lat: 52.2297, lon: 21.0122 },
};

/**
 * Reads the geocode cache from localStorage.
 */
export const getGeocodeCache = (): Record<string, CachedLocation> => {
    try {
        const stored = localStorage.getItem(CACHE_KEY);
        const parsed = stored ? JSON.parse(stored) : {};
        return { ...DEFAULT_KNOWN_LOCATIONS, ...parsed };
    } catch (e) {
        console.error('Error reading geocode cache from localStorage:', e);
        return { ...DEFAULT_KNOWN_LOCATIONS };
    }
};

/**
 * Saves a specific geocoded location to the persistent localStorage cache.
 */
export const saveGeocodeToCache = (name: string, lat: number, lon: number) => {
    try {
        const cache = getGeocodeCache();
        cache[name] = { lat, lon };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
        console.error('Error saving geocode to cache:', e);
    }
};

/**
 * Clears the persistent geocoding cache.
 */
export const clearGeocodeCache = () => {
    try {
        localStorage.removeItem(CACHE_KEY);
    } catch (e) {
        console.error('Error clearing geocode cache:', e);
    }
};

/**
 * Geocodes places efficiently by using a persistent localStorage cache first,
 * then Gemini AI for large batches, and finally Nominatim for manual fallbacks.
 * 
 * @param placeNames An array of place names to geocode.
 * @param onProgress A callback function to report progress updates.
 * @returns A promise that resolves to a list of geocoded locations.
 */
export const geocode = async (
    placeNames: string[],
    onProgress?: (progress: ProgressState) => void,
    onBatchResolved?: (resolved: { name: string; lat: number; lon: number }[]) => void
): Promise<{ name: string; lat: number; lon: number }[]> => {
    const totalPlaces = placeNames.length;
    if (totalPlaces === 0) return [];

    if (onProgress) {
        onProgress({ step: 'בודק מסד נתונים ומטמון מקומי...', current: 0, total: totalPlaces });
    }

    const cache = getGeocodeCache();
    const cachedResults: { name: string; lat: number; lon: number }[] = [];
    const uncachedNames: string[] = [];

    // Filter locations into cached vs uncached
    for (const name of placeNames) {
        if (cache[name]) {
            cachedResults.push({ name, lat: cache[name].lat, lon: cache[name].lon });
        } else {
            uncachedNames.push(name);
        }
    }

    // If everything is cached, return immediately
    if (uncachedNames.length === 0) {
        if (onProgress) {
            onProgress({ step: 'כל המיקומים נטענו מהזיכרון המקומי.', current: totalPlaces, total: totalPlaces });
        }
        return cachedResults;
    }

    const allResults: { name: string; lat: number; lon: number }[] = [];
    
    // 1. Process uncached names with our high-speed open geocoding engine (with AI fallback)
    const batches: string[][] = [];
    for (let i = 0; i < uncachedNames.length; i += GEMINI_BATCH_SIZE) {
        batches.push(uncachedNames.slice(i, i + GEMINI_BATCH_SIZE));
    }

    let processedByAI = 0;
    for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        if (onProgress) {
            onProgress({
                step: `מפענח מיקומים גיאוגרפיים (קבוצה ${i + 1}/${batches.length})...`,
                current: cachedResults.length + processedByAI,
                total: totalPlaces
            });
        }

        try {
            const batchResults = await geocodeWithGemini(batch);
            if (batchResults.length > 0) {
                allResults.push(...batchResults);
                
                // Save to cache progressively
                const partialCache = getGeocodeCache();
                for (const res of batchResults) {
                    partialCache[res.name] = { lat: res.lat, lon: res.lon };
                }
                localStorage.setItem(CACHE_KEY, JSON.stringify(partialCache));

                if (onBatchResolved) {
                    onBatchResolved(batchResults);
                }
            }
        } catch (err) {
            console.error(`Batch ${i} failed:`, err);
        }
        
        processedByAI += batch.length;
    }

    // 2. Identify missing locations that couldn't be geocoded in the batch.
    const foundNames = new Set(allResults.map(r => r.name));
    const missingNames = uncachedNames.filter(name => !foundNames.has(name));

    if (missingNames.length > 0) {
        if (onProgress) {
            onProgress({
                step: `אומתו ${allResults.length + cachedResults.length}/${totalPlaces} מקומות. מבצע אימות מדורג נוסף...`,
                current: totalPlaces - missingNames.length,
                total: totalPlaces
            });
        }

        let fallbackCount = 0;
        for (const name of missingNames) {
            if (fallbackCount > 0) {
                await delay(1100);
            }

            try {
                const result = await geocodeSinglePlace(name);
                if (result) {
                    allResults.push(result);
                    saveGeocodeToCache(result.name, result.lat, result.lon);

                    if (onBatchResolved) {
                        onBatchResolved([result]);
                    }
                }
            } catch (err) {
                console.error(`Fallback failed for ${name}:`, err);
            }

            fallbackCount++;
            if (onProgress) {
                onProgress({
                    step: `מעבד מקום מורכב: ${name} (${fallbackCount}/${missingNames.length})`,
                    current: (totalPlaces - missingNames.length) + fallbackCount,
                    total: totalPlaces
                });
            }
        }
    }

    if (onProgress) {
        onProgress({ step: "פענוח המקומות הושלם בהצלחה.", current: totalPlaces, total: totalPlaces });
    }

    // Combine cached results with newly processed results
    const combinedResults = [...cachedResults, ...allResults];

    // Ensure we don't return duplicates if multiple entries had the same name
    const uniqueResultsMap = new Map<string, { name: string; lat: number; lon: number }>();
    combinedResults.forEach(r => uniqueResultsMap.set(r.name, r));

    return Array.from(uniqueResultsMap.values());
};
