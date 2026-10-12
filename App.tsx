

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Map as LeafletMap, LatLng } from 'leaflet';
import { AppState, type Place, type Person, ViewMode, type ProgressState, FilterState, EventInfo } from './types.ts';
import { parseGedcom } from './services/gedcomParser.ts';
import { geocode, saveGeocodeToCache, clearGeocodeCache, getGeocodeCache } from './services/geocodingService.ts';
import { generateGedcomWithCoords } from './services/gedcomGenerator.ts';
import { getYearFromDate, formatDate, calculateAgeAtEvent } from './services/utils.ts';
import FileUpload from './components/FileUpload.tsx';
import MapDisplay, { getGroupedPlaceEvents } from './components/MapDisplay.tsx';
import RangeSlider from './components/RangeSlider.tsx';
import { HistoricalContextView } from './components/HistoricalContextView.tsx';
import { DemographicInsights } from './components/DemographicInsights.tsx';
import { useIsMobile } from './hooks/useIsMobile.ts';
import { WorldIcon, UploadIcon, LoadingIcon, ErrorIcon, MapPinIcon, ListIcon, UserIcon, MenuIcon, CloseIcon, DownloadIcon, ChevronLeftIcon, PlusCircleIcon, FilterIcon, SearchIcon } from './components/icons.tsx';

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

const DataInputSection = ({ onFileSelect, onSampleSelect, onClearCache, hasCache, disabled }) => (
    <div className="space-y-4">
        <FileUpload onFileSelect={onFileSelect} disabled={disabled}>
            <UploadIcon className="h-5 w-5 mr-2" />
            Upload GEDCOM File
        </FileUpload>
        <div className="relative flex items-center">
            <div className="flex-grow border-t border-gray-600"></div>
            <span className="flex-shrink mx-4 text-gray-400 text-sm">OR</span>
            <div className="flex-grow border-t border-gray-600"></div>
        </div>
        <button
          onClick={onSampleSelect}
          disabled={disabled}
          className="w-full flex items-center justify-center p-3 rounded-md bg-gray-700 hover:bg-gray-600 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Try with Sample Data
        </button>
        {hasCache && (
            <button
              onClick={onClearCache}
              disabled={disabled}
              className="w-full text-center text-xs text-red-400 hover:text-red-300 transition-colors py-1 cursor-pointer"
            >
              Clear Cache of Saved Locations
            </button>
        )}
    </div>
);

const PersonDetailView = ({ person, onBack, onSelectPlace, unmappedPlaceNames, allPersons }: { person: Person, onBack: () => void, onSelectPlace: (placeName: string) => void, unmappedPlaceNames: Set<string>, allPersons: Person[]}) => {
    const birthEvent = React.useMemo(() => person.events.find(e => e.eventType === 'Birth'), [person.events]);
    const birthDate = birthEvent?.date || null;

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center pb-3 border-b border-gray-700 mb-4 flex-shrink-0">
                <button onClick={onBack} className="mr-3 p-1 rounded-full hover:bg-gray-700 transition-colors">
                    <ChevronLeftIcon className="h-6 w-6" />
                </button>
                <h2 className="text-lg font-semibold truncate" title={person.name}>{person.name}</h2>
            </div>
            <div className="flex-grow overflow-y-auto min-h-0">
                <h3 className="text-md font-semibold text-gray-300 mb-3">Timeline</h3>
                <ul className="space-y-3">
                    {person.events.length > 0 ? person.events.map((event, idx) => {
                        const age = event.eventType !== 'Birth' ? calculateAgeAtEvent(birthDate, event.date) : null;
                        const isUnmapped = event.place && unmappedPlaceNames.has(event.place);
                        return (
                            <li key={idx} className="p-3 bg-gray-700/50 rounded-md transition-colors">
                                <div className="flex justify-between items-start gap-3">
                                    <div className="flex-1">
                                        <p className="font-semibold text-white">{event.eventType}</p>
                                        {event.date && <p className="text-sm text-gray-400">{formatDate(event.date)}</p>}
                                    </div>
                                    {age !== null && (
                                        <span className="flex-shrink-0 text-xs font-mono bg-gray-800 text-teal-300 px-2 py-1 rounded-md">
                                            Age: {age}
                                        </span>
                                    )}
                                </div>
                                {event.place && (
                                    <div className="flex items-center justify-between mt-1">
                                        <button
                                            onClick={() => onSelectPlace(event.place!)}
                                            className="text-sm text-indigo-300 hover:underline text-left p-0 bg-transparent border-none cursor-pointer"
                                        >
                                            {event.place}
                                        </button>
                                        {isUnmapped && (
                                            <MapPinIcon className="h-4 w-4 text-gray-500 flex-shrink-0" title="Location not on map" />
                                        )}
                                    </div>
                                )}
                            </li>
                        );
                    }) : <p className="text-sm text-gray-500 italic">No events found for this person.</p>}
                </ul>

                <HistoricalContextView name={person.name} type="person" events={person.events} person={person} allPersons={allPersons} />
            </div>
        </div>
    );
};

