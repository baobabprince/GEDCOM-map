#!/usr/bin/env python3
"""Isolate geocode cache per GEDCOM file; collapse mapped places to focus on unmapped."""
from pathlib import Path
import re


def patch_geocoding_service(path: Path) -> None:
    t = path.read_text()
    if 'cacheKeyFor' in t:
        print('geocodingService already scoped')
        return

    # Add scope helper after CACHE_KEY
    if "const CACHE_KEY = 'gedcom_geocode_cache_v4';" in t:
        t = t.replace(
            "const CACHE_KEY = 'gedcom_geocode_cache_v4';",
            "const CACHE_KEY = 'gedcom_geocode_cache_v4';\n\n"
            "/** Isolate cache per GEDCOM source file so trees don't mix pins. */\n"
            "const cacheKeyFor = (fileScope?: string | null) =>\n"
            "  fileScope && fileScope.trim()\n"
            "    ? `${CACHE_KEY}::${fileScope.trim().toLowerCase()}`\n"
            "    : CACHE_KEY;",
            1,
        )
    else:
        # try v3
        t = t.replace(
            "const CACHE_KEY = 'gedcom_geocode_cache_v3';",
            "const CACHE_KEY = 'gedcom_geocode_cache_v4';\n\n"
            "const cacheKeyFor = (fileScope?: string | null) =>\n"
            "  fileScope && fileScope.trim()\n"
            "    ? `${CACHE_KEY}::${fileScope.trim().toLowerCase()}`\n"
            "    : CACHE_KEY;",
            1,
        )

    # Update getGeocodeCache to accept optional scope
    t = t.replace(
        "export const getGeocodeCache = (): Record<string, CachedLocation> => {\n"
        "  try {\n"
        "    const stored = localStorage.getItem(CACHE_KEY);",
        "export const getGeocodeCache = (fileScope?: string | null): Record<string, CachedLocation> => {\n"
        "  try {\n"
        "    const stored = localStorage.getItem(cacheKeyFor(fileScope));",
        1,
    )
    t = t.replace(
        "export const saveGeocodeToCache = (name: string, lat: number, lon: number) => {\n"
        "  try {\n"
        "    const stored = localStorage.getItem(CACHE_KEY);\n"
        "    const cache = stored ? JSON.parse(stored) : {};\n"
        "    cache[name] = { lat, lon };\n"
        "    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));",
        "export const saveGeocodeToCache = (name: string, lat: number, lon: number, fileScope?: string | null) => {\n"
        "  try {\n"
        "    const key = cacheKeyFor(fileScope);\n"
        "    const stored = localStorage.getItem(key);\n"
        "    const cache = stored ? JSON.parse(stored) : {};\n"
        "    cache[name] = { lat, lon };\n"
        "    localStorage.setItem(key, JSON.stringify(cache));",
        1,
    )
    t = t.replace(
        "export const saveMultipleGeocodesToCache = (results: { name: string; lat: number; lon: number }[]) => {\n"
        "  try {\n"
        "    const stored = localStorage.getItem(CACHE_KEY);\n"
        "    const cache = stored ? JSON.parse(stored) : {};\n"
        "    for (const r of results) {\n"
        "      cache[r.name] = { lat: r.lat, lon: r.lon };\n"
        "    }\n"
        "    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));",
        "export const saveMultipleGeocodesToCache = (results: { name: string; lat: number; lon: number }[], fileScope?: string | null) => {\n"
        "  try {\n"
        "    const key = cacheKeyFor(fileScope);\n"
        "    const stored = localStorage.getItem(key);\n"
        "    const cache = stored ? JSON.parse(stored) : {};\n"
        "    for (const r of results) {\n"
        "      cache[r.name] = { lat: r.lat, lon: r.lon };\n"
        "    }\n"
        "    localStorage.setItem(key, JSON.stringify(cache));",
        1,
    )

    # clearGeocodeCache: clear all v4 scopes
    old_clear = (
        "export const clearGeocodeCache = () => {\n"
        "  try {\n"
        "    localStorage.removeItem(CACHE_KEY);\n"
    )
    if old_clear in t:
        t = t.replace(
            old_clear,
            "export const clearGeocodeCache = (fileScope?: string | null) => {\n"
            "  try {\n"
            "    if (fileScope) {\n"
            "      localStorage.removeItem(cacheKeyFor(fileScope));\n"
            "    } else {\n"
            "      localStorage.removeItem(CACHE_KEY);\n"
            "      // Remove per-file scoped keys\n"
            "      const prefix = CACHE_KEY + '::';\n"
            "      for (let i = localStorage.length - 1; i >= 0; i--) {\n"
            "        const k = localStorage.key(i);\n"
            "        if (k && k.startsWith(prefix)) localStorage.removeItem(k);\n"
            "      }\n"
            "    }\n",
            1,
        )

    # Thread fileScope through geocode() if signature is simple
    if 'export const geocode = async (' in t and 'fileScope' not in t[t.find('export const geocode'):t.find('export const geocode')+200]:
        t = t.replace(
            "export const geocode = async (\n"
            "  placeNames: string[],\n"
            "  onProgress?: (progress: ProgressState) => void,\n"
            "  onBatchResolved?: (resolved: { name: string; lat: number; lon: number }[]) => void\n"
            ") => {",
            "export const geocode = async (\n"
            "  placeNames: string[],\n"
            "  onProgress?: (progress: ProgressState) => void,\n"
            "  onBatchResolved?: (resolved: { name: string; lat: number; lon: number }[]) => void,\n"
            "  fileScope?: string | null\n"
            ") => {",
            1,
        )
        t = t.replace(
            "  const cache = getGeocodeCache();",
            "  const cache = getGeocodeCache(fileScope);",
            1,
        )
        t = t.replace(
            "    saveMultipleGeocodesToCache(newlyDiscoveredFromDictionary);",
            "    saveMultipleGeocodesToCache(newlyDiscoveredFromDictionary, fileScope);",
            1,
        )
        t = t.replace(
            "        saveMultipleGeocodesToCache(serverResults);",
            "        saveMultipleGeocodesToCache(serverResults, fileScope);",
            1,
        )
        t = t.replace(
            "            saveGeocodeToCache(res.name, res.lat, res.lon);",
            "            saveGeocodeToCache(res.name, res.lat, res.lon, fileScope);",
            1,
        )
        t = t.replace(
            "      saveMultipleGeocodesToCache(clientBatchBuffer);",
            "      saveMultipleGeocodesToCache(clientBatchBuffer, fileScope);",
            1,
        )

    path.write_text(t)
    print('geocodingService patched')


