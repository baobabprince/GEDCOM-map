import React, { useMemo, useState } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area 
} from 'recharts';
import { 
  Users, 
  Heart, 
  Map as MapIcon, 
  TrendingUp, 
  Navigation, 
  Compass, 
  Info, 
  ArrowLeftRight, 
  Award, 
  Clock,
  Globe,
  Search,
  MapPin,
  Calendar,
  Activity,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';
import { Person, Place } from '../types.ts';
import { getYearFromDate } from '../services/utils.ts';

interface DemographicInsightsProps {
  persons: Person[];
  places: Place[];
  onSelectPerson?: (personId: string) => void;
  onSelectTab?: (tab: 'map' | 'insights') => void;
}

// Haversine formula to calculate distance between two coordinates in kilometers
const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

export const DemographicInsights: React.FC<DemographicInsightsProps> = ({ 
  persons, 
  places, 
  onSelectPerson, 
  onSelectTab 
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'geographics' | 'demographics'>('geographics');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPath, setExpandedPath] = useState<string | null>(null);

  // Helper to extract country from location name (last comma separated value)
  const getCountry = (placeName: string): string => {
    if (!placeName) return 'Unknown';
    const parts = placeName.split(',');
    const country = parts[parts.length - 1].trim();
    return country || 'Unknown';
  };

  // Helper to extract surname
  const getSurname = (fullName: string): string => {
    if (!fullName || fullName === 'Unknown') return 'Unknown';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length <= 1) return 'Unknown';
    return parts[parts.length - 1];
  };

  // Pre-mapped places dictionary for instant coordinate lookup
  const placeCoordsMap = useMemo(() => {
    const map = new Map<string, { lat: number; lon: number }>();
    places.forEach(p => {
      if (p.name && p.lat != null && p.lon != null) {
        const latVal = parseFloat(String(p.lat));
        const lonVal = parseFloat(String(p.lon));
        if (!isNaN(latVal) && !isNaN(lonVal)) {
          map.set(p.name, { lat: latVal, lon: lonVal });
        }
      }
    });
    return map;
  }, [places]);

  const stats = useMemo(() => {
    let totalPersons = persons.length;
    let maleCount = 0;
    let femaleCount = 0;
    let unknownGenderCount = 0;

    let totalLifespans = 0;
    let lifespansCount = 0;
    const lifespans: number[] = [];

    const ageGroups = {
      '0-10 (ילדות)': 0,
      '11-25 (נעורים)': 0,
      '26-50 (בגרות)': 0,
      '51-70 (בשלות)': 0,
      '71-85 (גיל שלישי)': 0,
      '86+ (שיבה טובה)': 0,
    };

    const surnameCounts: { [key: string]: number } = {};
    const birthDecades: { [key: string]: number } = {};
    const birthCountries: { [key: string]: number } = {};
    const deathCountries: { [key: string]: number } = {};
    
    // Country arrival timeline tracking
    const countryFirstEvents: { [country: string]: { year: number; person: string; eventType: string; place: string } } = {};

    interface MemberMigration {
      id: string;
      name: string;
      birthYear?: number;
      birthPlace: string;
      deathYear?: number;
      deathPlace: string;
      distanceKm: number;
      path: string;
    }

    const migrationPathsMap = new Map<string, { from: string; to: string; count: number; members: MemberMigration[] }>();
    let totalMigrationDistance = 0;
    let migrationsWithCoordsCount = 0;
    let longestMigrant: { person: Person; distance: number; path: string; birthPlace: string; deathPlace: string } | null = null;

    let sumLat = 0;
    let sumLon = 0;
    let coordsCount = 0;

    // Analyze each person
    persons.forEach(p => {
      // Gender split
      if (p.gender === 'Male') maleCount++;
      else if (p.gender === 'Female') femaleCount++;
      else unknownGenderCount++;

      // Surname distribution
      const sName = getSurname(p.name);
      if (sName !== 'Unknown') {
        surnameCounts[sName] = (surnameCounts[sName] || 0) + 1;
      }

      // Track all events of this person for geographic timeline & center of gravity
      p.events.forEach(event => {
        if (!event.place) return;
        const year = getYearFromDate(event.date);
        const country = getCountry(event.place);
        
        // Track earliest event in each country for the Settlement Timeline
        if (year && country !== 'Unknown') {
          if (!countryFirstEvents[country] || year < countryFirstEvents[country].year) {
            countryFirstEvents[country] = {
              year,
              person: p.name,
              eventType: event.eventType === 'MARR' ? 'נישואין' : event.eventType === 'BAPM' ? 'הטבלה' : event.eventType === 'Birth' ? 'לידה' : event.eventType === 'Death' ? 'פטירה' : event.eventType,
              place: event.place
            };
          }
        }

        // Add to centroid calculation
        const coords = placeCoordsMap.get(event.place);
        if (coords) {
          sumLat += coords.lat;
          sumLon += coords.lon;
          coordsCount++;
        }
      });

      // Lifespan & Age Groups
      const birth = p.events.find(e => e.eventType === 'Birth');
      const death = p.events.find(e => e.eventType === 'Death');
      
      let birthYear: number | undefined;
      let deathYear: number | undefined;

      if (birth) {
        birthYear = getYearFromDate(birth.date);
        if (birthYear) {
          // Decade of birth
          const decade = Math.floor(birthYear / 10) * 10;
          birthDecades[`${decade}`] = (birthDecades[`${decade}`] || 0) + 1;

          // Birth Country
          if (birth.place) {
            const country = getCountry(birth.place);
            birthCountries[country] = (birthCountries[country] || 0) + 1;
          }
        }
      }

      if (death) {
        deathYear = getYearFromDate(death.date);
        if (death.place) {
          const country = getCountry(death.place);
          deathCountries[country] = (deathCountries[country] || 0) + 1;
        }
      }

      if (birthYear && deathYear && deathYear >= birthYear) {
        const age = deathYear - birthYear;
        // Cap age at 120 for sanity checking of typos in GEDCOM
        if (age <= 120) {
          lifespans.push(age);
          totalLifespans += age;
          lifespansCount++;

          if (age <= 10) ageGroups['0-10 (ילדות)']++;
          else if (age <= 25) ageGroups['11-25 (נעורים)']++;
          else if (age <= 50) ageGroups['26-50 (בגרות)']++;
          else if (age <= 70) ageGroups['51-70 (בשלות)']++;
          else if (age <= 85) ageGroups['71-85 (גיל שלישי)']++;
          else ageGroups['86+ (שיבה טובה)']++;
        }
      }

      // Migrations and distance calculations
      if (birth?.place && death?.place) {
        const birthCountry = getCountry(birth.place);
        const deathCountry = getCountry(death.place);

        if (birthCountry !== 'Unknown' && deathCountry !== 'Unknown' && birthCountry !== deathCountry) {
          const pathKey = `${birthCountry} ➔ ${deathCountry}`;
          
          // Calculate Haversine distance if coordinates are available
          const birthCoords = placeCoordsMap.get(birth.place);
          const deathCoords = placeCoordsMap.get(death.place);
          let distance = 0;

          if (birthCoords && deathCoords) {
            distance = haversineDistance(birthCoords.lat, birthCoords.lon, deathCoords.lat, deathCoords.lon);
            totalMigrationDistance += distance;
            migrationsWithCoordsCount++;

            // Track the single longest migrant ("The Family Nomad")
            if (!longestMigrant || distance > longestMigrant.distance) {
              longestMigrant = {
                person: p,
                distance,
                path: pathKey,
                birthPlace: birth.place,
                deathPlace: death.place
              };
            }
          }

          if (!migrationPathsMap.has(pathKey)) {
            migrationPathsMap.set(pathKey, {
              from: birthCountry,
              to: deathCountry,
              count: 0,
              members: []
            });
          }

          const currentPath = migrationPathsMap.get(pathKey)!;
          currentPath.count++;
          currentPath.members.push({
            id: p.id,
            name: p.name,
            birthYear,
            birthPlace: birth.place,
            deathYear,
            deathPlace: death.place,
            distanceKm: distance,
            path: pathKey
          });
        }
      }
    });

    const avgLifespan = lifespansCount > 0 ? Math.round(totalLifespans / lifespansCount) : 0;
    const avgMigrationDistance = migrationsWithCoordsCount > 0 ? Math.round(totalMigrationDistance / migrationsWithCoordsCount) : 0;

    // Geographical center of gravity centroid
    const centerOfGravity = coordsCount > 0 ? {
      lat: Number((sumLat / coordsCount).toFixed(4)),
      lon: Number((sumLon / coordsCount).toFixed(4))
    } : null;

    // Convert datasets for Recharts
    const genderData = [
      { name: 'גברים', value: maleCount, color: '#3b82f6' },
      { name: 'נשים', value: femaleCount, color: '#ec4899' },
      { name: 'לא ידוע', value: unknownGenderCount, color: '#6b7280' }
    ].filter(g => g.value > 0);

    const ageGroupData = Object.keys(ageGroups).map(group => ({
      name: group,
      'מספר אנשים': ageGroups[group]
    }));

    const topSurnames = Object.keys(surnameCounts)
      .map(name => ({ name, 'שכיחות': surnameCounts[name] }))
      .sort((a, b) => b['שכיחות'] - a['שכיחות'])
      .slice(0, 10);

    const timelineData = Object.keys(birthDecades)
      .map(dec => ({ decade: parseInt(dec, 10), 'לידות': birthDecades[dec] }))
      .sort((a, b) => a.decade - b.decade)
      .map(item => ({ ...item, name: `${item.decade}s` }));

    // Geographic detailed datasets
    const birthCountriesData = Object.keys(birthCountries)
      .map(name => ({ name, 'מדינת לידה': birthCountries[name] }))
      .sort((a, b) => b['מדינת לידה'] - a['מדינת לידה'])
      .slice(0, 6);

    const deathCountriesData = Object.keys(deathCountries)
      .map(name => ({ name, 'מדינת פטירה': deathCountries[name] }))
      .sort((a, b) => b['מדינת פטירה'] - a['מדינת פטירה'])
      .slice(0, 6);

    // Settlement Timeline sorted chronologically
    const settlementTimeline = Object.keys(countryFirstEvents)
      .map(country => ({
        country,
        ...countryFirstEvents[country]
      }))
      .sort((a, b) => a.year - b.year);

    // Sorted migration paths
    const sortedMigrations = Array.from(migrationPathsMap.entries())
      .map(([path, data]) => ({
        path,
        ...data
      }))
      .sort((a, b) => b.count - a.count);

    return {
      totalPersons,
      avgLifespan,
      genderData,
      ageGroupData,
      topSurnames,
      timelineData,
      birthCountriesData,
      deathCountriesData,
      settlementTimeline,
      sortedMigrations,
      totalMigrations: sortedMigrations.reduce((acc, curr) => acc + curr.count, 0),
      longestMigrant,
      avgMigrationDistance,
      centerOfGravity
    };
  }, [persons, placeCoordsMap]);

  // Filters migration paths and members based on the search query
  const filteredMigrations = useMemo(() => {
    if (!searchQuery.trim()) return stats.sortedMigrations;
    const query = searchQuery.toLowerCase();
    
    return stats.sortedMigrations.map(m => {
      // Check if the path country names match
      const pathMatch = m.path.toLowerCase().includes(query);
      
      // Filter members inside that match the query
      const matchingMembers = m.members.filter(member => 
        member.name.toLowerCase().includes(query) ||
        member.birthPlace.toLowerCase().includes(query) ||
        member.deathPlace.toLowerCase().includes(query)
      );

      if (pathMatch) {
        return m; // Keep full path if path itself matches
      } else if (matchingMembers.length > 0) {
        return { ...m, members: matchingMembers, count: matchingMembers.length }; // Keep path with matched members only
      }
      return null;
    }).filter((m): m is NonNullable<typeof m> => m !== null);
  }, [stats.sortedMigrations, searchQuery]);

  return (
    <div className="h-full bg-gray-950/40 overflow-y-auto p-4 md:p-8 space-y-8 custom-scrollbar" dir="rtl" id="demographic-insights-dashboard">
      
      {/* Dashboard Custom Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-800/80 pb-6">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <Globe className="h-7 w-7 text-indigo-400" />
            אנליטיקה ומחקר גיאוגרפי-דמוגרפי
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            חשיפת מגמות תנועה, צירי זמן של התיישבות משפחתית וניתוחי עומק מרחביים מתוך קובץ ה-GEDCOM.
          </p>
        </div>

        {/* Dashboard Sub-Tabs switcher */}
        <div className="flex items-center bg-gray-900 border border-gray-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveSubTab('geographics')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-2 ${
              activeSubTab === 'geographics' 
                ? 'bg-indigo-600 text-white shadow-lg' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <MapIcon className="h-4 w-4" />
            <span>גיאוגרפיה ונתיבי הגירה</span>
            <span className="bg-emerald-500 text-[10px] text-gray-950 px-1.5 py-0.5 rounded-full font-extrabold">מפות</span>
          </button>
          <button
            onClick={() => setActiveSubTab('demographics')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-2 ${
              activeSubTab === 'demographics' 
                ? 'bg-indigo-600 text-white shadow-lg' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>התפלגות דמוגרפית</span>
          </button>
        </div>
      </div>

      {activeSubTab === 'geographics' ? (
        // ----------------------------------------------------
        // GEOGRAPHICS AND MIGRATION TAB
        // ----------------------------------------------------
        <div className="space-y-8 animate-fade-in">
          
          {/* Geographical Highlights Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Metric 1: Mapped Places */}
            <div className="bg-gray-900/60 border border-gray-800/80 p-5 rounded-2xl flex items-center space-x-4 space-x-reverse relative overflow-hidden group hover:border-indigo-500/30 transition-all duration-300">
              <div className="absolute top-0 right-0 h-24 w-24 bg-indigo-500/5 blur-3xl rounded-full" />
              <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
                <Compass className="h-6 w-6" />
              </div>
              <div>
                <span className="text-gray-400 text-xs block font-medium">מיקומים ממופים בעץ</span>
                <span className="text-2xl font-bold text-white block mt-1">{places.length}</span>
              </div>
            </div>

            {/* Metric 2: Interstate Migrations */}
            <div className="bg-gray-900/60 border border-gray-800/80 p-5 rounded-2xl flex items-center space-x-4 space-x-reverse relative overflow-hidden group hover:border-emerald-500/30 transition-all duration-300">
              <div className="absolute top-0 right-0 h-24 w-24 bg-emerald-500/5 blur-3xl rounded-full" />
              <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
                <ArrowLeftRight className="h-6 w-6" />
              </div>
              <div>
                <span className="text-gray-400 text-xs block font-medium">סך הגירות בין-ארציות</span>
                <span className="text-2xl font-bold text-white block mt-1">{stats.totalMigrations}</span>
              </div>
            </div>

            {/* Metric 3: Average Migration Distance */}
            <div className="bg-gray-900/60 border border-gray-800/80 p-5 rounded-2xl flex items-center space-x-4 space-x-reverse relative overflow-hidden group hover:border-amber-500/30 transition-all duration-300">
              <div className="absolute top-0 right-0 h-24 w-24 bg-amber-500/5 blur-3xl rounded-full" />
              <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400">
                <Activity className="h-6 w-6" />
              </div>
              <div>
                <span className="text-gray-400 text-xs block font-medium">מרחק הגירה ממוצע</span>
                <span className="text-2xl font-bold text-white block mt-1">
                  {stats.avgMigrationDistance > 0 ? `~${stats.avgMigrationDistance.toLocaleString()} ק"מ` : 'אין נתוני מרחק'}
                </span>
              </div>
            </div>

            {/* Metric 4: Family Centroid */}
            <div className="bg-gray-900/60 border border-gray-800/80 p-5 rounded-2xl flex items-center space-x-4 space-x-reverse relative overflow-hidden group hover:border-pink-500/30 transition-all duration-300">
              <div className="absolute top-0 right-0 h-24 w-24 bg-pink-500/5 blur-3xl rounded-full" />
              <div className="p-3 bg-pink-500/10 rounded-xl text-pink-400">
                <Globe className="h-6 w-6" />
              </div>
              <div>
                <span className="text-gray-400 text-xs block font-medium">מרכז כובד גיאוגרפי</span>
                <span className="text-sm font-bold text-white block mt-1.5 truncate">
                  {stats.centerOfGravity 
                    ? `${stats.centerOfGravity.lat}°, ${stats.centerOfGravity.lon}°`
                    : 'אין נתוני קואורדינטות'}
                </span>
              </div>
            </div>
          </div>

          {/* Special Feature: Longest Migrant ("The Family Nomad") */}
          {stats.longestMigrant && (
            <div className="bg-gradient-to-r from-indigo-950/40 to-slate-900/50 border border-indigo-500/20 p-6 rounded-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 h-64 w-64 bg-indigo-500/5 blur-3xl rounded-full" />
              <div className="space-y-2 relative z-10 flex-1">
                <span className="bg-indigo-500/10 text-indigo-300 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border border-indigo-500/20 inline-block mb-1">
                  🧭 הנווד הגדול ביותר במשפחה (The Family Nomad)
                </span>
                <h3 className="text-xl font-bold text-white">
                  {stats.longestMigrant.person.name}
                </h3>
                <p className="text-gray-300 text-sm max-w-2xl leading-relaxed">
                  העתיק את מרכז חייו ממיקום הלידה <strong className="text-indigo-200 font-semibold">{stats.longestMigrant.birthPlace}</strong> אל מיקום הפטירה <strong className="text-emerald-200 font-semibold">{stats.longestMigrant.deathPlace}</strong>.
                  המסע משתרע על פני נתיב גיאוגרפי עצום של לא פחות מ-
                  <strong className="text-indigo-400 text-base mx-1 font-black">{stats.longestMigrant.distance.toLocaleString()} ק"מ</strong>!
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3 relative z-10">
                <div className="text-right sm:text-left">
                  <span className="text-2xl font-black text-indigo-400 block">~{stats.longestMigrant.distance.toLocaleString()} ק"מ</span>
                  <span className="text-[10px] text-gray-500 font-bold block mt-0.5">מרחק אווירי מחושב</span>
                </div>
                {onSelectPerson && onSelectTab && (
                  <button
                    onClick={() => {
                      onSelectPerson(stats.longestMigrant!.person.id);
                      onSelectTab('map');
                    }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all duration-300 shadow-lg shadow-indigo-600/20 flex items-center gap-1.5"
                  >
                    <span>🗺️ הצג נתיב על המפה</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Country Movement Charts (Where we started vs Where we ended up) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Birth Countries Chart */}
            <div className="bg-gray-900/40 border border-gray-800/60 p-6 rounded-2xl flex flex-col h-[350px]">
              <h3 className="text-sm font-bold text-gray-200 mb-4 flex items-center gap-2">
                <MapPin className="h-4.5 w-4.5 text-indigo-400" />
                מדינות הלידה הנפוצות ביותר (שורשי המשפחה)
              </h3>
              <div className="flex-1 w-full min-h-0 text-xs">
                {stats.birthCountriesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.birthCountriesData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                      <XAxis dataKey="name" stroke="#9ca3af" />
                      <YAxis stroke="#9ca3af" allowDecimals={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1f2937', borderColor: '#4b5563', borderRadius: '8px', color: '#fff', textAlign: 'right' }} 
                      />
                      <Bar dataKey="מדינת לידה" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500 italic">
                    אין מספיק נתוני מדינת לידה בקובץ.
                  </div>
                )}
              </div>
            </div>

            {/* Death Countries Chart */}
            <div className="bg-gray-900/40 border border-gray-800/60 p-6 rounded-2xl flex flex-col h-[350px]">
              <h3 className="text-sm font-bold text-gray-200 mb-4 flex items-center gap-2">
                <MapPin className="h-4.5 w-4.5 text-emerald-400" />
                מדינות הפטירה הנפוצות ביותר (יעדי המשפחה)
              </h3>
              <div className="flex-1 w-full min-h-0 text-xs">
                {stats.deathCountriesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.deathCountriesData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                      <XAxis dataKey="name" stroke="#9ca3af" />
                      <YAxis stroke="#9ca3af" allowDecimals={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1f2937', borderColor: '#4b5563', borderRadius: '8px', color: '#fff', textAlign: 'right' }} 
                      />
                      <Bar dataKey="מדינת פטירה" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500 italic">
                    אין מספיק נתוני מדינת פטירה בקובץ.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Spatiotemporal Expansion Timeline */}
          <div className="bg-gray-900/40 border border-gray-800/60 p-6 rounded-2xl">
            <h3 className="text-sm font-bold text-gray-200 mb-6 flex items-center gap-2">
              <Calendar className="h-4.5 w-4.5 text-indigo-400" />
              ציר זמן להתיישבות המשפחה והתפשטותה הגיאוגרפית
            </h3>
            {stats.settlementTimeline.length > 0 ? (
              <div className="relative border-r-2 border-indigo-500/20 mr-4 space-y-8 pb-4">
                {stats.settlementTimeline.map((item, idx) => (
                  <div key={idx} className="relative pr-8 group">
                    {/* Circle marker on timeline */}
                    <div className="absolute top-1.5 -right-[9px] w-4 h-4 rounded-full border-2 border-indigo-500 bg-gray-950 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                    </div>
                    {/* Card container */}
                    <div className="bg-gray-900/60 border border-gray-800 p-4 rounded-xl hover:border-indigo-500/20 transition-all max-w-3xl">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <span className="text-sm font-black text-indigo-400 block">
                          שנת {item.year}
                        </span>
                        <span className="text-[10px] text-gray-500 font-bold block bg-gray-950 px-2.5 py-0.5 rounded border border-gray-800/60 uppercase">
                          אירוע ראשון מתועד
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-white mt-1.5">
                        הגעה ראשונה מתועדת אל: {item.country}
                      </h4>
                      <p className="text-gray-400 text-xs mt-2 leading-relaxed">
                        האירוע ההיסטורי הראשון שנרשם במדינה זו הוא <span className="text-gray-200 font-semibold">{item.eventType}</span> של <span className="text-indigo-200 font-medium">{item.person}</span> במיקום <span className="text-emerald-200 italic">{item.place}</span>.
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 bg-gray-900/20 rounded-xl border border-dashed border-gray-800 text-center text-gray-500 text-sm">
                אין מספיק נתונים כרונולוגיים כדי להפיק את ציר הזמן הגיאוגרפי.
              </div>
            )}
          </div>

          {/* Interactive Detailed Migration Paths Explorer */}
          <div className="bg-gray-900/40 border border-gray-800/60 p-6 rounded-2xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-sm font-bold text-gray-200 flex items-center gap-2">
                  <Navigation className="h-4.5 w-4.5 text-amber-400" />
                  חוקר נתיבי הגירה משפחתיים (לחץ על נתיב כדי לראות את האנשים)
                </h3>
                <p className="text-xs text-gray-400 mt-1">חיפוש על פי שם אדם, מדינה, או עיר מוצא/יעד.</p>
              </div>
              
              {/* Search bar */}
              <div className="relative w-full md:w-64">
                <input
                  type="text"
                  placeholder="חיפוש אדם או מיקום..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-950 text-xs border border-gray-800 rounded-xl py-2 pl-3 pr-9 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
                <Search className="absolute right-3 top-2.5 h-3.5 w-3.5 text-gray-500" />
              </div>
            </div>

            {filteredMigrations.length > 0 ? (
              <div className="space-y-4">
                {filteredMigrations.map((migration, index) => {
                  const isExpanded = expandedPath === migration.path || searchQuery.trim() !== '';
                  return (
                    <div 
                      key={index} 
                      className="bg-gray-900/50 border border-gray-800/80 rounded-xl overflow-hidden transition-all duration-300"
                    >
                      {/* Main Trigger row */}
                      <button
                        onClick={() => setExpandedPath(isExpanded ? null : migration.path)}
                        className="w-full p-4 flex items-center justify-between text-right hover:bg-gray-900/80 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-indigo-400 bg-indigo-500/10 p-2 rounded-lg">
                            <ArrowLeftRight className="h-4.5 w-4.5" />
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-500 font-black block uppercase tracking-wider">נתיב הגירה {index + 1}</span>
                            <div className="flex items-center gap-2 mt-1 text-sm text-gray-200">
                              <span className="font-bold text-indigo-300">{migration.from}</span>
                              <span className="text-gray-500">➔</span>
                              <span className="font-bold text-emerald-300">{migration.to}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-left">
                            <span className="text-sm font-black text-white block">{migration.count} נפשות</span>
                            <span className="text-[10px] text-gray-500 font-bold block">עשו מסלול זה</span>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="h-4.5 w-4.5 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-4.5 w-4.5 text-gray-400" />
                          )}
                        </div>
                      </button>

                      {/* Expanded Section: Member list */}
                      {isExpanded && (
                        <div className="border-t border-gray-800 bg-gray-950/40 p-4 space-y-3">
                          <h4 className="text-xs font-bold text-indigo-300 mb-2">פירוט בני המשפחה שבצעו הגירה זו:</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {migration.members.map((member, mIdx) => (
                              <div 
                                key={mIdx} 
                                className="bg-gray-900/80 border border-gray-800 p-3.5 rounded-xl flex items-center justify-between gap-4 hover:border-gray-700 transition-all"
                              >
                                <div className="space-y-1">
                                  <h5 className="text-xs font-bold text-white block">
                                    {member.name}
                                  </h5>
                                  <span className="text-[10px] text-gray-500 block">
                                    {member.birthYear || '?'} - {member.deathYear || '?'}
                                  </span>
                                  <div className="text-[10px] text-gray-400 mt-1.5 space-y-0.5">
                                    <p><strong className="text-indigo-400">לידה:</strong> {member.birthPlace}</p>
                                    <p><strong className="text-emerald-400">פטירה:</strong> {member.deathPlace}</p>
                                  </div>
                                  {member.distanceKm > 0 && (
                                    <span className="text-[9px] bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded-md inline-block mt-2 font-bold">
                                      ~{member.distanceKm.toLocaleString()} ק"מ אווירי
                                    </span>
                                  )}
                                </div>

                                {onSelectPerson && onSelectTab && (
                                  <button
                                    onClick={() => {
                                      onSelectPerson(member.id);
                                      onSelectTab('map');
                                    }}
                                    className="p-2 bg-indigo-600/15 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-lg transition-all text-xs font-black flex items-center gap-1 shrink-0"
                                    title="הצג על המפה"
                                  >
                                    <MapPin className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">מפה</span>
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 bg-gray-900/20 rounded-xl border border-dashed border-gray-800 text-center text-gray-500 text-sm">
                לא נמצאו נתיבי הגירה התואמים את החיפוש שלך.
              </div>
            )}
          </div>

        </div>
      ) : (
        // ----------------------------------------------------
        // DEMOGRAPHICS TAB
        // ----------------------------------------------------
        <div className="space-y-8 animate-fade-in">
          
          {/* Demographic Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Metric 1 */}
            <div className="bg-gray-900/60 border border-gray-800/80 p-5 rounded-2xl flex items-center space-x-4 space-x-reverse relative overflow-hidden group hover:border-indigo-500/30 transition-all duration-300">
              <div className="absolute top-0 right-0 h-24 w-24 bg-indigo-500/5 blur-3xl rounded-full" />
              <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <span className="text-gray-400 text-xs block font-medium">סך הכל נפשות בקובץ</span>
                <span className="text-2xl font-bold text-white block mt-1">{stats.totalPersons}</span>
              </div>
            </div>

            {/* Metric 2 */}
            <div className="bg-gray-900/60 border border-gray-800/80 p-5 rounded-2xl flex items-center space-x-4 space-x-reverse relative overflow-hidden group hover:border-emerald-500/30 transition-all duration-300">
              <div className="absolute top-0 right-0 h-24 w-24 bg-emerald-500/5 blur-3xl rounded-full" />
              <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
                <Heart className="h-6 w-6" />
              </div>
              <div>
                <span className="text-gray-400 text-xs block font-medium">תוחלת חיים ממוצעת</span>
                <span className="text-2xl font-bold text-white block mt-1">
                  {stats.avgLifespan > 0 ? `${stats.avgLifespan} שנים` : 'אין מספיק מידע'}
                </span>
              </div>
            </div>

            {/* Metric 3 */}
            <div className="bg-gray-900/60 border border-gray-800/80 p-5 rounded-2xl flex items-center space-x-4 space-x-reverse relative overflow-hidden group hover:border-amber-500/30 transition-all duration-300">
              <div className="absolute top-0 right-0 h-24 w-24 bg-amber-500/5 blur-3xl rounded-full" />
              <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <span className="text-gray-400 text-xs block font-medium">עשורי לידה מתועדים</span>
                <span className="text-2xl font-bold text-white block mt-1">{stats.timelineData.length} עשורים</span>
              </div>
            </div>

            {/* Metric 4 */}
            <div className="bg-gray-900/60 border border-gray-800/80 p-5 rounded-2xl flex items-center space-x-4 space-x-reverse relative overflow-hidden group hover:border-pink-500/30 transition-all duration-300">
              <div className="absolute top-0 right-0 h-24 w-24 bg-pink-500/5 blur-3xl rounded-full" />
              <div className="p-3 bg-pink-500/10 rounded-xl text-pink-400">
                <Award className="h-6 w-6" />
              </div>
              <div>
                <span className="text-gray-400 text-xs block font-medium">שמות משפחה שונים</span>
                <span className="text-2xl font-bold text-white block mt-1">{stats.topSurnames.length}+</span>
              </div>
            </div>
          </div>

          {/* Main Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lifespan Age Distribution */}
            <div className="bg-gray-900/40 border border-gray-800/60 p-6 rounded-2xl flex flex-col h-[350px]">
              <h3 className="text-sm font-bold text-gray-200 mb-4 flex items-center gap-2">
                <Clock className="h-4.5 w-4.5 text-indigo-400" />
                התפלגות תוחלת החיים (גיל פטירה)
              </h3>
              <div className="flex-1 w-full min-h-0 text-xs">
                {stats.avgLifespan > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.ageGroupData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                      <XAxis dataKey="name" stroke="#9ca3af" />
                      <YAxis stroke="#9ca3af" allowDecimals={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1f2937', borderColor: '#4b5563', borderRadius: '8px', color: '#fff', textAlign: 'right' }} 
                      />
                      <Bar dataKey="מספר אנשים" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500 italic">
                    אין מספיק נתוני לידה ופטירה תואמים כדי להציג את התרשים.
                  </div>
                )}
              </div>
            </div>

            {/* Surnames Frequency Chart */}
            <div className="bg-gray-900/40 border border-gray-800/60 p-6 rounded-2xl flex flex-col h-[350px]">
              <h3 className="text-sm font-bold text-gray-200 mb-4 flex items-center gap-2">
                <Award className="h-4.5 w-4.5 text-emerald-400" />
                עשרת שמות המשפחה השכיחים ביותר
              </h3>
              <div className="flex-1 w-full min-h-0 text-xs">
                {stats.topSurnames.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.topSurnames} layout="vertical" margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                      <XAxis type="number" stroke="#9ca3af" allowDecimals={false} />
                      <YAxis dataKey="name" type="category" stroke="#9ca3af" width={80} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1f2937', borderColor: '#4b5563', borderRadius: '8px', color: '#fff', textAlign: 'right' }} 
                      />
                      <Bar dataKey="שכיחות" fill="#10b981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500 italic">
                    לא נמצאו שמות משפחה תקינים.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Second Row of Charts: Birth Rate Decade Timeline & Gender Split */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Birth Timeline (Decades) */}
            <div className="bg-gray-900/40 border border-gray-800/60 p-6 rounded-2xl flex flex-col h-[350px] lg:col-span-2">
              <h3 className="text-sm font-bold text-gray-200 mb-4 flex items-center gap-2">
                <TrendingUp className="h-4.5 w-4.5 text-indigo-400" />
                מגמת לידות לאורך עשורי ההיסטוריה
              </h3>
              <div className="flex-1 w-full min-h-0 text-xs">
                {stats.timelineData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.timelineData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                      <defs>
                        <linearGradient id="colorBirths" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                      <XAxis dataKey="name" stroke="#9ca3af" />
                      <YAxis stroke="#9ca3af" allowDecimals={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1f2937', borderColor: '#4b5563', borderRadius: '8px', color: '#fff', textAlign: 'right' }} 
                      />
                      <Area type="monotone" dataKey="לידות" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorBirths)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500 italic">
                    אין מספיק נתוני לידה עם תאריכים.
                  </div>
                )}
              </div>
            </div>

            {/* Gender Distribution Chart */}
            <div className="bg-gray-900/40 border border-gray-800/60 p-6 rounded-2xl flex flex-col h-[350px]">
              <h3 className="text-sm font-bold text-gray-200 mb-4 flex items-center gap-2">
                <Users className="h-4.5 w-4.5 text-pink-400" />
                התפלגות מגדרית של העץ
              </h3>
              <div className="flex-grow flex items-center justify-center min-h-0 relative">
                {stats.genderData.length > 0 ? (
                  <div className="relative w-full h-full flex flex-col items-center justify-center">
                    <div className="w-full h-4/5 text-xs">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={stats.genderData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={85}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {stats.genderData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#1f2937', borderColor: '#4b5563', borderRadius: '8px', color: '#fff' }} 
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Custom Legend */}
                    <div className="flex justify-center gap-4 text-xs mt-2 flex-shrink-0">
                      {stats.genderData.map((entry, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                          <span className="text-gray-300">{entry.name}:</span>
                          <span className="font-bold text-white">{entry.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500 italic">לא קיים מידע מגדרי בקובץ.</div>
                )}
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
