import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Map as LeafletMap, LatLng } from 'leaflet';
import { AppState, type Place, type Person, ViewMode, type ProgressState, FilterState } from './types.ts';
import { parseGedcom } from './services/gedcomParser.ts';
import { saveSharedExport, loadSharedExport, hasSharedExport, formatSharedSummary } from './services/baobabSharedStorage';
import { geocode, saveGeocodeToCache, clearGeocodeCache, getGeocodeCache } from './services/geocodingService.ts';
import { findKnownLocation } from './services/knownLocations.ts';
import { generateGedcomWithCoords } from './services/gedcomGenerator.ts';
import { getYearFromDate, formatDate, calculateAgeAtEvent } from './services/utils.ts';
import { LanguageProvider, useLanguage, formatEventType } from './services/i18n.ts';
import FileUpload from './components/FileUpload.tsx';
import MapDisplay, { getGroupedPlaceEvents } from './components/MapDisplay.tsx';
import RangeSlider from './components/RangeSlider.tsx';
import { HistoricalContextView } from './components/HistoricalContextView.tsx';
import { DemographicInsights } from './components/DemographicInsights.tsx';
import { useIsMobile } from './hooks/useIsMobile.ts';
import {
  WorldIcon,
  UploadIcon,
  LoadingIcon,
  ErrorIcon,
  MapPinIcon,
  ListIcon,
  UserIcon,
  MenuIcon,
  CloseIcon,
  DownloadIcon,
  ChevronLeftIcon,
  PlusCircleIcon,
  FilterIcon,
  SearchIcon,
} from './components/icons.tsx';

const sampleGedcomData = `0 HEAD
1 SOUR GEDCOM-Visualizer
1 NOTE Sample data for the Lovegood & Scamander families.
0 @I1@ INDI
1 NAME Xenophilius /Lovegood/
1 SEX M
1 BIRT
2 DATE 12 MAR 1955
2 PLAC Ottery St Catchpole, Devon, England
1 OCCU Editor of The Quibbler
1 RESI
2 PLAC The Rookery, Ottery St Catchpole, Devon, England
1 FAMS @F1@
0 @I2@ INDI
1 NAME Pandora /Lovegood/
1 SEX F
1 BIRT
2 DATE 22 JUN 1957
2 PLAC Bristol, England
1 DEAT
2 DATE ABT 1990
2 PLAC The Rookery, Ottery St Catchpole, Devon, England
1 NOTE Died while experimenting with spells.
1 FAMS @F1@
0 @I3@ INDI
1 NAME Luna /Lovegood/
1 SEX F
1 BIRT
2 DATE 13 FEB 1981
2 PLAC The Rookery, Ottery St Catchpole, Devon, England
1 OCCU Magizoologist
1 EDUC
2 PLAC Hogwarts School of Witchcraft and Wizardry, Scotland
1 FAMS @F1@
1 FAMS @F2@
0 @I4@ INDI
1 NAME Rolf /Scamander/
1 SEX M
1 BIRT
2 DATE 8 AUG 1980
2 PLAC Dorset, England
1 OCCU Chief Consulting Magizoologist
1 FAMS @F2@
0 @I5@ INDI
1 NAME Lorcan /Scamander/
1 SEX M
1 BIRT
2 DATE 1 JUN 2008
2 PLAC New Forest, Hampshire, England
1 FAMS @F2@
0 @I6@ INDI
1 NAME Lysander /Scamander/
1 SEX M
1 BIRT
2 DATE 1 JUN 2008
2 PLAC New Forest, Hampshire, England
1 FAMS @F2@
0 @I7@ INDI
1 NAME Anthony /Goldstein/
1 BIRT
2 DATE @#DHEBREW@ 15 IYR 5741
2 PLAC London, England
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 CHIL @I3@
1 MARR
2 DATE 25 DEC 1979
2 PLAC Godric's Hollow, Suffolk, England
0 @F2@ FAM
1 HUSB @I4@
1 WIFE @I3@
1 CHIL @I5@
1 CHIL @I6@
1 MARR
2 DATE 18 AUG 2006
2 PLAC New Forest, Hampshire, England
`;

const LanguageSwitcher = ({ className = '' }: { className?: string }) => {
  const { lang, setLang } = useLanguage();
  return (
    <div
      className={`inline-flex items-center bg-gray-900/80 border border-gray-700/80 rounded-lg p-0.5 text-xs font-semibold ${className}`}
      dir="ltr"
      role="group"
      aria-label="Language switcher"
    >
      <button
        type="button"
        onClick={() => setLang('he')}
        className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
          lang === 'he'
            ? 'bg-indigo-600 text-white shadow-sm'
            : 'text-gray-400 hover:text-white'
        }`}
      >
        עברית
      </button>
      <button
        type="button"
        onClick={() => setLang('en')}
        className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
          lang === 'en'
            ? 'bg-indigo-600 text-white shadow-sm'
            : 'text-gray-400 hover:text-white'
        }`}
      >
        EN
      </button>
    </div>
  );
};