const LocationDetailView = ({ place, onBack, onSelectPersonById, onAddPin }: { place: Place, onBack: () => void, onSelectPersonById: (personId: string) => void, onAddPin: (place: Place) => void }) => {
    const groupedEvents = getGroupedPlaceEvents(place.events);

    return (
    <div className="flex flex-col h-full">
         {place.lat === undefined && (
            <div className="bg-yellow-900/50 border border-yellow-700 text-yellow-200 p-3 rounded-md mb-4 text-sm flex-shrink-0">
                <p className="font-semibold mb-2 text-center">Location not on map</p>
                <button
                    onClick={() => onAddPin(place)}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-3 rounded-md transition-colors text-xs flex items-center justify-center"
                >
                    <PlusCircleIcon className="h-5 w-5 mr-2" />
                    Add Pin to Map
                </button>
            </div>
        )}
        <div className="flex items-center pb-3 border-b border-gray-700 mb-4 flex-shrink-0">
            <button onClick={onBack} className="mr-3 p-1 rounded-full hover:bg-gray-700 transition-colors">
                <ChevronLeftIcon className="h-6 w-6" />
            </button>
            <h2 className="text-lg font-semibold truncate" title={place.name}>{place.name}</h2>
        </div>
        <div className="flex-grow overflow-y-auto min-h-0">
            <h3 className="text-md font-semibold text-gray-300 mb-3">Events at this Location</h3>
             <ul className="space-y-3">
                {groupedEvents.length > 0 ? groupedEvents.map((item) => (
                    <li key={item.id} className="p-3 bg-gray-700/50 rounded-md">
                        <div className="flex justify-between items-center mb-1">
                            <span className="font-semibold text-indigo-300 flex items-center gap-1.5 text-sm">
                                {item.isMarriage && <span>💍</span>}
                                <span>{item.eventType}</span>
                            </span>
                            {item.date && <span className="text-xs text-gray-400">{formatDate(item.date)}</span>}
                        </div>
                        {item.isMarriage && item.people.length > 1 ? (
                            <p className="text-xs text-gray-300 mt-1">
                                <span className="text-gray-400">בני זוג: </span>
                                <button
                                    onClick={() => onSelectPersonById(item.people[0].id)}
                                    className="font-bold text-emerald-400 hover:underline"
                                >
                                    {item.people[0].name}
                                </button>
                                <span className="text-gray-400 mx-1">&amp;</span>
                                <button
                                    onClick={() => onSelectPersonById(item.people[1].id)}
                                    className="font-bold text-emerald-400 hover:underline"
                                >
                                    {item.people[1].name}
                                </button>
                            </p>
                        ) : (
                            <p className="text-xs text-gray-300 mt-0.5">
                                עבור:{' '}
                                <button
                                    onClick={() => onSelectPersonById(item.people[0].id)}
                                    className="font-semibold text-emerald-400 hover:underline"
                                >
                                    {item.people[0].name}
                                </button>
                            </p>
                        )}
                    </li>
                )) : <p className="text-sm text-gray-500 italic">No events found for this location.</p>}
            </ul>

            <HistoricalContextView name={place.name} type="place" events={place.events} />
        </div>
    </div>
    );
};

