import React, { useMemo, useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, useMapEvents, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import type { Place, Person, PersonEvent, EventInfo } from '../types.ts';
import { formatDate, getYearFromDate, compareEventDates } from '../services/utils.ts';
import { MapPin, Crosshair, Layers, Check } from 'lucide-react';

export interface MapDisplayProps {
  places: Place[];
  allPlaces: Place[];
  activePlace: Place | null;
  activePerson: Person | null;
  mapRef?: React.RefObject<any>;
  onPlaceUpdate: (place: Place) => void;
  pinDropMode: Place | null;
  onPinDrop: (place: Place, latlng: { lat: number; lng: number }) => void;
  onPinDropCancel: () => void;
  onSelectPersonById: (personId: string) => void;
}

// --- Leaflet Custom Pin Icons ---
const createCustomIcon = (isActive: boolean) => {
  const bgColor = isActive ? '#0d9488' : '#4f46e5';
  const borderColor = '#ffffff';
  const pulseHtml = isActive ? '<span class="absolute -top-1 -left-1 w-8 h-8 rounded-full bg-teal-400 opacity-75 animate-ping"></span>' : '';
  
  return new L.DivIcon({
    html: `
      <div class="relative flex items-center justify-center">
        ${pulseHtml}
        <svg width="26" height="32" viewBox="0 0 24 30" fill="none" xmlns="http://www.w3.org/2000/svg" class="drop-shadow-md transition-transform hover:scale-110">
          <path d="M12 0C5.37258 0 0 5.37258 0 12C0 19.5 12 30 12 30C12 30 24 19.5 24 12C24 5.37258 18.6274 0 12 0Z" fill="${bgColor}" stroke="${borderColor}" stroke-width="1.5"/>
          <circle cx="12" cy="11" r="4.5" fill="#ffffff"/>
        </svg>
      </div>
    `,
    className: 'custom-map-pin',
    iconSize: [26, 32],
    iconAnchor: [13, 30],
    popupAnchor: [0, -30]
  });
};

const defaultIcon = createCustomIcon(false);
const activeIcon = createCustomIcon(true);

// --- Grouped Events for Place Display ---
export interface DisplayGroupedEvent {
  id: string;
  eventType: string;
  date: string | null;
  isMarriage: boolean;
  people: { id: string; name: string }[];
}

export const getGroupedPlaceEvents = (events: EventInfo[]): DisplayGroupedEvent[] => {
  const result: DisplayGroupedEvent[] = [];
  const processedMarriageIndices = new Set<number>();

  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    const isMarr = e.eventType === 'Marriage' || e.eventType === 'נישואין' || e.eventType === 'חתונה';

    if (isMarr && !processedMarriageIndices.has(i)) {
      // Look for a matching spouse marriage event at this place
      let matchedIndex = -1;
      for (let j = 0; j < events.length; j++) {
        if (i === j || processedMarriageIndices.has(j)) continue;
        const other = events[j];
        const otherIsMarr = other.eventType === 'Marriage' || other.eventType === 'נישואין' || other.eventType === 'חתונה';
        if (!otherIsMarr) continue;

        // Match if explicit spouseId matches OR (different persons and matching date)
        const explicitSpouseMatch = (e.spouseId && e.spouseId === other.personId) || 
                                    (other.spouseId && other.spouseId === e.personId);
        const sameDateAndDiffPerson = e.personId !== other.personId && (
          (e.date && other.date && e.date === other.date) || (!e.date && !other.date)
        );

        if (explicitSpouseMatch || sameDateAndDiffPerson) {
          matchedIndex = j;
          break;
        }
      }

      if (matchedIndex !== -1) {
        processedMarriageIndices.add(i);
        processedMarriageIndices.add(matchedIndex);
        const other = events[matchedIndex];
        result.push({
          id: `marr-${e.personId}-${other.personId}-${i}`,
          eventType: 'נישואין',
          date: e.date || other.date,
          isMarriage: true,
          people: [
            { id: e.personId, name: e.personName },
            { id: other.personId, name: other.personName }
          ]
        });
        continue;
      }

      // Single marriage event
      processedMarriageIndices.add(i);
      result.push({
        id: `marr-${e.personId}-${i}`,
        eventType: 'נישואין',
        date: e.date,
        isMarriage: true,
        people: [{ id: e.personId, name: e.personName }]
      });
      continue;
    }

    if (!isMarr) {
      result.push({
        id: `ev-${e.personId}-${i}`,
        eventType: e.eventType,
        date: e.date,
        isMarriage: false,
        people: [{ id: e.personId, name: e.personName }]
      });
    }
  }

  return result.sort((a, b) => {
    const dateComparison = compareEventDates(a.date, b.date);
    if (dateComparison !== 0) {
      return dateComparison;
    }
    return a.eventType.localeCompare(b.eventType);
  });
};