const DataInputSection = ({ onFileSelect, onSampleSelect, onClearCache, hasCache, disabled, onLoadShared, onSaveShared, hasShared, sharedSummary }) => {
  const { t } = useLanguage();
  return (
    <div className="space-y-4">
      <FileUpload onFileSelect={onFileSelect} disabled={disabled}>
        <UploadIcon className="h-5 w-5" />
        <span>{t.uploadGedcom}</span>
      </FileUpload>
      <div className="relative flex items-center">
        <div className="flex-grow border-t border-gray-600"></div>
        <span className="flex-shrink mx-4 text-gray-400 text-sm">{t.orSeparator}</span>
        <div className="flex-grow border-t border-gray-600"></div>
      </div>
      <button
        onClick={onSampleSelect}
        disabled={disabled}
        className="w-full flex items-center justify-center p-3 rounded-md bg-gray-700 hover:bg-gray-600 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {t.trySampleData}
      </button>
      <div className="mt-4 p-3 rounded-xl border border-[#e7e8e0] bg-[#fefefb] text-right">
        <p className="text-[10px] font-semibold text-[#82877e] mb-1">שיתוף בין אפליקציות</p>
        <p className="text-[10px] text-[#a4a79f] mb-2 truncate">{sharedSummary || 'אין נתונים משותפים עדיין'}</p>
        <div className="flex gap-2 justify-end flex-wrap">
          <button type="button" className="text-xs px-3 py-1.5 rounded-lg bg-[#edf1e9] text-[#456352] disabled:opacity-40" disabled={!hasShared || disabled} onClick={() => onLoadShared?.()}>
            טען מהשיתוף
          </button>
          <button type="button" className="text-xs px-3 py-1.5 rounded-lg bg-[#ac694c] text-white disabled:opacity-40" disabled={disabled} onClick={() => onSaveShared?.()}>
            שמור לשיתוף
          </button>
        </div>
      </div>
      {hasCache && (
        <button
          onClick={onClearCache}
          disabled={disabled}
          className="w-full text-center text-xs text-red-400 hover:text-red-300 transition-colors py-1 cursor-pointer"
        >
          {t.clearSavedLocationsCache}
        </button>
      )}
    </div>
  );
};

const PersonDetailView = ({
  person,
  onBack,
  onSelectPlace,
  unmappedPlaceNames,
  allPersons,
}: {
  person: Person;
  onBack: () => void;
  onSelectPlace: (placeName: string) => void;
  unmappedPlaceNames: Set<string>;
  allPersons: Person[];
}) => {
  const { lang, t, isRTL } = useLanguage();
  const birthEvent = React.useMemo(
    () => person.events.find(e => e.eventType === 'Birth'),
    [person.events]
  );
  const birthDate = birthEvent?.date || null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 pb-3 border-b border-gray-700 mb-4 flex-shrink-0">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
          aria-label="Back"
        >
          <ChevronLeftIcon className={`h-5 w-5 ${isRTL ? 'rotate-180' : ''}`} />
        </button>
        <h2 className="text-lg font-semibold truncate" title={person.name}>
          {person.name}
        </h2>
      </div>
      <div className="flex-grow overflow-y-auto min-h-0">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">{t.timelineTitle}</h3>
        <ul className="space-y-3">
          {person.events.length > 0 ? (
            person.events.map((event, idx) => {
              const age =
                event.eventType !== 'Birth'
                  ? calculateAgeAtEvent(birthDate, event.date)
                  : null;
              const isUnmapped = event.place && unmappedPlaceNames.has(event.place);
              return (
                <li
                  key={idx}
                  className="p-3 bg-gray-700/50 rounded-lg border border-gray-700/40 transition-colors"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white">
                        {formatEventType(event.eventType, lang)}
                      </p>
                      {event.date && (
                        <p className="text-xs text-gray-300 mt-0.5">
                          {formatDate(event.date, lang)}
                        </p>
                      )}
                    </div>
                    {age !== null && (
                      <span className="flex-shrink-0 text-xs font-mono text-teal-300">
                        {t.ageAtEvent(age)}
                      </span>
                    )}
                  </div>
                  {event.place && (
                    <div className="flex items-center justify-between gap-2 mt-1.5">
                      <button
                        onClick={() => onSelectPlace(event.place!)}
                        className={`text-xs text-indigo-300 hover:underline ${
                          isRTL ? 'text-right' : 'text-left'
                        } p-0 bg-transparent border-none cursor-pointer`}
                      >
                        {event.place}
                      </button>
                      {isUnmapped && (
                        <MapPinIcon
                          className="h-4 w-4 text-gray-500 flex-shrink-0"
                          title={t.locationNotOnMap}
                        />
                      )}
                    </div>
                  )}
                </li>
              );
            })
          ) : (
            <p className="text-sm text-gray-500 italic">{t.noEventsForPerson}</p>
          )}
        </ul>

        <HistoricalContextView
          name={person.name}
          type="person"
          events={person.events}
          person={person}
          allPersons={allPersons}
        />
      </div>
    </div>
  );
};