const FilterPanel = ({ availableEventTypes, fullDateRange, filters, onFilterChange, onReset }) => {
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
        <div className="bg-gray-800/50 rounded-lg my-4">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-3 font-semibold text-left">
                <div className="flex items-center">
                    <FilterIcon className="h-5 w-5 mr-2 text-indigo-400" />
                    Filters
                </div>
                 <ChevronLeftIcon className={`h-5 w-5 transition-transform ${isOpen ? '-rotate-90' : 'rotate-0'}`} />
            </button>
            {isOpen && (
                <div className="p-4 border-t border-gray-700 space-y-6">
                    <div>
                        <h4 className="font-semibold text-gray-300 mb-2">Event Types</h4>
                        <div className="grid grid-cols-2 gap-2">
                            {availableEventTypes.map(eventType => (
                                <label key={eventType} className="flex items-center space-x-2 text-sm cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="form-checkbox h-4 w-4 rounded bg-gray-700 border-gray-600 text-indigo-600 focus:ring-indigo-500"
                                        checked={filters.eventTypes.includes(eventType)}
                                        onChange={(e) => handleEventTypeChange(eventType, e.target.checked)}
                                    />
                                    <span>{eventType}</span>
                                 </label>
                            ))}
                        </div>
                    </div>
                    {fullDateRange.min < fullDateRange.max && (
                        <div>
                            <div className="flex justify-between items-baseline mb-1">
                                <h4 className="font-semibold text-gray-300">Date Range</h4>
                                <span className="text-sm font-mono text-indigo-300">{filters.dateRange.start} - {filters.dateRange.end}</span>
                            </div>
                            <RangeSlider
                                min={fullDateRange.min}
                                max={fullDateRange.max}
                                value={filters.dateRange}
                                onChange={handleDateRangeChange}
                            />
                        </div>
                    )}
                    <button onClick={onReset} className="w-full text-center p-2 rounded-md bg-gray-700 hover:bg-indigo-600 transition-colors font-semibold text-sm">
                        Reset Filters
                    </button>
                </div>
            )}
        </div>
    );
};