// --- Leaflet Person Path ---
const LeafletPersonPath: React.FC<{ activePerson: Person | null; places: Place[] }> = ({ activePerson, places }) => {
  if (!activePerson) return null;

  const placeMap = useMemo(() => {
    const filtered = places.filter(p => {
      if (p.lat == null || p.lon == null) return false;
      const latVal = parseFloat(String(p.lat));
      const lonVal = parseFloat(String(p.lon));
      return !isNaN(latVal) && !isNaN(lonVal);
    });
    return new Map(filtered.map(p => [p.name, p]));
  }, [places]);

  const pathCoordinates = useMemo(() => {
    const coords: [number, number][] = [];
    activePerson.events
      .map(event => event.place ? placeMap.get(event.place) : null)
      .filter((place): place is Place => {
        if (!place || place.lat == null || place.lon == null) return false;
        const latVal = parseFloat(String(place.lat));
        const lonVal = parseFloat(String(place.lon));
        return !isNaN(latVal) && !isNaN(lonVal);
      })
      .forEach(place => {
        const newCoord: [number, number] = [parseFloat(String(place.lat)), parseFloat(String(place.lon))];
        if (coords.length === 0 || coords[coords.length - 1][0] !== newCoord[0] || coords[coords.length - 1][1] !== newCoord[1]) {
          coords.push(newCoord);
        }
      });
    return coords;
  }, [activePerson, placeMap]);

  const locationsWithEvents = useMemo(() => {
    const grouped = new Map<string, { place: Place; events: PersonEvent[] }>();
    activePerson.events.forEach(event => {
      if (!event.place) return;
      const place = placeMap.get(event.place);
      if (place && place.lat != null && place.lon != null) {
        const latVal = parseFloat(String(place.lat));
        const lonVal = parseFloat(String(place.lon));
        if (!isNaN(latVal) && !isNaN(lonVal)) {
          const key = `${latVal},${lonVal}`;
          if (!grouped.has(key)) {
            grouped.set(key, { place, events: [] });
          }
          grouped.get(key)!.events.push(event);
        }
      }
    });
    return Array.from(grouped.values());
  }, [activePerson, placeMap]);

  return (
    <>
      {pathCoordinates.length > 1 && (
        <Polyline 
          pathOptions={{ color: '#ea580c', weight: 4, opacity: 0.85, dashArray: '6, 6' }} 
          positions={pathCoordinates as L.LatLngExpression[]} 
        />
      )}
      {locationsWithEvents.map(({ place, events }, index) => {
        const latVal = parseFloat(String(place.lat));
        const lonVal = parseFloat(String(place.lon));
        const isFirst = index === 0;
        const isLast = index === locationsWithEvents.length - 1;

        return (
          <CircleMarker
            key={`${place.name}-${index}`}
            center={[latVal, lonVal]}
            radius={isFirst || isLast ? 8 : 6}
            pathOptions={{ 
              color: isFirst ? '#059669' : isLast ? '#dc2626' : '#ea580c', 
              fillColor: isFirst ? '#34d399' : isLast ? '#f87171' : '#fed7aa', 
              fillOpacity: 0.95, 
              weight: 2.5 
            }}
          >
            <Popup>
              <div className="text-right p-1 min-w-[200px]" dir="rtl">
                <span className="text-[10px] font-bold text-orange-600 block uppercase tracking-wide">
                  {isFirst ? '🟢 נקודת התחלה' : isLast ? '🔴 נקודה אחרונה' : `נקודת ציון ${index + 1}`}
                </span>
                <h4 className="font-bold text-sm text-gray-900 mt-0.5">{place.name}</h4>
                <p className="text-xs text-gray-500 mb-2">אירועים עבור {activePerson.name}</p>
                <ul className="space-y-1.5 text-xs max-h-48 overflow-y-auto">
                  {events.map((event, i) => (
                    <li key={i} className="flex justify-between items-center border-b border-gray-100 pb-1">
                      <span className="font-semibold text-gray-800">{event.eventType}</span>
                      <span className="text-gray-500 text-[11px]">{formatDate(event.date)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
};

// --- Leaflet Bounds Fitter ---
const LeafletBoundsFitter: React.FC<{
  places: Place[];
  activePlace: Place | null;
  activePerson: Person | null;
  allPlaces: Place[];
}> = ({ places, activePlace, activePerson, allPlaces }) => {
  const map = useMap();

  useEffect(() => {
    if (activePlace && activePlace.lat != null && activePlace.lon != null) {
      const latVal = parseFloat(String(activePlace.lat));
      const lonVal = parseFloat(String(activePlace.lon));
      if (!isNaN(latVal) && !isNaN(lonVal)) {
        map.flyTo([latVal, lonVal], 13, { duration: 1 });
        return;
      }
    }

    const placesToBound = activePerson
      ? allPlaces.filter(p => activePerson.events.some(e => e.place === p.name))
      : places;
    
    const validPlaces = placesToBound.filter(p => {
      if (p.lat == null || p.lon == null) return false;
      const latVal = parseFloat(String(p.lat));
      const lonVal = parseFloat(String(p.lon));
      return !isNaN(latVal) && !isNaN(lonVal);
    });

    if (validPlaces.length > 0) {
      const bounds = L.latLngBounds(validPlaces.map(p => [
        parseFloat(String(p.lat)),
        parseFloat(String(p.lon))
      ]));
      map.flyToBounds(bounds, { padding: [50, 50], maxZoom: 14, duration: 1 });
    } else if (!activePlace && !activePerson) {
      map.setView([31.7683, 35.2137], 3);
    }
  }, [places, activePlace, activePerson, allPlaces, map]);

  return null;
};

// --- Map Size Invalidation Helper ---
const MapResizer: React.FC = () => {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const t1 = setTimeout(() => map.invalidateSize(), 100);
    const t2 = setTimeout(() => map.invalidateSize(), 300);
    const t3 = setTimeout(() => map.invalidateSize(), 800);

    const onResize = () => map.invalidateSize();
    window.addEventListener('resize', onResize);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener('resize', onResize);
    };
  }, [map]);

  return null;
};

// --- Leaflet Map Events ---
const LeafletMapEvents: React.FC<{
  pinDropMode: Place | null;
  onPinDrop: (place: Place, latlng: { lat: number; lng: number }) => void;
}> = ({ pinDropMode, onPinDrop }) => {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    if (pinDropMode) {
      container.style.cursor = 'crosshair';
    } else {
      container.style.cursor = '';
    }
  }, [pinDropMode, map]);

  useMapEvents({
    click: (e) => {
      if (pinDropMode) {
        onPinDrop(pinDropMode, { lat: e.latlng.lat, lng: e.latlng.lng });
      }
    }
  });

  return null;
};

type TileStyle = 'osm' | 'esriTopo' | 'satellite' | 'voyager';

const TILE_LAYERS: Record<TileStyle, { name: string; url: string; attribution: string; maxZoom: number }> = {
  osm: {
    name: 'פירוט רחובות (OpenStreetMap)',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  },
  esriTopo: {
    name: 'מפה טופוגרפית (Esri Topo)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, USGS, NOAA',
    maxZoom: 19
  },
  satellite: {
    name: 'תצלומי לוויין (Esri Imagery)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri',
    maxZoom: 19
  },
  voyager: {
    name: 'מפה מעודנת (CARTO Voyager)',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19
  }
};

// ==========================================
// MAIN MAP DISPLAY CONTAINER
// ==========================================
export const MapDisplay: React.FC<MapDisplayProps> = (props) => {
  const [tileStyle, setTileStyle] = useState<TileStyle>('osm');
  const [showLayerMenu, setShowLayerMenu] = useState<boolean>(false);

  const {
    places,
    allPlaces,
    activePlace,
    activePerson,
    mapRef,
    onPlaceUpdate,
    pinDropMode,
    onPinDrop,
    onPinDropCancel,
    onSelectPersonById
  } = props;

  const handleDragEnd = (event: L.DragEndEvent, place: Place) => {
    const marker = event.target;
    const position = marker.getLatLng();
    onPlaceUpdate({
      ...place,
      lat: position.lat,
      lon: position.lng,
    });
  };

  const validPlaces = useMemo(() => {
    return places.filter(p => {
      if (p.lat == null || p.lon == null) return false;
      const latVal = parseFloat(String(p.lat));
      const lonVal = parseFloat(String(p.lon));
      return !isNaN(latVal) && !isNaN(lonVal);
    });
  }, [places]);

  const currentLayer = TILE_LAYERS[tileStyle];

  return (
    <div className="relative w-full h-full overflow-hidden bg-gray-900">
      {/* Top Floating Controls: Map Layer Switcher */}
      <div className="absolute top-4 left-4 z-[1000] flex items-center space-x-2">
        <div className="relative">
          <button
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            className="bg-gray-900/90 backdrop-blur-md border border-gray-700/80 px-3 py-2 rounded-2xl shadow-xl hover:bg-gray-800 text-gray-200 transition-colors flex items-center space-x-2 space-x-reverse"
            title="שכבות וסגנון מפה"
          >
            <Layers className="h-4 w-4 text-indigo-400" />
            <span className="text-xs font-semibold">{currentLayer.name.split('(')[0].trim()}</span>
          </button>

          {showLayerMenu && (
            <div className="absolute top-11 left-0 bg-gray-900/95 border border-gray-700/90 backdrop-blur-xl rounded-2xl shadow-2xl p-2 min-w-[220px] z-[1010] text-xs space-y-1" dir="rtl">
              <div className="text-[11px] font-bold text-gray-400 px-2.5 py-1">סגנון שכבת מפה:</div>
              {(Object.keys(TILE_LAYERS) as TileStyle[]).map((key) => (
                <button
                  key={key}
                  onClick={() => {
                    setTileStyle(key);
                    setShowLayerMenu(false);
                  }}
                  className={`w-full text-right px-3 py-2 rounded-xl font-medium transition-colors flex items-center justify-between ${
                    tileStyle === key 
                      ? 'bg-indigo-600/30 text-indigo-300 font-bold border border-indigo-500/40' 
                      : 'hover:bg-gray-800 text-gray-300'
                  }`}
                >
                  <span>{TILE_LAYERS[key].name}</span>
                  {tileStyle === key && <Check className="h-3.5 w-3.5 text-indigo-400" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="relative w-full h-full">
        {/* Pin Drop Mode Banner */}
        {pinDropMode && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-md px-4">
            <div className="bg-indigo-600/95 backdrop-blur-md border border-indigo-400/50 rounded-2xl shadow-2xl p-3 flex items-center justify-between text-white animate-pulse">
              <div className="flex items-center space-x-2 space-x-reverse overflow-hidden">
                <Crosshair className="h-5 w-5 text-indigo-200 flex-shrink-0" />
                <p className="text-xs font-bold truncate">
                  לחץ על המפה כדי למקם סיכה עבור &quot;{pinDropMode.name}&quot;
                </p>
              </div>
              <button 
                onClick={onPinDropCancel} 
                className="text-xs font-extrabold py-1.5 px-3 rounded-xl bg-indigo-800 hover:bg-indigo-900 border border-indigo-400/40 text-white transition-all shadow-md flex-shrink-0"
              >
                ביטול
              </button>
            </div>
          </div>
        )}

        <MapContainer 
          ref={mapRef} 
          center={[31.7683, 35.2137]} 
          zoom={3} 
          scrollWheelZoom={true} 
          className="w-full h-full"
          maxZoom={19}
        >
          <MapResizer />
          <TileLayer
            key={tileStyle}
            attribution={currentLayer.attribution}
            url={currentLayer.url}
            maxZoom={currentLayer.maxZoom}
          />
          <LeafletBoundsFitter 
            places={places} 
            activePlace={activePlace} 
            activePerson={activePerson} 
            allPlaces={allPlaces} 
          />
          <LeafletMapEvents 
            pinDropMode={pinDropMode} 
            onPinDrop={onPinDrop} 
          />
          
          {activePerson ? (
            <LeafletPersonPath activePerson={activePerson} places={allPlaces} />
          ) : (
            validPlaces.map(place => {
              const latVal = parseFloat(String(place.lat));
              const lonVal = parseFloat(String(place.lon));
              const isActive = activePlace?.name === place.name;
              const groupedEvents = getGroupedPlaceEvents(place.events);

              return (
                <Marker 
                  key={place.name} 
                  position={[latVal, lonVal]}
                  icon={isActive ? activeIcon : defaultIcon}
                  draggable={true}
                  eventHandlers={{
                    dragend: (e) => handleDragEnd(e, place),
                  }}
                >
                  <Popup>
                    <div className="text-right p-1 min-w-[220px]" dir="rtl">
                      <div className="flex items-center space-x-1.5 space-x-reverse mb-1">
                        <MapPin className="h-4 w-4 text-indigo-600" />
                        <h4 className="font-bold text-sm text-gray-900">{place.name}</h4>
                      </div>
                      <p className="text-[11px] text-gray-500 font-mono mb-2">
                        {latVal.toFixed(4)}°, {lonVal.toFixed(4)}°
                      </p>
                      
                      <p className="text-xs font-semibold text-gray-700 mb-1 border-b pb-1">
                        אירועים שהתרחשו כאן:
                      </p>
                      
                      <ul className="space-y-2 text-xs max-h-52 overflow-y-auto pr-1">
                        {groupedEvents.map((item) => (
                          <li key={item.id} className="border-b border-gray-100 pb-1.5 last:border-b-0">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-indigo-700 flex items-center gap-1">
                                {item.isMarriage && <span>💍</span>}
                                <span>{item.eventType}</span>
                              </span>
                              {item.date && (
                                <span className="text-[11px] text-gray-500 font-medium">
                                  {formatDate(item.date)}
                                </span>
                              )}
                            </div>

                            {item.isMarriage && item.people.length > 1 ? (
                              <div className="text-gray-700 text-xs mt-1 bg-indigo-50/70 p-1.5 rounded-lg border border-indigo-100">
                                <span className="text-indigo-900 font-semibold block text-[11px] mb-0.5">
                                  חתן וכלה / בני זוג:
                                </span>
                                <div className="flex flex-wrap items-center gap-1 text-[11px]">
                                  <button 
                                    onClick={() => onSelectPersonById(item.people[0].id)}
                                    className="font-bold text-indigo-700 hover:text-indigo-900 hover:underline"
                                  >
                                    {item.people[0].name}
                                  </button>
                                  <span className="text-gray-400 font-bold">♥</span>
                                  <button 
                                    onClick={() => onSelectPersonById(item.people[1].id)}
                                    className="font-bold text-indigo-700 hover:text-indigo-900 hover:underline"
                                  >
                                    {item.people[1].name}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-gray-600 text-[11px] mt-0.5">
                                עבור:{' '}
                                <button 
                                  onClick={() => onSelectPersonById(item.people[0].id)}
                                  className="font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
                                >
                                  {item.people[0].name}
                                </button>
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                      <p className="text-[10px] text-gray-400 mt-2 text-center">
                        גרור את הסיכה כדי לעדכן את המיקום במפה
                      </p>
                    </div>
                  </Popup>
                </Marker>
              );
            })
          )}
        </MapContainer>
      </div>
    </div>
  );
};

export default MapDisplay;