const LocationDetailView = ({
  place,
  onBack,
  onSelectPersonById,
  onAddPin,
}: {
  place: Place;
  onBack: () => void;
  onSelectPersonById: (personId: string) => void;
  onAddPin: (place: Place) => void;
}) => {
  const { lang, t, isRTL } = useLanguage();
  const groupedEvents = getGroupedPlaceEvents(place.events);

  return (
    <div className="flex flex-col h-full">
      {place.lat === undefined && (
        <div className="bg-yellow-900/50 border border-yellow-700 text-yellow-200 p-3 rounded-lg mb-4 text-sm flex-shrink-0">
          <p className="font-semibold mb-2 text-center">{t.locationNotOnMap}</p>
          <button
            onClick={() => onAddPin(place)}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-3 rounded-md transition-colors text-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <PlusCircleIcon className="h-5 w-5" />
            <span>{t.addPinToMap}</span>
          </button>
        </div>
      )}
      <div className="flex items-center gap-2 pb-3 border-b border-gray-700 mb-4 flex-shrink-0">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
          aria-label="Back"
        >
          <ChevronLeftIcon className={`h-5 w-5 ${isRTL ? 'rotate-180' : ''}`} />
        </button>
        <h2 className="text-lg font-semibold truncate" title={place.name}>
          {place.name}
        </h2>
      </div>
      <div className="flex-grow overflow-y-auto min-h-0">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">{t.eventsAtLocation}</h3>
        <ul className="space-y-3">
          {groupedEvents.length > 0 ? (
            groupedEvents.map(item => (
              <li
                key={item.id}
                className="p-3 bg-gray-700/50 rounded-lg border border-gray-700/40"
              >
                <div className="flex justify-between items-center gap-2 mb-1">
                  <span className="font-semibold text-indigo-300 flex items-center gap-1.5 text-sm">
                    {item.isMarriage && <span>💍</span>}
                    <span>{formatEventType(item.eventType, lang)}</span>
                  </span>
                  {item.date && (
                    <span className="text-xs text-gray-300">{formatDate(item.date, lang)}</span>
                  )}
                </div>
                {item.isMarriage && item.people.length > 1 ? (
                  <p className="text-xs text-gray-300 mt-1">
                    <span className="text-gray-400">{t.spousesLabel} </span>
                    <button
                      onClick={() => onSelectPersonById(item.people[0].id)}
                      className="font-bold text-emerald-400 hover:underline cursor-pointer"
                    >
                      {item.people[0].name}
                    </button>
                    <span className="text-gray-400 mx-1">&amp;</span>
                    <button
                      onClick={() => onSelectPersonById(item.people[1].id)}
                      className="font-bold text-emerald-400 hover:underline cursor-pointer"
                    >
                      {item.people[1].name}
                    </button>
                  </p>
                ) : (
                  <p className="text-xs text-gray-300 mt-0.5">
                    {t.forPersonLabel}{' '}
                    <button
                      onClick={() => onSelectPersonById(item.people[0].id)}
                      className="font-semibold text-emerald-400 hover:underline cursor-pointer"
                    >
                      {item.people[0].name}
                    </button>
                  </p>
                )}
              </li>
            ))
          ) : (
            <p className="text-sm text-gray-500 italic">{t.noEventsForLocation}</p>
          )}
        </ul>

        <HistoricalContextView name={place.name} type="place" events={place.events} />
      </div>
    </div>
  );
};

const FilterPanel = ({ availableEventTypes, fullDateRange, filters, onFilterChange, onReset }) => {
  const { lang, t, isRTL } = useLanguage();
  const [isOpen, setIsOpen] = useState(true);

  const handleEventTypeChange = (eventType: string, checked: boolean) => {
    const newEventTypes = checked
      ? [...filters.eventTypes, eventType]
      : filters.eventTypes.filter(et => et !== eventType);
    onFilterChange({ ...filters, eventTypes: newEventTypes });
  };

  const handleDateRangeChange = (newRange: { start: number; end: number }) => {
    onFilterChange({ ...filters, dateRange: newRange });
  };

  if (!filters) return null;

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl my-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-3 font-semibold cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <FilterIcon className="h-5 w-5 text-indigo-400" />
          <span className="text-sm">{t.filtersTitle}</span>
        </div>
        <ChevronLeftIcon
          className={`h-5 w-5 transition-transform ${
            isOpen ? '-rotate-90' : isRTL ? 'rotate-180' : 'rotate-0'
          }`}
        />
      </button>
      {isOpen && (
        <div className="p-4 border-t border-gray-700 space-y-6">
          <div>
            <h4 className="font-semibold text-xs text-gray-300 mb-2.5">{t.eventTypesTitle}</h4>
            <div className="grid grid-cols-2 gap-2">
              {availableEventTypes.map(eventType => (
                <label
                  key={eventType}
                  className="flex items-center gap-2 text-xs text-gray-200 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 rounded bg-gray-700 border-gray-600 text-indigo-600 focus:ring-indigo-500 flex-shrink-0"
                    checked={filters.eventTypes.includes(eventType)}
                    onChange={e => handleEventTypeChange(eventType, e.target.checked)}
                  />
                  <span className="truncate" title={formatEventType(eventType, lang)}>
                    {formatEventType(eventType, lang)}
                  </span>
                </label>
              ))}
            </div>
          </div>
          {fullDateRange.min < fullDateRange.max && (
            <div>
              <div className="flex justify-between items-baseline mb-1">
                <h4 className="font-semibold text-xs text-gray-300">{t.dateRangeTitle}</h4>
                <span className="text-xs font-mono text-indigo-300" dir="ltr">
                  {filters.dateRange.start} - {filters.dateRange.end}
                </span>
              </div>
              <div dir="ltr">
                <RangeSlider
                  min={fullDateRange.min}
                  max={fullDateRange.max}
                  value={filters.dateRange}
                  onChange={handleDateRangeChange}
                />
              </div>
            </div>
          )}
          <button
            onClick={onReset}
            className="w-full text-center p-2 rounded-lg bg-gray-700 hover:bg-indigo-600 transition-colors font-semibold text-xs cursor-pointer"
          >
            {t.resetFilters}
          </button>
        </div>
      )}
    </div>
  );
};