const SidebarContent = ({ appState, viewMode, setViewMode, persons, mappedPlaces, unmappedPlaces, activePerson, activePlace, handlePersonSelect, handlePlaceSelect, handleStartOver, onFileSelect, onSampleSelect, originalGedcom, handleExportGedcom, handleClearSelection, handleSelectPlaceByName, handleManualPinDropRequest, handleSelectPersonById, filters, availableEventTypes, fullDateRange, onFilterChange, onResetFilters, searchQuery, setSearchQuery, unmappedPlaceNames, hasCache, handleClearCache, isGeocoding, progress }) => (
    <>
        <header className="flex-shrink-0">
            <h1 className="text-2xl font-bold text-white flex items-center">
                <MapPinIcon className="h-7 w-7 mr-3 text-indigo-400" />
                GEDCOM Visualizer
            </h1>
            <p className="text-gray-400 text-sm">Mapping your ancestry.</p>
            {appState === AppState.Success && isGeocoding && (
                <div className="mt-3 p-2.5 bg-indigo-950/40 border border-indigo-800/30 rounded-xl text-xs text-indigo-200 flex flex-col space-y-1">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center truncate min-w-0">
                            <LoadingIcon className="h-3.5 w-3.5 animate-spin text-indigo-400 mr-2 flex-shrink-0" />
                            <span className="font-medium text-indigo-100 truncate">{progress.step}</span>
                        </div>
                        <span className="font-semibold text-indigo-300 whitespace-nowrap ml-2">
                            {progress.total > 0 ? `${progress.current}/${progress.total}` : ''}
                        </span>
                    </div>
                    {progress.total > 0 && (
                        <div className="w-full bg-indigo-950/80 rounded-full h-1 mt-1 overflow-hidden">
                            <div className="bg-indigo-400 h-1 rounded-full transition-all duration-300" style={{ width: `${(progress.current / progress.total) * 100}%` }}></div>
                        </div>
                    )}
                </div>
            )}
        </header>

        <div className="py-4 flex-grow min-h-0 overflow-y-auto">
            {activePerson ? (
                <PersonDetailView person={activePerson} onBack={handleClearSelection} onSelectPlace={handleSelectPlaceByName} unmappedPlaceNames={unmappedPlaceNames} allPersons={persons} />
            ) : activePlace ? (
                <LocationDetailView place={activePlace} onBack={handleClearSelection} onSelectPersonById={handleSelectPersonById} onAddPin={handleManualPinDropRequest} />
            ) : (
                <div className="flex flex-col">
                    {appState !== AppState.Success ? (
                        <div className="py-6">
                            <DataInputSection onFileSelect={onFileSelect} onSampleSelect={onSampleSelect} onClearCache={handleClearCache} hasCache={hasCache} disabled={appState === AppState.Processing} />
                        </div>
                    ) : null}
                    
                    {appState === AppState.Initial && (
                        <div className="flex h-full w-full items-center justify-center">
                            <div className="text-center p-8">
                                <WorldIcon className="h-16 w-16 text-indigo-400 mb-4 mx-auto" />
                                <h3 className="text-xl font-semibold text-white">Welcome!</h3>
                                <p className="text-gray-400 mt-2 max-w-md mx-auto">Upload a GEDCOM file or use sample data to begin.</p>
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
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <SearchIcon className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search persons or locations..."
                                    aria-label="Search persons or locations"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-gray-700/80 border border-gray-600 rounded-lg pl-10 pr-10 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                {searchQuery && (
                                    <button 
                                        onClick={() => setSearchQuery('')} 
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                        aria-label="Clear search"
                                    >
                                        <CloseIcon className="h-5 w-5 text-gray-400 hover:text-white" />
                                    </button>
                                )}
                            </div>
                            
                            <div className="flex items-center bg-gray-700/50 rounded-lg p-1 space-x-1 flex-shrink-0 mb-4">
                                <button onClick={() => setViewMode(ViewMode.Location)} className={`w-full flex items-center justify-center p-2 rounded-md text-sm font-semibold transition-colors ${viewMode === ViewMode.Location ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                                    <ListIcon className="h-5 w-5 mr-2" /> By Location
                                </button>
                                <button onClick={() => setViewMode(ViewMode.Person)} className={`w-full flex items-center justify-center p-2 rounded-md text-sm font-semibold transition-colors ${viewMode === ViewMode.Person ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                                    <UserIcon className="h-5 w-5 mr-2" /> By Person
                                </button>
                            </div>
                            <div className="">
                                {viewMode === ViewMode.Location ? (
                                    <div className="space-y-6">
                                        {mappedPlaces.length > 0 && (
                                            <div>
                                                <h2 className="text-lg font-semibold text-gray-200 flex items-center mb-3">
                                                    <ListIcon className="h-5 w-5 mr-2 text-gray-400" /> Mapped Locations ({mappedPlaces.length})
                                                </h2>
                                                <ul className="space-y-2">
                                                    {mappedPlaces.map((place) => (
                                                        <li key={`${place.name}-${place.lat}`} onClick={() => handlePlaceSelect(place)}
                                                            className="p-3 rounded-md cursor-pointer transition-all duration-200 bg-gray-700/50 hover:bg-gray-700">
                                                            <p className="font-medium text-white">{place.name}</p>
                                                            <p className="text-xs text-indigo-200">{place.events.length} event(s)</p>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        {unmappedPlaces.length > 0 && (
                                            <div>
                                                <h2 className="text-lg font-semibold text-gray-200 flex items-center mb-3 border-t border-gray-700 pt-4">
                                                    <MapPinIcon className="h-5 w-5 mr-2 text-gray-500" /> Unmapped Locations ({unmappedPlaces.length})
                                                </h2>
                                                <ul className="space-y-2">
                                                    {unmappedPlaces.map((place) => (
                                                        <li key={place.name} onClick={() => handlePlaceSelect(place)} className="p-3 rounded-md bg-gray-800/50 flex items-center justify-between cursor-pointer hover:bg-gray-700/50">
                                                            <div>
                                                                <p className="font-medium text-gray-400">{place.name}</p>
                                                                <p className="text-xs text-gray-500">{place.events.length} event(s)</p>
                                                            </div>
                                                            <button onClick={(e) => { e.stopPropagation(); handleManualPinDropRequest(place);}} className="p-1 rounded-full text-indigo-400 hover:bg-gray-700 transition-colors" title="Add pin to map">
                                                                <PlusCircleIcon className="h-7 w-7" />
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                                <p className="text-xs text-gray-500 mt-3">These places couldn't be geocoded.</p>
                                            </div>
                                        )}
                                        {(mappedPlaces.length === 0 && unmappedPlaces.length === 0) && (
                                            <p className="text-sm text-gray-400 italic text-center mt-8">No locations match the current filters.</p>
                                        )}
                                    </div>
                                ) : ( // Person View
                                    <div>
                                        <h2 className="text-lg font-semibold text-gray-200 flex items-center mb-3">
                                            <UserIcon className="h-5 w-5 mr-2 text-gray-400" /> Persons ({persons.length})
                                        </h2>
                                        {persons.length > 0 ? (
                                            <ul className="space-y-2">
                                                {persons.map((person) => (
                                                    <li key={person.id} onClick={() => handlePersonSelect(person)}
                                                        className="p-3 rounded-md cursor-pointer transition-all duration-200 bg-gray-700/50 hover:bg-gray-700">
                                                        <p className="font-medium text-white">{person.name}</p>
                                                        <p className="text-xs text-indigo-200">{person.events.length} event(s)</p>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                             <p className="text-sm text-gray-400 italic text-center mt-8">No people match the current filters.</p>
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
                <label htmlFor="upload-new-file-sidebar" className="w-full flex items-center justify-center p-3 rounded-md bg-gray-700 hover:bg-indigo-600 transition-colors font-semibold cursor-pointer">
                    <UploadIcon className="h-5 w-5 mr-2" />
                    Upload New File
                </label>
                <input id="upload-new-file-sidebar" type="file" className="hidden" accept=".ged,.gedcom"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) { onFileSelect(file); }
                    }}
                />
                <button onClick={handleExportGedcom} disabled={!originalGedcom} className="w-full flex items-center justify-center p-3 rounded-md bg-gray-700 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:enabled:bg-indigo-600">
                    <DownloadIcon className="h-5 w-5 mr-2" />
                    Export with Coordinates
                </button>
                <button onClick={handleStartOver} className="w-full text-center p-3 rounded-md bg-gray-700 hover:bg-indigo-600 transition-colors font-semibold">
                    Start Over
                </button>
                {hasCache && (
                    <button onClick={handleClearCache} className="w-full text-center p-2 rounded-md bg-red-950/30 hover:bg-red-900/50 border border-red-800/40 text-red-200 transition-colors font-semibold text-xs mt-2 cursor-pointer">
                        Clear Geocoding Cache
                    </button>
                )}
            </div>
        )}
    </>
);

const ProgressDisplay = ({ progress }: { progress: ProgressState }) => {
    const percentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;
    return (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-full max-w-lg z-[1001] px-4">
            <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-700/50 rounded-2xl shadow-2xl p-4 w-full">
                <div className="flex flex-col items-center justify-center text-center">
                    <div className="flex items-center w-full mb-2">
                        <LoadingIcon className="h-5 w-5 animate-spin text-indigo-400 mr-3" />
                        <h3 className="text-md font-semibold text-white">Processing...</h3>
                    </div>
                    <p className="text-gray-400 text-sm w-full text-left min-h-[1.5rem]">{progress.step}</p>
                    {progress.total > 0 && (
                        <div className="w-full mt-2">
                            <div className="w-full bg-gray-700 rounded-full h-2">
                                <div className="bg-indigo-500 h-2 rounded-full transition-all duration-300" style={{ width: `${percentage}%` }}></div>
                            </div>
                            <p className="text-xs text-gray-400 mt-1 text-right">{progress.current} / {progress.total}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const DesktopLayout = (props) => (
    <div className="flex h-full overflow-hidden">
        <aside className="w-[384px] flex-shrink-0 bg-gray-800 flex flex-col border-r border-gray-700/50">
            <div className="p-6 flex flex-col flex-grow min-h-0">
                <SidebarContent {...props} />
            </div>
        </aside>
        <main className="flex-1 relative flex flex-col h-full bg-gray-900">
            {props.appState === AppState.Processing && <ProgressDisplay progress={props.progress} />}
            {props.appState === AppState.Success && (
                <div className="bg-gray-800 border-b border-gray-700/50 px-6 py-2.5 flex items-center justify-between z-[1001] flex-shrink-0" dir="rtl">
                    <div className="flex items-center space-x-2 space-x-reverse">
                        <button 
                            onClick={() => props.setActiveTab('map')} 
                            className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 space-x-reverse transition-all duration-200 ${props.activeTab === 'map' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'}`}
                        >
                            <span>🗺️</span>
                            <span>מפת אירועים (Map Visualizer)</span>
                        </button>
                        <button 
                            onClick={() => props.setActiveTab('insights')} 
                            className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 space-x-reverse transition-all duration-200 ${props.activeTab === 'insights' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'}`}
                        >
                            <span>📊</span>
                            <span>תובנות דמוגרפיות (Demographic Insights)</span>
                        </button>
                    </div>
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

const MobileLayout = (props) => {
    const { appState, isSidebarOpen, setIsSidebarOpen } = props;

    if (appState === AppState.Initial) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-4">
                <div className="text-center p-8">
                    <WorldIcon className="h-16 w-16 text-indigo-400 mb-4 mx-auto" />
                    <h3 className="text-xl font-semibold text-white">Welcome to GEDCOM Map Visualizer</h3>
                    <p className="text-gray-400 mt-2 max-w-md mx-auto">Upload your GEDCOM file to begin.</p>
                </div>
                <div className="mt-8 w-full max-w-sm px-4">
                    <DataInputSection onFileSelect={props.onFileSelect} onSampleSelect={props.onSampleSelect} onClearCache={props.handleClearCache} hasCache={props.hasCache} disabled={false} />
                </div>
            </div>
        );
    }
    
    return (
        <div className="relative h-full overflow-hidden">
            {isSidebarOpen && (
                <div onClick={() => setIsSidebarOpen(false)} className="absolute inset-0 bg-black/60 z-[1002]" />
            )}
            <aside className={`absolute top-0 left-0 z-[1003] h-full w-5/6 max-w-md bg-gray-800 flex flex-col transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <button onClick={() => setIsSidebarOpen(false)} className="absolute top-4 right-4 p-1 text-gray-400 hover:text-white z-10">
                    <CloseIcon className="h-6 w-6" />
                </button>
                <div className="p-4 flex flex-col flex-grow min-h-0">
                    <SidebarContent {...props} />
                </div>
            </aside>
            <main className="flex-1 h-full relative flex flex-col bg-gray-900">
                 {props.appState === AppState.Processing && <ProgressDisplay progress={props.progress} />}
                 {appState === AppState.Success && (
                     <div className="bg-gray-800 border-b border-gray-700/50 pr-14 pl-4 py-2.5 flex items-center justify-start z-[1001] flex-shrink-0" dir="rtl">
                         {!isSidebarOpen && (
                            <button onClick={() => setIsSidebarOpen(true)} className="absolute top-2.5 right-4 z-[1001] p-1.5 bg-gray-800/80 border border-gray-700 rounded-lg text-white shadow-lg backdrop-blur-sm">
                                <MenuIcon className="h-5 w-5" />
                            </button>
                         )}
                         <div className="flex items-center space-x-2 space-x-reverse">
                            <button 
                                onClick={() => props.setActiveTab('map')} 
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1 space-x-reverse transition-all ${props.activeTab === 'map' ? 'bg-indigo-600 text-white' : 'text-gray-400'}`}
                            >
                                🗺️ מפה
                            </button>
                            <button 
                                onClick={() => props.setActiveTab('insights')} 
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1 space-x-reverse transition-all ${props.activeTab === 'insights' ? 'bg-indigo-600 text-white' : 'text-gray-400'}`}
                            >
                                📊 דמוגרפיה
                            </button>
                         </div>
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


export default function App() {
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
  const [fullDateRange, setFullDateRange] = useState<{ min: number; max: number }>({ min: 1, max: new Date().getFullYear() });
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

  const _processGedcomContent = useCallback(async (content: string) => {
    const taskId = ++geocodeTaskIdRef.current;
    setIsGeocoding(false);

    setAppState(AppState.Processing);
    setIsSidebarOpen(false);
    setProgress({ step: 'Parsing GEDCOM file...', current: 0, total: 0 });
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
      const { places: placesWithEvents, persons: personsMap } = await parseGedcom(content, (step, current, total) => {
          setProgress({ step, current, total });
      });
      
      setProgress({ step: 'Analyzing family data...', current: 0, total: 0 });
      await new Promise(resolve => setTimeout(resolve, 0));

      // Setup filters
      const allEvents = Array.from(personsMap.values()).flatMap(p => p.events);
      const eventTypeSet = new Set(allEvents.filter(e => !e.isInferred).map(e => e.eventType));
      const years = allEvents.map(e => getYearFromDate(e.date)).filter((y): y is number => y !== undefined);
      const minYear = years.length > 0 ? Math.min(...years) : 1800;
      const maxYear = years.length > 0 ? Math.max(...years) : new Date().getFullYear();
      
      const sortedEventTypes = Array.from(eventTypeSet).sort();
      setAvailableEventTypes(sortedEventTypes);
      setFullDateRange({ min: minYear, max: maxYear });
      setFilters({
          eventTypes: sortedEventTypes,
          dateRange: { start: minYear, end: maxYear }
      });
      
      const sortedPersons = Array.from(personsMap.values())
        .filter(p => p.events.length > 0 || p.name !== 'Unknown') // Filter out empty/unknown persons
        .sort((a, b) => a.name.localeCompare(b.name));
      setPersons(sortedPersons);
      
      const rawPlaceNames = Array.from(placesWithEvents.keys());

      if (rawPlaceNames.length === 0) {
        if(sortedPersons.length > 0) {
            setAppState(AppState.Success);
        } else {
            setError("No people or places found in the GEDCOM file.");
            setAppState(AppState.Error);
        }
        return;
      }

      // 1. Instantly load any coordinates that already exist in our local cache
      const cache = getGeocodeCache();
      const initialPlaces: Place[] = rawPlaceNames.map(name => {
        const coords = cache[name];
        return {
          name,
          events: placesWithEvents.get(name) || [],
          lat: coords?.lat,
          lon: coords?.lon,
        };
      }).filter(p => p.events.length > 0)
        .sort((a, b) => a.name.localeCompare(b.name));

      setPlaces(initialPlaces);
      setAppState(AppState.Success);
      if (isMobile) {
          setIsSidebarOpen(true);
      }

      // 2. Identify if we have any uncached places we need to resolve
      const uncachedPlaces = rawPlaceNames.filter(name => !cache[name]);
      if (uncachedPlaces.length > 0) {
        setIsGeocoding(true);
        // Start background geocoding progressively
        geocode(rawPlaceNames, (progressUpdate) => {
            if (taskId !== geocodeTaskIdRef.current) return;
            setProgress(progressUpdate);
        }, (batchResults) => {
            if (taskId !== geocodeTaskIdRef.current) return;
            setPlaces(prevPlaces => {
                return prevPlaces.map(place => {
                    const found = batchResults.find(r => r.name === place.name);
                    if (found) {
                        return { ...place, lat: found.lat, lon: found.lon };
                    }
                    return place;
                });
            });
            setHasCache(true);
        }).then(() => {
            if (taskId !== geocodeTaskIdRef.current) return;
            setIsGeocoding(false);
        }).catch(err => {
            console.error("Background geocoding error:", err);
            if (taskId !== geocodeTaskIdRef.current) return;
            setIsGeocoding(false);
        });
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
      setAppState(AppState.Error);
    }
  }, [isMobile]);

  const handleResetFilters = useCallback(() => {
    if (!availableEventTypes.length) return;
     setFilters({
        eventTypes: availableEventTypes,
        dateRange: { start: fullDateRange.min, end: fullDateRange.max }
    });
  }, [availableEventTypes, fullDateRange]);

  const filteredData = useMemo(() => {
    if (!filters || appState !== AppState.Success) {
        return { filteredPersons: persons, filteredPlaces: places };
    }

    const { eventTypes, dateRange } = filters;

    const isEventPassingFilter = (event) => {
        // Inferred events are always shown in the timeline and not part of the filter checklist,
        // so they should pass the eventType filter. They are still subject to date filtering.
        if (!event.isInferred && !eventTypes.includes(event.eventType)) {
            return false;
        }
        const year = getYearFromDate(event.date);
        // If year is undefined, it passes the date filter.
        if (year !== undefined && (year < dateRange.start || year > dateRange.end)) {
            return false;
        }
        return true;
    };
    
    let newFilteredPersons = persons.map(person => ({
        ...person,
        events: person.events.filter(isEventPassingFilter)
    })).filter(person => person.events.length > 0);

    let newFilteredPlaces = places.map(place => ({
        ...place,
        events: place.events.filter(isEventPassingFilter)
    })).filter(place => place.events.length > 0);

    const lowerCaseQuery = searchQuery.trim().toLowerCase();
    if (lowerCaseQuery) {
        newFilteredPersons = newFilteredPersons.filter(p => p.name.toLowerCase().includes(lowerCaseQuery));
        newFilteredPlaces = newFilteredPlaces.filter(p => p.name.toLowerCase().includes(lowerCaseQuery));
    }
    
    return { filteredPersons: newFilteredPersons, filteredPlaces: newFilteredPlaces };

  }, [places, persons, filters, appState, searchQuery]);
  
  const unmappedPlaceNames = useMemo(() => 
    new Set(places.filter(p => p.lat === undefined || p.lon === undefined).map(p => p.name)),
  [places]);

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

  const handleFileProcess = useCallback(async (file: File) => {
    const content = await file.text();
    setOriginalGedcom(content);
    await _processGedcomContent(content);
  }, [_processGedcomContent]);

  const handleSampleData = useCallback(async () => {
    setOriginalGedcom(sampleGedcomData);
    await _processGedcomContent(sampleGedcomData);
  }, [_processGedcomContent]);
  
  const handleExportGedcom = useCallback(() => {
    if (!originalGedcom) {
        alert("Cannot export. Original file not available. Please upload a file first.");
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
    // Update base places array
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

  const handleSelectPersonById = useCallback((personId: string) => {
    const personToSelect = persons.find(p => p.id === personId);
    if (personToSelect) {
        handlePersonSelect(personToSelect);
        if(isMobile) {
            setIsSidebarOpen(true);
        }
    }
  }, [persons, isMobile, handlePersonSelect]);

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
  const filteredMappedPlaces = filteredPlaces.filter(p => p.lat !== undefined && p.lon !== undefined);
  const filteredUnmappedPlaces = filteredPlaces.filter(p => p.lat === undefined || p.lon === undefined);
  
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
      setActiveTab
  };

  return (
    <div className="h-full bg-gray-900 font-sans text-white overflow-hidden">
      { isMobile ? <MobileLayout {...sharedProps} /> : <DesktopLayout {...sharedProps} /> }

      {appState === AppState.Error && (
        <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800/80 border border-gray-700/50 rounded-2xl shadow-2xl p-8 w-full max-w-md">
                <div className="flex flex-col items-center justify-center text-center">
                    <ErrorIcon className="h-12 w-12 text-red-400 mb-4" />
                    <h3 className="text-xl font-semibold text-red-300">An Error Occurred</h3>
                    <p className="text-gray-300 mt-2 max-w-sm">{error}</p>
                    <button onClick={handleStartOver} className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                        Start Over
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}