def patch_app(path: Path) -> None:
    t = path.read_text()

    # 1) sourceFilename state
    if 'sourceFilename' not in t:
        t = t.replace(
            "  const [places, setPlaces] = useState<Place[]>([]);",
            "  const [places, setPlaces] = useState<Place[]>([]);\n"
            "  const [sourceFilename, setSourceFilename] = useState<string | null>(null);",
            1,
        )
        print('added sourceFilename state')

    # 2) _processGedcomContent accepts optional filename
    # Find definition - likely async (content: string) or similar
    if 'fileScope' not in t or 'setSourceFilename' not in t[t.find('_processGedcomContent'):t.find('_processGedcomContent')+800]:
        # Update process to set filename and use scoped cache
        pass

    # handleFileProcess set filename
    t = t.replace(
        "  const handleFileProcess = useCallback(\n"
        "    async (file: File) => {\n"
        "      const content = await file.text();\n"
        "      setOriginalGedcom(content);",
        "  const handleFileProcess = useCallback(\n"
        "    async (file: File) => {\n"
        "      const content = await file.text();\n"
        "      setSourceFilename(file.name);\n"
        "      setOriginalGedcom(content);",
        1,
    )

    # handleLoadShared - use shared filename
    t = t.replace(
        "  const handleLoadShared = useCallback(async () => {\n"
        "    const shared = loadSharedExport();\n"
        "    if (!shared?.gedcom) return;\n"
        "    setOriginalGedcom(shared.gedcom);\n"
        "    await _processGedcomContent(shared.gedcom);\n"
        "  }, [_processGedcomContent]);",
        "  const handleLoadShared = useCallback(async () => {\n"
        "    const shared = loadSharedExport();\n"
        "    if (!shared?.gedcom) return;\n"
        "    setSourceFilename(shared.filename || 'shared.ged');\n"
        "    setOriginalGedcom(shared.gedcom);\n"
        "    await _processGedcomContent(shared.gedcom, shared.filename || 'shared.ged');\n"
        "  }, [_processGedcomContent]);",
        1,
    )

    t = t.replace(
        "  const handleSampleData = useCallback(async () => {\n"
        "    setOriginalGedcom(sampleGedcomData);\n"
        "    await _processGedcomContent(sampleGedcomData);\n"
        "  }, [_processGedcomContent]);",
        "  const handleSampleData = useCallback(async () => {\n"
        "    setSourceFilename('sample.ged');\n"
        "    setOriginalGedcom(sampleGedcomData);\n"
        "    await _processGedcomContent(sampleGedcomData, 'sample.ged');\n"
        "  }, [_processGedcomContent]);",
        1,
    )

    t = t.replace(
        "      await _processGedcomContent(content);\n"
        "    },\n"
        "    [_processGedcomContent]\n"
        "  );",
        "      await _processGedcomContent(content, file.name);\n"
        "    },\n"
        "    [_processGedcomContent]\n"
        "  );",
        1,
    )

    # handleStartOver clear filename
    t = t.replace(
        "    setPlaces([]);\n"
        "    setPersons([]);",
        "    setPlaces([]);\n"
        "    setSourceFilename(null);\n"
        "    setPersons([]);",
        1,
    )

    # Update _processGedcomContent signature - find it
    # Common pattern: const _processGedcomContent = useCallback(\n    #   async (content: string) => {
    m = re.search(
        r"const _processGedcomContent = useCallback\(\s*async \(content: string\) => \{",
        t,
    )
    if m:
        t = t[: m.start()] + (
            "const _processGedcomContent = useCallback(\n"
            "    async (content: string, fileScope?: string | null) => {\n"
            "      const scope = fileScope || sourceFilename || 'session';\n"
            "      setSourceFilename(scope === 'session' ? (fileScope || null) : scope);\n"
        ) + t[m.end() :]
        print('updated _processGedcomContent signature')
    else:
        # try without types
        m2 = re.search(
            r"const _processGedcomContent = useCallback\(\s*async \(content\) => \{",
            t,
        )
        if m2:
            t = t[: m2.start()] + (
                "const _processGedcomContent = useCallback(\n"
                "    async (content, fileScope) => {\n"
                "      const scope = fileScope || sourceFilename || 'session';\n"
                "      if (fileScope) setSourceFilename(fileScope);\n"
            ) + t[m2.end() :]
            print('updated _processGedcomContent (untyped)')

    # getGeocodeCache() -> getGeocodeCache(scope) inside process
    # Careful: only inside process function - replace first occurrences after process
    # Simpler: replace "const cache = getGeocodeCache();" with scoped
    t = t.replace(
        "const cache = getGeocodeCache();",
        "const cache = getGeocodeCache(scope);",
        1,
    )

    # geocode(rawPlaceNames, ..., ...) add scope as 4th arg
    # Pattern: geocode(\n            rawPlaceNames,
            progressUpdate => {
    if re.search(r"geocode\(\s*rawPlaceNames,", t):
        # Add scope after the batch callback - harder. Use regex for closing of geocode call
        # Look for geocode( rawPlaceNames, progress, batch ) without 4th arg
        t2, n = re.subn(
            r"geocode\(\s*rawPlaceNames,\s*progressUpdate => \{",
            "geocode(\n            rawPlaceNames,\n            progressUpdate => {",
            t,
            count=1,
        )
        t = t2
        # Find ").then(() =>" after geocode batch and inject scope before closing paren of geocode
        # Typical structure ends with: })\n          )\n            .then
        t = t.replace(
            "            })\n          )\n            .then(() => {",
            "            },\n            scope\n          )\n            .then(() => {",
            1,
        )

    # dependency array for _processGedcomContent may need sourceFilename - optional

    # Pass sourceFilename to sidebar props
    if 'sourceFilename={sourceFilename}' not in t:
        t = t.replace(
            "    mappedPlaces: filteredMappedPlaces,",
            "    sourceFilename,\n    mappedPlaces: filteredMappedPlaces,",
            1,
        )

    # SidebarContent destructuring + UI
    if 'sourceFilename' not in t[t.find('const SidebarContent'):t.find('const SidebarContent')+500]:
        t = t.replace(
            "  mappedPlaces,",
            "  sourceFilename,\n  mappedPlaces,",
            1,
        )

    # Collapsible mapped + unmapped first
    old_lists = '''                <div>
                  {viewMode === ViewMode.Location ? (
                    <div className="space-y-6">
                      {mappedPlaces.length > 0 && (
                        <div>
                          <h2 className="text-sm font-semibold text-gray-200 flex items-center gap-2 mb-3">
                            <ListIcon className="h-4 w-4 text-gray-400" />
                            <span>
                              {t.mappedLocations} ({mappedPlaces.length})
                            </span>
                          </h2>
                          <ul className="space-y-2">
                            {mappedPlaces.map(place => (
                              <li
                                key={`${place.name}-${place.lat}`}
                                onClick={() => handlePlaceSelect(place)}
                                className="p-3 rounded-lg cursor-pointer transition-all duration-200 bg-gray-700/50 hover:bg-gray-700"
                              >
                                <p className="font-medium text-sm text-white">{place.name}</p>
                                <p className="text-xs text-indigo-200 mt-0.5">
                                  {t.eventsCount(place.events.length)}
                                </p>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {unmappedPlaces.length > 0 && (
                        <div>
                          <h2 className="text-sm font-semibold text-gray-200 flex items-center gap-2 mb-3 border-t border-gray-700 pt-4">
                            <MapPinIcon className="h-4 w-4 text-gray-500" />
                            <span>
                              {t.unmappedLocations} ({unmappedPlaces.length})
                            </span>
                          </h2>
                          <ul className="space-y-2">
                            {unmappedPlaces.map(place => (
                              <li
                                key={place.name}
                                onClick={() => handlePlaceSelect(place)}
                                className="p-3 rounded-lg bg-gray-800/50 flex items-center justify-between gap-2 cursor-pointer hover:bg-gray-700/
'''

    # Use a more robust smaller replacement - inject collapse state in SidebarContent
    # Find "const SidebarContent = ({" and add useState after opening of component body

    # Inject after SidebarContent's first line of body - look for "const { t, isRTL } = useLanguage();" inside sidebar
    if 'mappedCollapsed' not in t:
        # SidebarContent uses props - need React useState - already imported
        # Find inside SidebarContent the language hook
        idx = t.find('const SidebarContent')
        if idx > 0:
            hook = t.find('useLanguage()', idx)
            if hook > 0:
                # insert after that statement line
                line_end = t.find('\n', hook)
                inject = (
                    "\n  const [mappedCollapsed, setMappedCollapsed] = useState(true); // focus unmapped by default\n"
                    "  const [unmappedCollapsed, setUnmappedCollapsed] = useState(false);\n"
                )
                t = t[: line_end + 1] + inject + t[line_end + 1 :]
                print('collapse state injected')

    # Replace mapped header with button toggle - simpler regex
    t2, n = re.subn(
        r"\{mappedPlaces\.length > 0 && \(\s*<div>\s*<h2 className=\"text-sm font-semibold text-gray-200 flex items-center gap-2 mb-3\">\s*<ListIcon className=\"h-4 w-4 text-gray-400\" />\s*<span>\s*\{t\.mappedLocations\} \(\{mappedPlaces\.length\}\)\s*</span>\s*</h2>\s*<ul className=\"space-y-2\">",
        """{mappedPlaces.length > 0 && (
                        <div>
                          <button
                            type="button"
                            onClick={() => setMappedCollapsed(c => !c)}
                            className="w-full text-sm font-semibold text-gray-200 flex items-center gap-2 mb-3 cursor-pointer hover:text-white"
                          >
                            <ListIcon className="h-4 w-4 text-gray-400" />
                            <span className="flex-1 text-start">
                              {t.mappedLocations} ({mappedPlaces.length})
                            </span>
                            <span className="text-xs text-gray-400">{mappedCollapsed ? '▸' : '▾'}</span>
                          </button>
                          {!mappedCollapsed && (
                          <ul className="space-y-2">""",
        t,
        count=1,
    )
    if n:
        t = t2
        print('mapped header -> collapsible')
        # close the extra conditional after mapped ul ends - find first </ul> after mappedPlaces.map
        # Add after mapped list </ul></div>)  ->  </ul>)}</div>)
        t = t.replace(
            "                            {mappedPlaces.map(place => (\n"
            "                              <li\n"
            "                                key={`${place.name}-${place.lat}`}\n"
            "                                onClick={() => handlePlaceSelect(place)}\n"
            "                                className=\"p-3 rounded-lg cursor-pointer transition-all duration-200 bg-gray-700/50 hover:bg-gray-700\"\n"
            "                              >\n"
            "                                <p className=\"font-medium text-sm text-white\">{place.name}</p>\n"
            "                                <p className=\"text-xs text-indigo-200 mt-0.5\">\n"
            "                                  {t.eventsCount(place.events.length)}\n"
            "                                </p>\n"
            "                              </li>\n"
            "                            ))}\n"
            "                          </ul>\n"
            "                        </div>\n"
            "                      )}",
            "                            {mappedPlaces.map(place => (\n"
            "                              <li\n"
            "                                key={`${place.name}-${place.lat}`}\n"
            "                                onClick={() => handlePlaceSelect(place)}\n"
            "                                className=\"p-3 rounded-lg cursor-pointer transition-all duration-200 bg-gray-700/50 hover:bg-gray-700\"\n"
            "                              >\n"
            "                                <p className=\"font-medium text-sm text-white\">{place.name}</p>\n"
            "                                <p className=\"text-xs text-indigo-200 mt-0.5\">\n"
            "                                  {t.eventsCount(place.events.length)}\n"
            "                                </p>\n"
            "                              </li>\n"
            "                            ))}\n"
            "                          </ul>\n"
            "                          )}\n"
            "                        </div>\n"
            "                      )}",
            1,
        )

    # Put unmapped section style: ensure border-t only if mapped shown; make unmapped more prominent
    t = t.replace(
        "                          <h2 className=\"text-sm font-semibold text-gray-200 flex items-center gap-2 mb-3 border-t border-gray-700 pt-4\">\n"
        "                            <MapPinIcon className=\"h-4 w-4 text-gray-500\" />\n"
        "                            <span>\n"
        "                              {t.unmappedLocations} ({unmappedPlaces.length})\n"
        "                            </span>\n"
        "                          </h2>",
        "                          <h2 className=\"text-sm font-semibold text-amber-200/90 flex items-center gap-2 mb-3\">\n"
        "                            <MapPinIcon className=\"h-4 w-4 text-amber-400\" />\n"
        "                            <span>\n"
        "                              {t.unmappedLocations} ({unmappedPlaces.length})\n"
        "                            </span>\n"
        "                          </h2>",
        1,
    )

    # Reorder: unmapped before mapped - swap blocks is complex; with mapped collapsed by default it's OK

    # Show current file name near list header if we can find a good spot
    if 'sourceFilename &&' not in t[t.find('ViewMode.Location'):t.find('ViewMode.Location')+400]:
        t = t.replace(
            "                  {viewMode === ViewMode.Location ? (\n"
            "                    <div className=\"space-y-6\">",
            "                  {viewMode === ViewMode.Location ? (\n"
            "                    <div className=\"space-y-6\">\n"
            "                      {sourceFilename && (\n"
            "                        <p className=\"text-[11px] text-gray-400 truncate mb-1\" title={sourceFilename}>\n"
            "                          קובץ: {sourceFilename}\n"
            "                        </p>\n"
            "                      )}",
            1,
        )

    path.write_text(t)
    print('App.tsx patched')


def main():
    patch_geocoding_service(Path('services/geocodingService.ts'))
    patch_app(Path('App.tsx'))


if __name__ == '__main__':
    main()
