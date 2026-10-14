import React, { useMemo, useState } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
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
import { useLanguage, formatEventType } from '../services/i18n.ts';

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
  const { lang, isRTL } = useLanguage();
  const isHe = lang === 'he';
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

  const seriesKeys = useMemo(() => ({
    peopleCount: isHe ? 'מספר אנשים' : 'People',
    surnameFreq: isHe ? 'שכיחות' : 'Frequency',
    births: isHe ? 'לידות' : 'Births',
    birthCountry: isHe ? 'מדינת לידה' : 'Births in Country',
    deathCountry: isHe ? 'מדינת פטירה' : 'Deaths in Country',
  }), [isHe]);

  const stats = useMemo(() => {
    let totalPersons = persons.length;
    let maleCount = 0;
    let femaleCount = 0;
    let unknownGenderCount = 0;

    let totalLifespans = 0;
    let lifespansCount = 0;
    const lifespans: number[] = [];

    const ageGroupLabels = isHe
      ? [
          '0-10 (ילדות)',
          '11-25 (נעורים)',
          '26-50 (בגרות)',
          '51-70 (בשלות)',
          '71-85 (גיל שלישי)',
          '86+ (שיבה טובה)',
        ]
      : [
          '0-10 (Childhood)',
          '11-25 (Youth)',
          '26-50 (Adulthood)',
          '51-70 (Maturity)',
          '71-85 (Senior)',
          '86+ (Longevity)',
        ];

    const ageGroups: Record<string, number> = {
      [ageGroupLabels[0]]: 0,
      [ageGroupLabels[1]]: 0,
      [ageGroupLabels[2]]: 0,
      [ageGroupLabels[3]]: 0,
      [ageGroupLabels[4]]: 0,
      [ageGroupLabels[5]]: 0,
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
              eventType: formatEventType(event.eventType, lang),
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

          if (age <= 10) ageGroups[ageGroupLabels[0]]++;
          else if (age <= 25) ageGroups[ageGroupLabels[1]]++;
          else if (age <= 50) ageGroups[ageGroupLabels[2]]++;
          else if (age <= 70) ageGroups[ageGroupLabels[3]]++;
          else if (age <= 85) ageGroups[ageGroupLabels[4]]++;
          else ageGroups[ageGroupLabels[5]]++;
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
      { name: isHe ? 'גברים' : 'Male', value: maleCount, color: '#3b82f6' },
      { name: isHe ? 'נשים' : 'Female', value: femaleCount, color: '#ec4899' },
      { name: isHe ? 'לא ידוע' : 'Unknown', value: unknownGenderCount, color: '#6b7280' }
    ].filter(g => g.value > 0);

    const ageGroupData = Object.keys(ageGroups).map(group => ({
      name: group,
      [seriesKeys.peopleCount]: ageGroups[group]
    }));

    const topSurnames = Object.keys(surnameCounts)
      .map(name => ({ name, [seriesKeys.surnameFreq]: surnameCounts[name] }))
      .sort((a, b) => (b[seriesKeys.surnameFreq] as number) - (a[seriesKeys.surnameFreq] as number))
      .slice(0, 10);

    const timelineData = Object.keys(birthDecades)
      .map(dec => ({ decade: parseInt(dec, 10), [seriesKeys.births]: birthDecades[dec] }))
      .sort((a, b) => a.decade - b.decade)
      .map(item => ({ ...item, name: `${item.decade}s` }));

    // Geographic detailed datasets
    const birthCountriesData = Object.keys(birthCountries)
      .map(name => ({ name, [seriesKeys.birthCountry]: birthCountries[name] }))
      .sort((a, b) => (b[seriesKeys.birthCountry] as number) - (a[seriesKeys.birthCountry] as number))
      .slice(0, 6);

    const deathCountriesData = Object.keys(deathCountries)
      .map(name => ({ name, [seriesKeys.deathCountry]: deathCountries[name] }))
      .sort((a, b) => (b[seriesKeys.deathCountry] as number) - (a[seriesKeys.deathCountry] as number))
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
  }, [persons, placeCoordsMap, isHe, lang, seriesKeys]);

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
    <div
      className="h-full bg-gray-950/40 overflow-y-auto p-4 md:p-8 space-y-8 custom-scrollbar"
      dir={isRTL ? 'rtl' : 'ltr'}
      id="demographic-insights-dashboard"
    >
      {/* Dashboard Custom Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-800/80 pb-6">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <Globe className="h-7 w-7 text-indigo-400 flex-shrink-0" />
            {isHe ? 'אנליטיקה ומחקר גיאוגרפי-דמוגרפי' : 'Geographic & Demographic Analytics'}
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            {isHe
              ? 'חשיפת מגמות תנועה, צירי זמן של התיישבות משפחתית וניתוחי עומק מרחביים מתוך קובץ ה-GEDCOM.'
              : 'Uncovering migration trends, family settlement timelines, and spatial insights from your GEDCOM file.'}
          </p>
        </div>

        {/* Dashboard Sub-Tabs switcher */}
        <div className="flex items-center bg-gray-900 border border-gray-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveSubTab('geographics')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'geographics' 
                ? 'bg-indigo-600 text-white shadow-lg' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <MapIcon className="h-4 w-4" />
            <span>{isHe ? 'גיאוגרפיה ונתיבי הגירה' : 'Geography & Migration'}</span>
          </button>
          <button
            onClick={() => setActiveSubTab('demographics')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'demographics' 
                ? 'bg-indigo-600 text-white shadow-lg' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>{isHe ? 'התפלגות דמוגרפית' : 'Demographic Distribution'}</span>
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
            <div className="bg-gray-900/60 border border-gray-800/80 p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden group hover:border-indigo-500/30 transition-all duration-300">
              <div className="absolute top-0 right-0 h-24 w-24 bg-indigo-500/5 blur-3xl rounded-full" />
              <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 flex-shrink-0">
                <Compass className="h-6 w-6" />
              </div>
              <div>
                <span className="text-gray-400 text-xs block font-medium">
                  {isHe ? 'מיקומים ממופים בעץ' : 'Mapped Locations'}
                </span>
                <span className="text-2xl font-bold text-white block mt-1">{places.length}</span>
              </div>
            </div>

            {/* Metric 2: Interstate Migrations */}
            <div className="bg-gray-900/60 border border-gray-800/80 p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden group hover:border-emerald-500/30 transition-all duration-300">
              <div className="absolute top-0 right-0 h-24 w-24 bg-emerald-500/5 blur-3xl rounded-full" />
              <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 flex-shrink-0">
                <ArrowLeftRight className="h-6 w-6" />
              </div>
              <div>
                <span className="text-gray-400 text-xs block font-medium">
                  {isHe ? 'סך הגירות בין-ארציות' : 'International Migrations'}
                </span>
                <span className="text-2xl font-bold text-white block mt-1">{stats.totalMigrations}</span>
              </div>
            </div>

            {/* Metric 3: Average Migration Distance */}
            <div className="bg-gray-900/60 border border-gray-800/80 p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden group hover:border-amber-500/30 transition-all duration-300">
              <div className="absolute top-0 right-0 h-24 w-24 bg-amber-500/5 blur-3xl rounded-full" />
              <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 flex-shrink-0">
                <Activity className="h-6 w-6" />
              </div>
              <div>
                <span className="text-gray-400 text-xs block font-medium">
                  {isHe ? 'מרחק הגירה ממוצע' : 'Avg. Migration Distance'}
                </span>
                <span className="text-2xl font-bold text-white block mt-1">
                  {stats.avgMigrationDistance > 0
                    ? isHe ? `~${stats.avgMigrationDistance.toLocaleString()} ק"מ` : `~${stats.avgMigrationDistance.toLocaleString()} km`
                    : isHe ? 'אין נתוני מרחק' : 'No distance data'}
                </span>
              </div>
            </div>

            {/* Metric 4: Family Centroid */}
            <div className="bg-gray-900/60 border border-gray-800/80 p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden group hover:border-pink-500/30 transition-all duration-300">
              <div className="absolute top-0 right-0 h-24 w-24 bg-pink-500/5 blur-3xl rounded-full" />
              <div className="p-3 bg-pink-500/10 rounded-xl text-pink-400 flex-shrink-0">
                <Globe className="h-6 w-6" />
              </div>
              <div>
                <span className="text-gray-400 text-xs block font-medium">
                  {isHe ? 'מרכז כובד גיאוגרפי' : 'Geographic Center of Gravity'}
                </span>
                <span className="text-sm font-bold text-white block mt-1.5 truncate" dir="ltr">
                  {stats.centerOfGravity 
                    ? `${stats.centerOfGravity.lat}°, ${stats.centerOfGravity.lon}°`
                    : isHe ? 'אין נתוני קואורדינטות' : 'No coordinates'}
                </span>
              </div>
            </div>
          </div>

          {/* Special Feature: Longest Migrant ("The Family Nomad") */}
          {stats.longestMigrant && (
            <div className="bg-gradient-to-r from-indigo-950/40 to-slate-900/50 border border-indigo-500/20 p-6 rounded-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 h-64 w-64 bg-indigo-500/5 blur-3xl rounded-full" />
              <div className="space-y-2 relative z-10 flex-1">
                <span className="text-indigo-300 text-xs font-black uppercase tracking-wider block mb-1">
                  {isHe ? '🧭 הנווד הגדול ביותר במשפחה' : '🧭 The Family Nomad'}
                </span>
                <h3 className="text-xl font-bold text-white">
                  {stats.longestMigrant.person.name}
                </h3>
                {isHe ? (
                  <p className="text-gray-300 text-sm max-w-2xl leading-relaxed">
                    העתיק את מרכז חייו ממיקום הלידה <strong className="text-indigo-200 font-semibold">{stats.longestMigrant.birthPlace}</strong> אל מיקום הפטירה <strong className="text-emerald-200 font-semibold">{stats.longestMigrant.deathPlace}</strong>.
                    המסע משתרע על פני נתיב גיאוגרפי עצום של לא פחות מ-
                    <strong className="text-indigo-400 text-base mx-1 font-black">{stats.longestMigrant.distance.toLocaleString()} ק"מ</strong>!
                  </p>
                ) : (
                  <p className="text-gray-300 text-sm max-w-2xl leading-relaxed">
                    Moved from birthplace <strong className="text-indigo-200 font-semibold">{stats.longestMigrant.birthPlace}</strong> to resting place <strong className="text-emerald-200 font-semibold">{stats.longestMigrant.deathPlace}</strong>, covering an extraordinary distance of
                    <strong className="text-indigo-400 text-base mx-1 font-black">{stats.longestMigrant.distance.toLocaleString()} km</strong>!
                  </p>
                )}
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3 relative z-10">
                <div className={isRTL ? 'text-right sm:text-left' : 'text-left sm:text-right'}>
                  <span className="text-2xl font-black text-indigo-400 block">
                    ~{stats.longestMigrant.distance.toLocaleString()} {isHe ? 'ק"מ' : 'km'}
                  </span>
                  <span className="text-[10px] text-gray-500 font-bold block mt-0.5">
                    {isHe ? 'מרחק אווירי מחושב' : 'Calculated aerial distance'}
                  </span>
                </div>
                {onSelectPerson && onSelectTab && (
                  <button
                    onClick={() => {
                      onSelectPerson(stats.longestMigrant!.person.id);
                      onSelectTab('map');
                    }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all duration-300 shadow-lg shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{isHe ? '🗺️ הצג נתיב על המפה' : '🗺️ Show Path on Map'}</span>
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
                {isHe ? 'מדינות הלידה הנפוצות ביותר (שורשי המשפחה)' : 'Most Common Birth Countries (Family Roots)'}
              </h3>
              <div className="flex-1 w-full min-h-0 text-xs">
                {stats.birthCountriesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.birthCountriesData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                      <XAxis dataKey="name" stroke="#9ca3af" />
                      <YAxis stroke="#9ca3af" allowDecimals={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1f2937', borderColor: '#4b5563', borderRadius: '8px', color: '#fff', textAlign: isRTL ? 'right' : 'left' }} 
                      />
                      <Bar dataKey={seriesKeys.birthCountry} fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500 italic">
                    {isHe ? 'אין מספיק נתוני מדינת לידה בקובץ.' : 'Not enough birth country data in file.'}
                  </div>
                )}
              </div>
            </div>

            {/* Death Countries Chart */}
            <div className="bg-gray-900/40 border border-gray-800/60 p-6 rounded-2xl flex flex-col h-[350px]">
              <h3 className="text-sm font-bold text-gray-200 mb-4 flex items-center gap-2">
                <MapPin className="h-4.5 w-4.5 text-emerald-400" />
                {isHe ? 'מדינות הפטירה הנפוצות ביותר (יעדי המשפחה)' : 'Most Common Death Countries (Family Destinations)'}
              </h3>
              <div className="flex-1 w-full min-h-0 text-xs">
                {stats.deathCountriesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.deathCountriesData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                      <XAxis dataKey="name" stroke="#9ca3af" />
                      <YAxis stroke="#9ca3af" allowDecimals={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1f2937', borderColor: '#4b5563', borderRadius: '8px', color: '#fff', textAlign: isRTL ? 'right' : 'left' }} 
                      />
                      <Bar dataKey={seriesKeys.deathCountry} fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500 italic">
                    {isHe ? 'אין מספיק נתוני מדינת פטירה בקובץ.' : 'Not enough death country data in file.'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Spatiotemporal Expansion Timeline */}
          <div className="bg-gray-900/40 border border-gray-800/60 p-6 rounded-2xl">
            <h3 className="text-sm font-bold text-gray-200 mb-6 flex items-center gap-2">
              <Calendar className="h-4.5 w-4.5 text-indigo-400" />
              {isHe ? 'ציר זמן להתיישבות המשפחה והתפשטותה הגיאוגרפית' : 'Family Settlement & Geographic Expansion Timeline'}
            </h3>
            {stats.settlementTimeline.length > 0 ? (
              <div className={`relative ${isRTL ? 'border-r-2 mr-4' : 'border-l-2 ml-4'} border-indigo-500/20 space-y-8 pb-4`}>
                {stats.settlementTimeline.map((item, idx) => (
                  <div key={idx} className={`relative ${isRTL ? 'pr-8' : 'pl-8'} group`}>
                    {/* Circle marker on timeline */}
                    <div className={`absolute top-1.5 ${isRTL ? '-right-[9px]' : '-left-[9px]'} w-4 h-4 rounded-full border-2 border-indigo-500 bg-gray-950 flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                    </div>
                    {/* Card container */}
                    <div className="bg-gray-900/60 border border-gray-800 p-4 rounded-xl hover:border-indigo-500/20 transition-all max-w-3xl">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <span className="text-sm font-black text-indigo-400 block">
                          {isHe ? `שנת ${item.year}` : `Year ${item.year}`}
                        </span>
                        <span className="text-[11px] text-gray-400 font-semibold block">
                          {isHe ? 'אירוע ראשון מתועד' : 'First Recorded Event'}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-white mt-1.5">
                        {isHe ? `הגעה ראשונה מתועדת אל: ${item.country}` : `First documented presence in: ${item.country}`}
                      </h4>
                      {isHe ? (
                        <p className="text-gray-400 text-xs mt-2 leading-relaxed">
                          האירוע ההיסטורי הראשון שנרשם במדינה זו הוא <span className="text-gray-200 font-semibold">{item.eventType}</span> של <span className="text-indigo-200 font-medium">{item.person}</span> במיקום <span className="text-emerald-200 italic">{item.place}</span>.
                        </p>
                      ) : (
                        <p className="text-gray-400 text-xs mt-2 leading-relaxed">
                          The earliest recorded event in this country is <span className="text-gray-200 font-semibold">{item.eventType}</span> of <span className="text-indigo-200 font-medium">{item.person}</span> at <span className="text-emerald-200 italic">{item.place}</span>.
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 bg-gray-900/20 rounded-xl border border-dashed border-gray-800 text-center text-gray-500 text-sm">
                {isHe ? 'אין מספיק נתונים כרונולוגיים כדי להפיק את ציר הזמן הגיאוגרפי.' : 'Not enough chronological data to generate the geographic timeline.'}
              </div>
            )}
          </div>

          {/* Interactive Detailed Migration Paths Explorer */}
          <div className="bg-gray-900/40 border border-gray-800/60 p-6 rounded-2xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-sm font-bold text-gray-200 flex items-center gap-2">
                  <Navigation className="h-4.5 w-4.5 text-amber-400" />
                  {isHe ? 'חוקר נתיבי הגירה משפחתיים (לחץ על נתיב כדי לראות את האנשים)' : 'Family Migration Paths Explorer (Click a route to view people)'}
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  {isHe ? 'חיפוש על פי שם אדם, מדינה, או עיר מוצא/יעד.' : 'Search by person name, country, or origin/destination city.'}
                </p>
              </div>
              
              {/* Search bar */}
              <div className="relative w-full md:w-64">
                <input
                  type="text"
                  placeholder={isHe ? 'חיפוש אדם או מיקום...' : 'Search person or location...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full bg-gray-950 text-xs border border-gray-800 rounded-xl py-2 ${isRTL ? 'pl-3 pr-9' : 'pl-9 pr-3'} text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all`}
                />
                <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-2.5 h-3.5 w-3.5 text-gray-500`} />
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
                        className={`w-full p-4 flex items-center justify-between ${isRTL ? 'text-right' : 'text-left'} hover:bg-gray-900/80 transition-colors cursor-pointer`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-indigo-400 bg-indigo-500/10 p-2 rounded-lg">
                            <ArrowLeftRight className="h-4.5 w-4.5" />
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-500 font-black block uppercase tracking-wider">
                              {isHe ? `נתיב הגירה ${index + 1}` : `Migration Route ${index + 1}`}
                            </span>
                            <div className="flex items-center gap-2 mt-1 text-sm text-gray-200">
                              <span className="font-bold text-indigo-300">{migration.from}</span>
                              <span className="text-gray-500">➔</span>
                              <span className="font-bold text-emerald-300">{migration.to}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className={isRTL ? 'text-left' : 'text-right'}>
                            <span className="text-sm font-black text-white block">
                              {isHe ? `${migration.count} נפשות` : `${migration.count} ${migration.count === 1 ? 'person' : 'people'}`}
                            </span>
                            <span className="text-[10px] text-gray-500 font-bold block">
                              {isHe ? 'עשו מסלול זה' : 'followed this route'}
                            </span>
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
                          <h4 className="text-xs font-bold text-indigo-300 mb-2">
                            {isHe ? 'פירוט בני המשפחה שביצעו הגירה זו:' : 'Family members who made this migration:'}
                          </h4>
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
                                    <p><strong className="text-indigo-400">{isHe ? 'לידה:' : 'Birth:'}</strong> {member.birthPlace}</p>
                                    <p><strong className="text-emerald-400">{isHe ? 'פטירה:' : 'Death:'}</strong> {member.deathPlace}</p>
                                  </div>
                                  {member.distanceKm > 0 && (
                                    <span className="text-[10px] text-indigo-300 inline-block mt-1.5 font-semibold">
                                      ~{member.distanceKm.toLocaleString()} {isHe ? 'ק"מ אווירי' : 'km aerial'}
                                    </span>
                                  )}
                                </div>

                                {onSelectPerson && onSelectTab && (
                                  <button
                                    onClick={() => {
                                      onSelectPerson(member.id);
                                      onSelectTab('map');
                                    }}
                                    className="p-2 bg-indigo-600/15 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-lg transition-all text-xs font-black flex items-center gap-1 shrink-0 cursor-pointer"
                                    title={isHe ? 'הצג על המפה' : 'Show on Map'}
                                  >
                                    <MapPin className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">{isHe ? 'מפה' : 'Map'}</span>
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
                {isHe ? 'לא נמצאו נתיבי הגירה התואמים את החיפוש שלך.' : 'No migration routes match your search.'}
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
            <div className="bg-gray-900/60 border border-gray-800/80 p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden group hover:border-indigo-500/30 transition-all duration-300">
              <div className="absolute top-0 right-0 h-24 w-24 bg-indigo-500/5 blur-3xl rounded-full" />
              <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 flex-shrink-0">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <span className="text-gray-400 text-xs block font-medium">
                  {isHe ? 'סך הכל נפשות בקובץ' : 'Total Individuals'}
                </span>
                <span className="text-2xl font-bold text-white block mt-1">{stats.totalPersons}</span>
              </div>
            </div>

            {/* Metric 2 */}
            <div className="bg-gray-900/60 border border-gray-800/80 p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden group hover:border-emerald-500/30 transition-all duration-300">
              <div className="absolute top-0 right-0 h-24 w-24 bg-emerald-500/5 blur-3xl rounded-full" />
              <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 flex-shrink-0">
                <Heart className="h-6 w-6" />
              </div>
              <div>
                <span className="text-gray-400 text-xs block font-medium">
                  {isHe ? 'תוחלת חיים ממוצעת' : 'Average Lifespan'}
                </span>
                <span className="text-2xl font-bold text-white block mt-1">
                  {stats.avgLifespan > 0
                    ? isHe ? `${stats.avgLifespan} שנים` : `${stats.avgLifespan} yrs`
                    : isHe ? 'אין מספיק מידע' : 'Insufficient data'}
                </span>
              </div>
            </div>

            {/* Metric 3 */}
            <div className="bg-gray-900/60 border border-gray-800/80 p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden group hover:border-amber-500/30 transition-all duration-300">
              <div className="absolute top-0 right-0 h-24 w-24 bg-amber-500/5 blur-3xl rounded-full" />
              <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 flex-shrink-0">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <span className="text-gray-400 text-xs block font-medium">
                  {isHe ? 'עשורי לידה מתועדים' : 'Recorded Birth Decades'}
                </span>
                <span className="text-2xl font-bold text-white block mt-1">
                  {isHe ? `${stats.timelineData.length} עשורים` : `${stats.timelineData.length} decades`}
                </span>
              </div>
            </div>

            {/* Metric 4 */}
            <div className="bg-gray-900/60 border border-gray-800/80 p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden group hover:border-pink-500/30 transition-all duration-300">
              <div className="absolute top-0 right-0 h-24 w-24 bg-pink-500/5 blur-3xl rounded-full" />
              <div className="p-3 bg-pink-500/10 rounded-xl text-pink-400 flex-shrink-0">
                <Award className="h-6 w-6" />
              </div>
              <div>
                <span className="text-gray-400 text-xs block font-medium">
                  {isHe ? 'שמות משפחה מובילים' : 'Top Surnames'}
                </span>
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
                {isHe ? 'התפלגות תוחלת החיים (גיל פטירה)' : 'Lifespan Distribution (Age at Death)'}
              </h3>
              <div className="flex-1 w-full min-h-0 text-xs">
                {stats.avgLifespan > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.ageGroupData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                      <XAxis dataKey="name" stroke="#9ca3af" />
                      <YAxis stroke="#9ca3af" allowDecimals={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1f2937', borderColor: '#4b5563', borderRadius: '8px', color: '#fff', textAlign: isRTL ? 'right' : 'left' }} 
                      />
                      <Bar dataKey={seriesKeys.peopleCount} fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500 italic">
                    {isHe ? 'אין מספיק נתוני לידה ופטירה תואמים כדי להציג את התרשים.' : 'Not enough matching birth and death dates to display chart.'}
                  </div>
                )}
              </div>
            </div>

            {/* Surnames Frequency Chart */}
            <div className="bg-gray-900/40 border border-gray-800/60 p-6 rounded-2xl flex flex-col h-[350px]">
              <h3 className="text-sm font-bold text-gray-200 mb-4 flex items-center gap-2">
                <Award className="h-4.5 w-4.5 text-emerald-400" />
                {isHe ? 'עשרת שמות המשפחה השכיחים ביותר' : 'Top 10 Most Frequent Surnames'}
              </h3>
              <div className="flex-1 w-full min-h-0 text-xs">
                {stats.topSurnames.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.topSurnames} layout="vertical" margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                      <XAxis type="number" stroke="#9ca3af" allowDecimals={false} />
                      <YAxis dataKey="name" type="category" stroke="#9ca3af" width={80} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1f2937', borderColor: '#4b5563', borderRadius: '8px', color: '#fff', textAlign: isRTL ? 'right' : 'left' }} 
                      />
                      <Bar dataKey={seriesKeys.surnameFreq} fill="#10b981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500 italic">
                    {isHe ? 'לא נמצאו שמות משפחה תקינים.' : 'No valid surnames found.'}
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
                {isHe ? 'מגמת לידות לאורך עשורי ההיסטוריה' : 'Birth Trends Across Historical Decades'}
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
                        contentStyle={{ backgroundColor: '#1f2937', borderColor: '#4b5563', borderRadius: '8px', color: '#fff', textAlign: isRTL ? 'right' : 'left' }} 
                      />
                      <Area type="monotone" dataKey={seriesKeys.births} stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorBirths)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500 italic">
                    {isHe ? 'אין מספיק נתוני לידה עם תאריכים.' : 'Not enough dated birth records.'}
                  </div>
                )}
              </div>
            </div>

            {/* Gender Distribution Chart */}
            <div className="bg-gray-900/40 border border-gray-800/60 p-6 rounded-2xl flex flex-col h-[350px]">
              <h3 className="text-sm font-bold text-gray-200 mb-4 flex items-center gap-2">
                <Users className="h-4.5 w-4.5 text-pink-400" />
                {isHe ? 'התפלגות מגדרית של העץ' : 'Family Tree Gender Distribution'}
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
                  <div className="text-gray-500 italic">
                    {isHe ? 'לא קיים מידע מגדרי בקובץ.' : 'No gender data available in file.'}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
