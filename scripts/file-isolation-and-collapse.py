#!/usr/bin/env python3
"""Per-file geocode cache + collapsible mapped places list."""
from pathlib import Path
import re


def patch_geocoding_service(path: Path) -> None:
    t = path.read_text()
    if "cacheKeyFor" in t:
        print("geocodingService already scoped")
        return

    # Normalize cache key constant first
    t = t.replace("gedcom_geocode_cache_v3", "gedcom_geocode_cache_v4")

    if "const CACHE_KEY = 'gedcom_geocode_cache_v4';" not in t:
        raise SystemExit("CACHE_KEY not found")

    helper = (
        "const CACHE_KEY = 'gedcom_geocode_cache_v4';\n\n"
        "/** Isolate cache per GEDCOM source file so trees don't mix pins. */\n"
        "const cacheKeyFor = (fileScope?: string | null) =>\n"
        "  fileScope && fileScope.trim()\n"
        "    ? `${CACHE_KEY}::${fileScope.trim().toLowerCase()}`\n"
        "    : CACHE_KEY;"
    )
    t = t.replace("const CACHE_KEY = 'gedcom_geocode_cache_v4';", helper, 1)

    t = t.replace(
        "export const getGeocodeCache = (): Record<string, CachedLocation> => {",
        "export const getGeocodeCache = (fileScope?: string | null): Record<string, CachedLocation> => {",
        1,
    )
    t = t.replace(
        "const stored = localStorage.getItem(CACHE_KEY);",
        "const stored = localStorage.getItem(cacheKeyFor(fileScope));",
        1,
    )

    # saveGeocodeToCache - only first occurrence of pattern
    t = t.replace(
        "export const saveGeocodeToCache = (name: string, lat: number, lon: number) => {",
        "export const saveGeocodeToCache = (name: string, lat: number, lon: number, fileScope?: string | null) => {",
        1,
    )
    # Inside saveGeocodeToCache body, use key variable - replace first block carefully
    t = t.replace(
        "export const saveGeocodeToCache = (name: string, lat: number, lon: number, fileScope?: string | null) => {\n"
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
        "export const saveMultipleGeocodesToCache = (results: { name: string; lat: number; lon: number }[]) => {",
        "export const saveMultipleGeocodesToCache = (results: { name: string; lat: number; lon: number }[], fileScope?: string | null) => {",
        1,
    )
    t = t.replace(
        "export const saveMultipleGeocodesToCache = (results: { name: string; lat: number; lon: number }[], fileScope?: string | null) => {\n"
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

    t = t.replace(
        "export const clearGeocodeCache = () => {\n  try {\n    localStorage.removeItem(CACHE_KEY);",
        "export const clearGeocodeCache = (fileScope?: string | null) => {\n"
        "  try {\n"
        "    if (fileScope) {\n"
        "      localStorage.removeItem(cacheKeyFor(fileScope));\n"
        "    } else {\n"
        "      localStorage.removeItem(CACHE_KEY);\n"
        "      const prefix = CACHE_KEY + '::';\n"
        "      for (let i = localStorage.length - 1; i >= 0; i--) {\n"
        "        const k = localStorage.key(i);\n"
        "        if (k && k.startsWith(prefix)) localStorage.removeItem(k);\n"
        "      }\n"
        "    }",
        1,
    )

    # geocode signature + internal uses
    t = t.replace(
        "  onBatchResolved?: (resolved: { name: string; lat: number; lon: number }[]) => void\n) => {",
        "  onBatchResolved?: (resolved: { name: string; lat: number; lon: number }[]) => void,\n"
        "  fileScope?: string | null\n) => {",
        1,
    )
    t = t.replace("const cache = getGeocodeCache();", "const cache = getGeocodeCache(fileScope);", 1)
    t = t.replace(
        "saveMultipleGeocodesToCache(newlyDiscoveredFromDictionary);",
        "saveMultipleGeocodesToCache(newlyDiscoveredFromDictionary, fileScope);",
        1,
    )
    t = t.replace(
        "saveMultipleGeocodesToCache(serverResults);",
        "saveMultipleGeocodesToCache(serverResults, fileScope);",
        1,
    )
    t = t.replace(
        "saveGeocodeToCache(res.name, res.lat, res.lon);",
        "saveGeocodeToCache(res.name, res.lat, res.lon, fileScope);",
        1,
    )
    t = t.replace(
        "saveMultipleGeocodesToCache(clientBatchBuffer);",
        "saveMultipleGeocodesToCache(clientBatchBuffer, fileScope);",
        1,
    )

    path.write_text(t)
    print("geocodingService patched")


def patch_app(path: Path) -> None:
    t = path.read_text()

    if "sourceFilename" not in t:
        t = t.replace(
            "  const [places, setPlaces] = useState<Place[]>([]);",
            "  const [places, setPlaces] = useState<Place[]>([]);\n"
            "  const [sourceFilename, setSourceFilename] = useState<string | null>(null);",
            1,
        )

    # process signature
    t2, n = re.subn(
        r"const _processGedcomContent = useCallback\(\s*async \(content: string\) => \{",
        "const _processGedcomContent = useCallback(\n"
        "    async (content: string, fileScope?: string | null) => {\n"
        "      const scope = (fileScope || sourceFilename || 'session') as string;\n"
        "      if (fileScope) setSourceFilename(fileScope);\n",
        t,
        count=1,
    )
    if n:
        t = t2
        print("process signature updated")
    else:
        print("WARN: process signature not found")

    t = t.replace("const cache = getGeocodeCache();", "const cache = getGeocodeCache(scope);", 1)

    # Add fileScope as 4th argument to geocode(...) — find closing of geocode before .then
    # Match: geocode(\n            rawPlaceNames, ... })\n          )
    if "rawPlaceNames," in t and ",\n            scope\n          )" not in t:
        # Inject scope before the closing paren of geocode call that uses rawPlaceNames
        pattern = re.compile(
            r"(geocode\(\s*rawPlaceNames,[\s\S]*?\}\s*)(\n\s*\)\s*\n\s*\.then)",
            re.M,
        )

        def inject_scope(m):
            return m.group(1) + ",\n            scope" + m.group(2)

        t2, n = pattern.subn(inject_scope, t, count=1)
        if n:
            t = t2
            print("geocode call scoped")
        else:
            print("WARN: geocode call not updated")

    # handlers set filename
    t = t.replace(
        "      const content = await file.text();\n      setOriginalGedcom(content);",
        "      const content = await file.text();\n      setSourceFilename(file.name);\n      setOriginalGedcom(content);",
        1,
    )
    t = t.replace(
        "      await _processGedcomContent(content);",
        "      await _processGedcomContent(content, file.name);",
        1,
    )
    t = t.replace(
        "    if (!shared?.gedcom) return;\n    setOriginalGedcom(shared.gedcom);\n    await _processGedcomContent(shared.gedcom);",
        "    if (!shared?.gedcom) return;\n"
        "    const fname = shared.filename || 'shared.ged';\n"
        "    setSourceFilename(fname);\n"
        "    setOriginalGedcom(shared.gedcom);\n"
        "    await _processGedcomContent(shared.gedcom, fname);",
        1,
    )
    t = t.replace(
        "    setOriginalGedcom(sampleGedcomData);\n    await _processGedcomContent(sampleGedcomData);",
        "    setSourceFilename('sample.ged');\n"
        "    setOriginalGedcom(sampleGedcomData);\n"
        "    await _processGedcomContent(sampleGedcomData, 'sample.ged');",
        1,
    )
    t = t.replace(
        "    setPlaces([]);\n    setPersons([]);",
        "    setPlaces([]);\n    setSourceFilename(null);\n    setPersons([]);",
        1,
    )

    # props bag
    if "sourceFilename," not in t.split("mappedPlaces: filteredMappedPlaces")[0][-200:]:
        t = t.replace(
            "    mappedPlaces: filteredMappedPlaces,",
            "    sourceFilename,\n    mappedPlaces: filteredMappedPlaces,",
            1,
        )

    # Sidebar destructure
    idx = t.find("const SidebarContent")
    if idx > 0 and "sourceFilename," not in t[idx : idx + 400]:
        t = t.replace("  mappedPlaces,", "  sourceFilename,\n  mappedPlaces,", 1)

    # Collapse state after first useLanguage in SidebarContent
    if "mappedCollapsed" not in t:
        idx = t.find("const SidebarContent")
        hook = t.find("useLanguage()", idx)
        if hook > 0:
            line_end = t.find("\n", hook)
            inject = (
                "\n  const [mappedCollapsed, setMappedCollapsed] = useState(true);\n"
            )
            t = t[: line_end + 1] + inject + t[line_end + 1 :]
            print("collapse state added")

    # File label + collapsible mapped header
    if "קובץ:" not in t:
        t = t.replace(
            "{viewMode === ViewMode.Location ? (\n                    <div className=\"space-y-6\">",
            "{viewMode === ViewMode.Location ? (\n"
            "                    <div className=\"space-y-6\">\n"
            "                      {sourceFilename && (\n"
            "                        <p className=\"text-[11px] text-gray-400 truncate\" title={sourceFilename}>\n"
            "                          קובץ: {sourceFilename}\n"
            "                        </p>\n"
            "                      )}",
            1,
        )

    # Make mapped section collapsible via simple replacements
    old_h2 = (
        "{mappedPlaces.length > 0 && (\n"
        "                        <div>\n"
        "                          <h2 className=\"text-sm font-semibold text-gray-200 flex items-center gap-2 mb-3\">\n"
        "                            <ListIcon className=\"h-4 w-4 text-gray-400\" />\n"
        "                            <span>\n"
        "                              {t.mappedLocations} ({mappedPlaces.length})\n"
        "                            </span>\n"
        "                          </h2>\n"
        "                          <ul className=\"space-y-2\">"
    )
    new_h2 = (
        "{mappedPlaces.length > 0 && (\n"
        "                        <div>\n"
        "                          <button type=\"button\" onClick={() => setMappedCollapsed(c => !c)} "
        "className=\"w-full text-sm font-semibold text-gray-200 flex items-center gap-2 mb-3 cursor-pointer hover:text-white\">\n"
        "                            <ListIcon className=\"h-4 w-4 text-gray-400\" />\n"
        "                            <span className=\"flex-1 text-start\">\n"
        "                              {t.mappedLocations} ({mappedPlaces.length})\n"
        "                            </span>\n"
        "                            <span className=\"text-xs text-gray-400\">{mappedCollapsed ? '▸' : '▾'}</span>\n"
        "                          </button>\n"
        "                          {!mappedCollapsed && (\n"
        "                          <ul className=\"space-y-2\">"
    )
    if old_h2 in t:
        t = t.replace(old_h2, new_h2, 1)
        # Close extra paren after mapped </ul>
        close_old = (
            "                            ))}\n"
            "                          </ul>\n"
            "                        </div>\n"
            "                      )}\n"
            "                      {unmappedPlaces.length > 0 && ("
        )
        close_new = (
            "                            ))}\n"
            "                          </ul>\n"
            "                          )}\n"
            "                        </div>\n"
            "                      )}\n"
            "                      {unmappedPlaces.length > 0 && ("
        )
        if close_old in t:
            t = t.replace(close_old, close_new, 1)
            print("mapped collapsible UI")
        else:
            print("WARN: could not close mapped collapse")
    else:
        print("WARN: mapped header pattern not found")

    # Highlight unmapped section
    t = t.replace(
        "text-sm font-semibold text-gray-200 flex items-center gap-2 mb-3 border-t border-gray-700 pt-4",
        "text-sm font-semibold text-amber-200/90 flex items-center gap-2 mb-3",
        1,
    )
    t = t.replace(
        "<MapPinIcon className=\"h-4 w-4 text-gray-500\" />",
        "<MapPinIcon className=\"h-4 w-4 text-amber-400\" />",
        1,
    )

    path.write_text(t)
    print("App.tsx patched")


def main() -> None:
    patch_geocoding_service(Path("services/geocodingService.ts"))
    patch_app(Path("App.tsx"))


if __name__ == "__main__":
    main()
