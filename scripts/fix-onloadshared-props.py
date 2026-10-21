#!/usr/bin/env python3
from pathlib import Path

def main():
    p = Path('App.tsx')
    t = p.read_text()

    old = '''const SidebarContent = ({
  appState,
  viewMode,
  setViewMode,
  persons,
  mappedPlaces,
  unmappedPlaces,
  activePerson,
  activePlace,
  handlePersonSelect,
  handlePlaceSelect,
  handleStartOver,
  onFileSelect,
  onSampleSelect,
  originalGedcom,
  handleExportGedcom,
  handleClearSelection,
  handleSelectPlaceByName,
  handleManualPinDropRequest,
  handleSelectPersonById,
  filters,
  availableEventTypes,
  fullDateRange,
  onFilterChange,
  onResetFilters,
  searchQuery,
  setSearchQuery,
  unmappedPlaceNames,
  hasCache,
  handleClearCache,
  isGeocoding,
  progress,
}) => {'''

    new = '''const SidebarContent = ({
  appState,
  viewMode,
  setViewMode,
  persons,
  mappedPlaces,
  unmappedPlaces,
  activePerson,
  activePlace,
  handlePersonSelect,
  handlePlaceSelect,
  handleStartOver,
  onFileSelect,
  onSampleSelect,
  onLoadShared,
  onSaveShared,
  hasShared,
  sharedSummary,
  originalGedcom,
  handleExportGedcom,
  handleClearSelection,
  handleSelectPlaceByName,
  handleManualPinDropRequest,
  handleSelectPersonById,
  filters,
  availableEventTypes,
  fullDateRange,
  onFilterChange,
  onResetFilters,
  searchQuery,
  setSearchQuery,
  unmappedPlaceNames,
  hasCache,
  handleClearCache,
  isGeocoding,
  progress,
}) => {'''

    if 'onLoadShared,' in t and 'const SidebarContent' in t:
        # check if already in SidebarContent destructure
        start = t.find('const SidebarContent = ({')
        end = t.find('}) => {', start)
        block = t[start:end]
        if 'onLoadShared' not in block:
            if old not in t:
                raise SystemExit('SidebarContent signature not found exactly')
            t = t.replace(old, new, 1)
            print('fixed SidebarContent')
        else:
            print('already in destructure')
    else:
        if old in t:
            t = t.replace(old, new, 1)
            print('fixed SidebarContent')
        else:
            raise SystemExit('cannot find SidebarContent block')

    p.write_text(t)
    print('ok', p.stat().st_size)

if __name__ == '__main__':
    main()