const SidebarContent = ({
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
}) => {
  const { t, isRTL } = useLanguage();

  return (
    <>
      <header className="flex-shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <MapPinIcon className="h-6 w-6 text-indigo-400 flex-shrink-0" />
              <span>{t.appTitle}</span>
            </h1>
            <p className="text-gray-400 text-xs mt-1">{t.appSubtitle}</p>
          </div>
          <LanguageSwitcher />
        </div>
        {appState === AppState.Success && isGeocoding && (
          <div className="mt-3 p-2.5 bg-indigo-950/40 border border-indigo-800/30 rounded-xl text-xs text-indigo-200 flex flex-col space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 truncate min-w-0">
                <LoadingIcon className="h-3.5 w-3.5 animate-spin text-indigo-400 flex-shrink-0" />
                <span className="font-medium text-indigo-100 truncate">{progress.step}</span>
              </div>
              <span className="font-semibold text-indigo-300 whitespace-nowrap" dir="ltr">
                {progress.total > 0 ? `${progress.current}/${progress.total}` : ''}
              </span>
            </div>
            {progress.total > 0 && (
              <div className="w-full bg-indigo-950/80 rounded-full h-1 mt-1 overflow-hidden">
                <div
                  className="bg-indigo-400 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            )}
          </div>
        )}
      </header>

      <div className="py-4 flex-grow min-h-0 overflow-y-auto">
        {activePerson ? (
          <PersonDetailView
            person={activePerson}
            onBack={handleClearSelection}
            onSelectPlace={handleSelectPlaceByName}
            unmappedPlaceNames={unmappedPlaceNames}
            allPersons={persons}
          />
        ) : activePlace ? (
          <LocationDetailView
            place={activePlace}
            onBack={handleClearSelection}
            onSelectPersonById={handleSelectPersonById}
            onAddPin={handleManualPinDropRequest}
          />
        ) : (
          <div className="flex flex-col">
            {appState !== AppState.Success ? (
              <div className="py-6">
                <DataInputSection
                  onFileSelect={onFileSelect}
                  onSampleSelect={onSampleSelect}
                  onLoadShared={onLoadShared}
                  onSaveShared={onSaveShared}
                  hasShared={hasShared}
                  sharedSummary={sharedSummary}
                  onClearCache={handleClearCache}
                  hasCache={hasCache}
                  disabled={appState === AppState.Processing}
                />
              </div>
            ) : null}

            {appState === AppState.Initial && (
              <div className="flex h-full w-full items-center justify-center">
                <div className="text-center p-6">
                  <WorldIcon className="h-14 w-14 text-indigo-400 mb-3 mx-auto" />
                  <h3 className="text-lg font-semibold text-white">{t.welcomeTitle}</h3>
                  <p className="text-gray-400 text-xs mt-2 max-w-md mx-auto leading-relaxed">
                    {t.welcomeSubtitle}
                  </p>
                </div>
              </div>
            )}

            {appState === AppState.Success && (
              <>
                <FilterPanel
                  availableEventTypes={availableEventTypes}
                  fullDateRange={fullDateRange}
                  filters={filters}
                  onFilterChange={onFilterChange}
                  onReset={onResetFilters}
                />
                <div className="relative my-4">
                  <div
                    className={`absolute inset-y-0 ${
                      isRTL ? 'right-0 pr-3' : 'left-0 pl-3'
                    } flex items-center pointer-events-none`}
                  >
                    <SearchIcon className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder={t.searchPlaceholder}
                    aria-label={t.searchPlaceholder}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className={`w-full bg-gray-700/80 border border-gray-600 rounded-lg ${
                      isRTL ? 'pr-9 pl-9' : 'pl-9 pr-9'
                    } py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className={`absolute inset-y-0 ${
                        isRTL ? 'left-0 pl-3' : 'right-0 pr-3'
                      } flex items-center cursor-pointer`}
                      aria-label={t.clearSearch}
                    >
                      <CloseIcon className="h-4 w-4 text-gray-400 hover:text-white" />
                    </button>
                  )}
                </div>

                <div className="flex items-center bg-gray-700/50 rounded-lg p-1 gap-1 flex-shrink-0 mb-4">
                  <button
                    onClick={() => setViewMode(ViewMode.Location)}
                    className={`w-full flex items-center justify-center gap-2 p-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                      viewMode === ViewMode.Location
                        ? 'bg-indigo-600 text-white'
                        : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <ListIcon className="h-4 w-4" />
                    <span>{t.byLocation}</span>
                  </button>
                  <button
                    onClick={() => setViewMode(ViewMode.Person)}
                    className={`w-full flex items-center justify-center gap-2 p-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                      viewMode === ViewMode.Person
                        ? 'bg-indigo-600 text-white'
                        : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <UserIcon className="h-4 w-4" />
                    <span>{t.byPerson}</span>
                  </button>
                </div>

                <div>
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
                                className="p-3 rounded-lg bg-gray-800/50 flex items-center justify-between gap-2 cursor-pointer hover:bg-gray-700/50"
                              >
                                <div className="min-w-0">
                                  <p className="font-medium text-sm text-gray-300 truncate">
                                    {place.name}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    {t.eventsCount(place.events.length)}
                                  </p>
                                </div>
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleManualPinDropRequest(place);
                                  }}
                                  className="p-1 rounded-full text-indigo-400 hover:bg-gray-700 transition-colors flex-shrink-0 cursor-pointer"
                                  title={t.addPinToMap}
                                >
                                  <PlusCircleIcon className="h-6 w-6" />
                                </button>
                              </li>
                            ))}
                          </ul>
                          <p className="text-xs text-gray-500 mt-3">{t.unmappedExplanation}</p>
                        </div>
                      )}
                      {mappedPlaces.length === 0 && unmappedPlaces.length === 0 && (
                        <p className="text-sm text-gray-400 italic text-center mt-8">
                          {t.noLocationsMatch}
                        </p>
                      )}
                    </div>
                  ) : (
                    // Person View
                    <div>
                      <h2 className="text-sm font-semibold text-gray-200 flex items-center gap-2 mb-3">
                        <UserIcon className="h-4 w-4 text-gray-400" />
                        <span>
                          {t.personsCount} ({persons.length})
                        </span>
                      </h2>
                      {persons.length > 0 ? (
                        <ul className="space-y-2">
                          {persons.map(person => (
                            <li
                              key={person.id}
                              onClick={() => handlePersonSelect(person)}
                              className="p-3 rounded-lg cursor-pointer transition-all duration-200 bg-gray-700/50 hover:bg-gray-700"
                            >
                              <p className="font-medium text-sm text-white">{person.name}</p>
                              <p className="text-xs text-indigo-200 mt-0.5">
                                {t.eventsCount(person.events.length)}
                              </p>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-400 italic text-center mt-8">
                          {t.noPeopleMatch}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {appState === AppState.Success && (
        <div className="pt-4 border-t border-gray-700 flex-shrink-0 space-y-2">
          <label
            htmlFor="upload-new-file-sidebar"
            className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg bg-gray-700 hover:bg-indigo-600 transition-colors font-semibold text-sm cursor-pointer"
          >
            <UploadIcon className="h-4 w-4" />
            <span>{t.uploadNewFile}</span>
          </label>
          <input
            id="upload-new-file-sidebar"
            type="file"
            className="hidden"
            accept=".ged,.gedcom"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) {
                onFileSelect(file);
              }
            }}
          />
          <button
            onClick={handleExportGedcom}
            disabled={!originalGedcom}
            className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg bg-gray-700 font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:enabled:bg-indigo-600 cursor-pointer"
          >
            <DownloadIcon className="h-4 w-4" />
            <span>{t.exportWithCoords}</span>
          </button>
          <button
            onClick={handleStartOver}
            className="w-full text-center p-2.5 rounded-lg bg-gray-700 hover:bg-indigo-600 transition-colors font-semibold text-sm cursor-pointer"
          >
            {t.startOver}
          </button>
          {hasCache && (
            <button
              onClick={handleClearCache}
              className="w-full text-center p-2 rounded-lg bg-red-950/30 hover:bg-red-900/50 border border-red-800/40 text-red-200 transition-colors font-semibold text-xs mt-1 cursor-pointer"
            >
              {t.clearGeocodingCache}
            </button>
          )}
        </div>
      )}
    </>
  );
};

const ProgressDisplay = ({ progress }: { progress: ProgressState }) => {
  const { t, isRTL } = useLanguage();
  const percentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;
  return (
    <div
      className="absolute top-4 left-1/2 -translate-x-1/2 w-full max-w-lg z-[1001] px-4"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-700/50 rounded-2xl shadow-2xl p-4 w-full">
        <div className="flex flex-col items-center justify-center">
          <div className="flex items-center gap-3 w-full mb-2">
            <LoadingIcon className="h-5 w-5 animate-spin text-indigo-400 flex-shrink-0" />
            <h3 className="text-md font-semibold text-white">{t.processingTitle}</h3>
          </div>
          <p className="text-gray-400 text-sm w-full min-h-[1.5rem]">{progress.step}</p>
          {progress.total > 0 && (
            <div className="w-full mt-2">
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1" dir="ltr">
                {progress.current} / {progress.total}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const DesktopLayout = props => {
  const { t, isRTL } = useLanguage();
  return (
    <div className="flex h-full overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
      <aside
        className={`w-[384px] flex-shrink-0 bg-gray-800 flex flex-col ${
          isRTL ? 'border-l' : 'border-r'
        } border-gray-700/50`}
      >
        <div className="p-6 flex flex-col flex-grow min-h-0">
          <SidebarContent {...props} />
        </div>
      </aside>
      <main className="flex-1 relative flex flex-col h-full bg-gray-900">
        {props.appState === AppState.Processing && <ProgressDisplay progress={props.progress} />}
        {props.appState === AppState.Success && (
          <div className="bg-gray-800 border-b border-gray-700/50 px-6 py-2.5 flex items-center justify-between z-[1001] flex-shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => props.setActiveTab('map')}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
                  props.activeTab === 'map'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <span>🗺️</span>
                <span>{t.tabMap}</span>
              </button>
              <button
                onClick={() => props.setActiveTab('insights')}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
                  props.activeTab === 'insights'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <span>📊</span>
                <span>{t.tabInsights}</span>
              </button>
            </div>
            <LanguageSwitcher />
          </div>
        )}
        <div className="flex-1 relative min-h-0">
          {props.activeTab === 'map' ? (
            <MapDisplay
              places={props.filteredPlaces}
              allPlaces={props.allPlaces}
              activePlace={props.activePlace}
              activePerson={props.activePerson}
              mapRef={props.mapRef}
              onPlaceUpdate={props.handlePlaceUpdate}
              pinDropMode={props.pinDropMode}
              onPinDrop={props.onPinDrop}
              onPinDropCancel={props.onPinDropCancel}
              onSelectPersonById={props.handleSelectPersonById}
            />
          ) : (
            <DemographicInsights
              persons={props.persons}
              places={props.allPlaces}
              onSelectPerson={props.handleSelectPersonById}
              onSelectTab={props.setActiveTab}
            />
          )}
        </div>
      </main>
    </div>
  );
};

const MobileLayout = props => {
  const { appState, isSidebarOpen, setIsSidebarOpen } = props;
  const { t, isRTL } = useLanguage();

  if (appState === AppState.Initial) {
    return (
      <div
        className="h-full flex flex-col items-center justify-center p-4 relative"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <div className="absolute top-4 right-4">
          <LanguageSwitcher />
        </div>
        <div className="text-center p-6">
          <WorldIcon className="h-16 w-16 text-indigo-400 mb-4 mx-auto" />
          <h3 className="text-xl font-semibold text-white">{t.welcomeTitle}</h3>
          <p className="text-gray-400 text-sm mt-2 max-w-md mx-auto">{t.welcomeSubtitle}</p>
        </div>
        <div className="mt-6 w-full max-w-sm px-4">
          <DataInputSection
            onFileSelect={props.onFileSelect}
            onSampleSelect={props.onSampleSelect}
            onLoadShared={props.onLoadShared}
            onSaveShared={props.onSaveShared}
            hasShared={props.hasShared}
            sharedSummary={props.sharedSummary}
            onClearCache={props.handleClearCache}
            hasCache={props.hasCache}
            disabled={false}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="absolute inset-0 bg-black/60 z-[1002]"
        />
      )}
      <aside
        className={`absolute top-0 ${
          isRTL ? 'right-0' : 'left-0'
        } z-[1003] h-full w-5/6 max-w-md bg-gray-800 flex flex-col transition-transform duration-300 ease-in-out ${
          isSidebarOpen
            ? 'translate-x-0'
            : isRTL
            ? 'translate-x-full'
            : '-translate-x-full'
        }`}
      >
        <button
          onClick={() => setIsSidebarOpen(false)}
          className={`absolute top-4 ${
            isRTL ? 'left-4' : 'right-4'
          } p-1 text-gray-400 hover:text-white z-10 cursor-pointer`}
        >
          <CloseIcon className="h-6 w-6" />
        </button>
        <div className="p-4 pt-12 flex flex-col flex-grow min-h-0">
          <SidebarContent {...props} />
        </div>
      </aside>
      <main className="flex-1 h-full relative flex flex-col bg-gray-900">
        {props.appState === AppState.Processing && <ProgressDisplay progress={props.progress} />}
        {appState === AppState.Success && (
          <div className="bg-gray-800 border-b border-gray-700/50 px-3 py-2.5 flex items-center justify-between gap-2 z-[1001] flex-shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-1.5 bg-gray-800/80 border border-gray-700 rounded-lg text-white shadow-lg backdrop-blur-sm cursor-pointer"
                aria-label="Menu"
              >
                <MenuIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => props.setActiveTab('map')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  props.activeTab === 'map' ? 'bg-indigo-600 text-white' : 'text-gray-400'
                }`}
              >
                <span>🗺️</span>
                <span>{t.tabMapShort}</span>
              </button>
              <button
                onClick={() => props.setActiveTab('insights')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  props.activeTab === 'insights' ? 'bg-indigo-600 text-white' : 'text-gray-400'
                }`}
              >
                <span>📊</span>
                <span>{t.tabInsightsShort}</span>
              </button>
            </div>
            <LanguageSwitcher />
          </div>
        )}
        <div className="flex-1 relative min-h-0">
          {props.activeTab === 'map' ? (
            <MapDisplay
              places={props.filteredPlaces}
              allPlaces={props.allPlaces}
              activePlace={props.activePlace}
              activePerson={props.activePerson}
              mapRef={props.mapRef}
              onPlaceUpdate={props.handlePlaceUpdate}
              pinDropMode={props.pinDropMode}
              onPinDrop={props.onPinDrop}
              onPinDropCancel={props.onPinDropCancel}
              onSelectPersonById={props.handleSelectPersonById}
            />
          ) : (
            <DemographicInsights
              persons={props.persons}
              places={props.allPlaces}
              onSelectPerson={props.handleSelectPersonById}
              onSelectTab={props.setActiveTab}
            />
          )}
        </div>
      </main>
    </div>
  );
};

function AppContent() {
  const { t, isRTL } = useLanguage();
  const [appState, setAppState] = useState<AppState>(AppState.Initial);
  const [originalGedcom, setOriginalGedcom] = useState<string | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Location);
  const [activeTab, setActiveTab] = useState<'map' | 'insights'>('map');

  const [activePlace, setActivePlace] = useState<Place | null>(null);
  const [activePerson, setActivePerson] = useState<Person | null>(null);
  const [pinDropMode, setPinDropMode] = useState<Place | null>(null);

  const [filters, setFilters] = useState<FilterState | null>(null);
  const [availableEventTypes, setAvailableEventTypes] = useState<string[]>([]);
  const [fullDateRange, setFullDateRange] = useState<{ min: number; max: number }>({
    min: 1,
    max: new Date().getFullYear(),
  });
  const [searchQuery, setSearchQuery] = useState('');

  const [hasCache, setHasCache] = useState(false);

  useEffect(() => {
    setHasCache(Object.keys(getGeocodeCache()).length > 0);
  }, []);

  const handleClearCache = useCallback(() => {
    clearGeocodeCache();
    setHasCache(false);
  }, []);

  const [isGeocoding, setIsGeocoding] = useState(false);
  const geocodeTaskIdRef = useRef<number>(0);

  const mapRef = useRef<LeafletMap>(null);
  const [progress, setProgress] = useState<ProgressState>({ step: '', current: 0, total: 0 });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  const _processGedcomContent = useCallback(
    async (content: string) => {
      const taskId = ++geocodeTaskIdRef.current;
      setIsGeocoding(false);

      setAppState(AppState.Processing);
      setIsSidebarOpen(false);
      setProgress({ step: t.parsingGedcomStep, current: 0, total: 0 });
      setError(null);
      setPlaces([]);
      setPersons([]);
      setActivePlace(null);
      setActivePerson(null);
      setPinDropMode(null);
      setFilters(null);
      setSearchQuery('');
      setActiveTab('map');

      try {
        const { places: placesWithEvents, persons: personsMap } = await parseGedcom(
          content,
          (step, current, total) => {
            const localizedStep =
              step === 'Parsing lines...'
                ? t.parsingLinesStep
                : step === 'Finalizing relationships...'
                ? t.finalizingRelationshipsStep
                : step;
            setProgress({ step: localizedStep, current, total });
          }
        );

        setProgress({ step: t.analyzingFamilyDataStep, current: 0, total: 0 });
        await new Promise(resolve => setTimeout(resolve, 0));

        // Setup filters
        const allEvents = Array.from(personsMap.values()).flatMap(p => p.events);
        const eventTypeSet = new Set(
          allEvents.filter(e => !e.isInferred).map(e => e.eventType)
        );
        const years = allEvents
          .map(e => getYearFromDate(e.date))
          .filter((y): y is number => y !== undefined);
        const minYear = years.length > 0 ? Math.min(...years) : 1800;
        const maxYear = years.length > 0 ? Math.max(...years) : new Date().getFullYear();

        const sortedEventTypes = Array.from(eventTypeSet).sort();
        setAvailableEventTypes(sortedEventTypes);
        setFullDateRange({ min: minYear, max: maxYear });
        setFilters({
          eventTypes: sortedEventTypes,
          dateRange: { start: minYear, end: maxYear },
        });

        const sortedPersons = Array.from(personsMap.values())
          .filter(p => p.events.length > 0 || p.name !== 'Unknown')
          .sort((a, b) => a.name.localeCompare(b.name));
        setPersons(sortedPersons);

        const rawPlaceNames = Array.from(placesWithEvents.keys());

        if (rawPlaceNames.length === 0) {
          if (sortedPersons.length > 0) {
            setAppState(AppState.Success);
          } else {
            setError(t.noDataError);
            setAppState(AppState.Error);
          }
          return;
        }

        // 1. Instantly load any coordinates that already exist in our local cache or instant dictionary
        const cache = getGeocodeCache();
        const initialPlaces: Place[] = rawPlaceNames
          .map(name => {
            const coords = cache[name] || findKnownLocation(name);
            return {
              name,
              events: placesWithEvents.get(name) || [],
              lat: coords?.lat,
              lon: coords?.lon,
            };
          })
          .filter(p => p.events.length > 0)
          .sort((a, b) => a.name.localeCompare(b.name));

        setPlaces(initialPlaces);
        setAppState(AppState.Success);
        if (isMobile) {
          setIsSidebarOpen(true);
        }

        // 2. Identify if we have any uncached places we need to resolve
        const uncachedPlaces = rawPlaceNames.filter(
          name => !cache[name] && !findKnownLocation(name)
        );
        if (uncachedPlaces.length > 0) {
          setIsGeocoding(true);
          geocode(
            rawPlaceNames,
            progressUpdate => {
              if (taskId !== geocodeTaskIdRef.current) return;
              setProgress(progressUpdate);
            },
            batchResults => {
              if (taskId !== geocodeTaskIdRef.current || !batchResults.length) return;
              const batchMap = new Map<string, { lat: number; lon: number }>();
              for (const r of batchResults) {
                batchMap.set(r.name, r);
              }
              setPlaces(prevPlaces => {
                let changed = false;
                const updated = prevPlaces.map(place => {
                  const found = batchMap.get(place.name);
                  if (found && (place.lat !== found.lat || place.lon !== found.lon)) {
                    changed = true;
                    return { ...place, lat: found.lat, lon: found.lon };
                  }
                  return place;
                });
                return changed ? updated : prevPlaces;
              });
              setHasCache(true);
            }
          )
            .then(() => {
              if (taskId !== geocodeTaskIdRef.current) return;
              setIsGeocoding(false);
            })
            .catch(err => {
              console.error('Background geocoding error:', err);
              if (taskId !== geocodeTaskIdRef.current) return;
              setIsGeocoding(false);
            });
        }
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : t.unknownError);
        setAppState(AppState.Error);
      }
    },
    [isMobile, t]
  );

  const handleResetFilters = useCallback(() => {
    if (!availableEventTypes.length) return;
    setFilters({
      eventTypes: availableEventTypes,
      dateRange: { start: fullDateRange.min, end: fullDateRange.max },
    });
  }, [availableEventTypes, fullDateRange]);

  const filteredData = useMemo(() => {
    if (!filters || appState !== AppState.Success) {
      return { filteredPersons: persons, filteredPlaces: places };
    }

    const { eventTypes, dateRange } = filters;

    const isEventPassingFilter = event => {
      if (!event.isInferred && !eventTypes.includes(event.eventType)) {
        return false;
      }
      const year = getYearFromDate(event.date);
      if (year !== undefined && (year < dateRange.start || year > dateRange.end)) {
        return false;
      }
      return true;
    };

    let newFilteredPersons = persons
      .map(person => ({
        ...person,
        events: person.events.filter(isEventPassingFilter),
      }))
      .filter(person => person.events.length > 0);

    let newFilteredPlaces = places
      .map(place => ({
        ...place,
        events: place.events.filter(isEventPassingFilter),
      }))
      .filter(place => place.events.length > 0);

    const lowerCaseQuery = searchQuery.trim().toLowerCase();
    if (lowerCaseQuery) {
      newFilteredPersons = newFilteredPersons.filter(p =>
        p.name.toLowerCase().includes(lowerCaseQuery)
      );
      newFilteredPlaces = newFilteredPlaces.filter(p =>
        p.name.toLowerCase().includes(lowerCaseQuery)
      );
    }

    return { filteredPersons: newFilteredPersons, filteredPlaces: newFilteredPlaces };
  }, [places, persons, filters, appState, searchQuery]);

  const unmappedPlaceNames = useMemo(
    () =>
      new Set(
        places
          .filter(p => p.lat === undefined || p.lon === undefined)
          .map(p => p.name)
      ),
    [places]
  );

  useEffect(() => {
    if (activePerson && !filteredData.filteredPersons.find(p => p.id === activePerson.id)) {
      setActivePerson(null);
    }
    if (activePlace && !filteredData.filteredPlaces.find(p => p.name === activePlace.name)) {
      setActivePlace(null);
    }
  }, [filteredData, activePerson, activePlace]);

  const handleStartOver = () => {
    geocodeTaskIdRef.current++;
    setIsGeocoding(false);
    setAppState(AppState.Initial);
    setOriginalGedcom(null);
    setPlaces([]);
    setPersons([]);
    setError(null);
    setActivePlace(null);
    setActivePerson(null);
    setPinDropMode(null);
    setFilters(null);
    setProgress({ step: '', current: 0, total: 0 });
    setIsSidebarOpen(false);
    setSearchQuery('');
    setActiveTab('map');
  };

  const handleFileProcess = useCallback(
    async (file: File) => {
      const content = await file.text();
      setOriginalGedcom(content);
      try {
        saveSharedExport({
          source: 'GEDCOM-map',
          filename: file.name,
          gedcom: content,
          meta: { title: file.name },
        });
      } catch (_) {}
      await _processGedcomContent(content);
    },
    [_processGedcomContent]
  );

  const handleLoadShared = useCallback(async () => {
    const shared = loadSharedExport();
    if (!shared?.gedcom) return;
    setOriginalGedcom(shared.gedcom);
    await _processGedcomContent(shared.gedcom);
  }, [_processGedcomContent]);

  const handleSaveShared = useCallback(() => {
    if (!originalGedcom) return;
    try {
      saveSharedExport({
        source: 'GEDCOM-map',
        filename: 'from-gedcom-map.ged',
        gedcom: originalGedcom,
        meta: { personCount: persons?.length },
      });
    } catch (_) {}
  }, [originalGedcom, persons]);

  const handleSampleData = useCallback(async () => {
    setOriginalGedcom(sampleGedcomData);
    await _processGedcomContent(sampleGedcomData);
  }, [_processGedcomContent]);

  const handleExportGedcom = useCallback(() => {
    if (!originalGedcom) {
      return;
    }
    const newGedcomContent = generateGedcomWithCoords(originalGedcom, places);
    const blob = new Blob([newGedcomContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'gedcom_with_coords.ged';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [originalGedcom, places]);

  const handlePlaceUpdate = useCallback((updatedPlace: Place) => {
    setPlaces(prevPlaces =>
      prevPlaces.map(p => (p.name === updatedPlace.name ? updatedPlace : p))
    );
  }, []);

  const handlePinDrop = (place: Place, latlng: LatLng) => {
    handlePlaceUpdate({ ...place, lat: latlng.lat, lon: latlng.lng });
    saveGeocodeToCache(place.name, latlng.lat, latlng.lng);
    setHasCache(true);
    setPinDropMode(null);
  };

  const handlePlaceSelect = (place: Place) => {
    setActivePlace(place);
    setActivePerson(null);
    setPinDropMode(null);
    if (mapRef.current && place.lat && place.lon) {
      mapRef.current.flyTo([place.lat, place.lon], 13);
    }
  };

  const handlePersonSelect = useCallback((person: Person) => {
    setActivePerson(person);
    setActivePlace(null);
    setPinDropMode(null);
  }, []);

  const handleSelectPersonById = useCallback(
    (personId: string) => {
      const personToSelect = persons.find(p => p.id === personId);
      if (personToSelect) {
        handlePersonSelect(personToSelect);
        if (isMobile) {
          setIsSidebarOpen(true);
        }
      }
    },
    [persons, isMobile, handlePersonSelect]
  );

  const handleClearSelection = () => {
    setActivePerson(null);
    setActivePlace(null);
  };

  const handleSelectPlaceByName = (placeName: string) => {
    const placeToSelect = places.find(p => p.name === placeName);
    if (placeToSelect) {
      handlePlaceSelect(placeToSelect);
    }
  };

  const handleManualPinDropRequest = (place: Place) => {
    handleClearSelection();
    setPinDropMode(place);
    if (isMobile) setIsSidebarOpen(false);
  };

  const { filteredPersons, filteredPlaces } = filteredData;
  const filteredMappedPlaces = filteredPlaces.filter(
    p => p.lat !== undefined && p.lon !== undefined
  );
  const filteredUnmappedPlaces = filteredPlaces.filter(
    p => p.lat === undefined || p.lon === undefined
  );

  const activePersonWithFilteredEvents = activePerson
    ? filteredPersons.find(p => p.id === activePerson.id)
    : null;

  const activePlaceWithFilteredEvents = activePlace
    ? filteredPlaces.find(p => p.name === activePlace.name)
    : null;

  const sharedProps = {
    appState,
    persons: filteredPersons,
    error,
    viewMode,
    setViewMode,
    activePlace: activePlaceWithFilteredEvents,
    activePerson: activePersonWithFilteredEvents,
    mappedPlaces: filteredMappedPlaces,
    unmappedPlaces: filteredUnmappedPlaces,
    filteredPlaces,
    allPlaces: places,
    mapRef,
    isSidebarOpen,
    setIsSidebarOpen,
    progress,
    handleFileProcess,
    handlePlaceSelect,
    handlePersonSelect,
    handlePlaceUpdate,
    handleSampleData,
    handleStartOver,
    onFileSelect: handleFileProcess,
    onLoadShared: handleLoadShared,
    onSaveShared: handleSaveShared,
    hasShared: hasSharedExport(),
    sharedSummary: formatSharedSummary(loadSharedExport()),
    onSampleSelect: handleSampleData,
    originalGedcom,
    handleExportGedcom,
    handleClearSelection,
    handleSelectPlaceByName,
    handleManualPinDropRequest,
    handleSelectPersonById,
    pinDropMode,
    onPinDrop: handlePinDrop,
    onPinDropCancel: () => setPinDropMode(null),
    filters,
    availableEventTypes,
    fullDateRange,
    onFilterChange: setFilters,
    onResetFilters: handleResetFilters,
    searchQuery,
    setSearchQuery,
    unmappedPlaceNames,
    hasCache,
    handleClearCache,
    isGeocoding,
    activeTab,
    setActiveTab,
  };

  return (
    <div
      className="h-full bg-gray-900 font-sans text-white overflow-hidden"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {isMobile ? <MobileLayout {...sharedProps} /> : <DesktopLayout {...sharedProps} />}

      {appState === AppState.Error && (
        <div
          className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          <div className="bg-gray-800/80 border border-gray-700/50 rounded-2xl shadow-2xl p-8 w-full max-w-md">
            <div className="flex flex-col items-center justify-center text-center">
              <ErrorIcon className="h-12 w-12 text-red-400 mb-4" />
              <h3 className="text-xl font-semibold text-red-300">{t.errorTitle}</h3>
              <p className="text-gray-300 mt-2 max-w-sm">{error}</p>
              <button
                onClick={handleStartOver}
                className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors cursor-pointer"
              >
                {t.startOver}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}