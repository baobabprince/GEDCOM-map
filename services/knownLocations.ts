/**
 * High-speed built-in dictionary of well-known genealogical locations, countries,
 * capitals, historical hubs, and common migration destinations.
 * Provides instant 0ms resolution for common places without network requests.
 */

export interface LocationCoords {
  lat: number;
  lon: number;
}

export const KNOWN_LOCATIONS_DATABASE: Record<string, LocationCoords> = {
  // Sample data / Fiction locations (for instant sample loading)
  'ottery st catchpole, devon, england': { lat: 50.7508, lon: -3.2801 },
  'the rookery, ottery st catchpole, devon, england': { lat: 50.7508, lon: -3.2801 },
  'godric\'s hollow, suffolk, england': { lat: 52.1287, lon: 0.9168 },
  'hogwarts school of witchcraft and wizardry, scotland': { lat: 56.4907, lon: -4.2026 },
  'dorset, england': { lat: 50.7489, lon: -2.3421 },
  'bristol, england': { lat: 51.4545, lon: -2.5879 },
  'new forest, hampshire, england': { lat: 50.8652, lon: -1.5647 },
  'london, england': { lat: 51.5074, lon: -0.1278 },
  'oxford, oxfordshire, england': { lat: 51.7520, lon: -1.2577 },
  'salt lake city, utah, usa': { lat: 40.7608, lon: -111.8910 },
  'provo, utah, usa': { lat: 40.2338, lon: -111.6585 },

  // Israel & Middle East
  'jerusalem, israel': { lat: 31.7683, lon: 35.2137 },
  'jerusalem': { lat: 31.7683, lon: 35.2137 },
  'tel aviv, israel': { lat: 32.0853, lon: 34.7818 },
  'tel aviv': { lat: 32.0853, lon: 34.7818 },
  'tel aviv-yafo, israel': { lat: 32.0853, lon: 34.7818 },
  'haifa, israel': { lat: 32.7940, lon: 34.9896 },
  'haifa': { lat: 32.7940, lon: 34.9896 },
  'safed, israel': { lat: 32.9646, lon: 35.4960 },
  'tzfat, israel': { lat: 32.9646, lon: 35.4960 },
  'tiberias, israel': { lat: 32.7922, lon: 35.5312 },
  'tverya, israel': { lat: 32.7922, lon: 35.5312 },
  'beersheba, israel': { lat: 31.2529, lon: 34.7915 },
  'beer sheva, israel': { lat: 31.2529, lon: 34.7915 },
  'jaffa, israel': { lat: 32.0519, lon: 34.7533 },
  'yafo, israel': { lat: 32.0519, lon: 34.7533 },
  'hebron, israel': { lat: 31.5326, lon: 35.0998 },
  'petah tikva, israel': { lat: 32.0840, lon: 34.8878 },
  'rishon lezion, israel': { lat: 31.9730, lon: 34.7925 },
  'holon, israel': { lat: 32.0158, lon: 34.7874 },
  'netanya, israel': { lat: 32.3215, lon: 34.8532 },
  'ramat gan, israel': { lat: 32.0684, lon: 34.8248 },
  'rehovot, israel': { lat: 31.8928, lon: 34.8113 },
  'ashdod, israel': { lat: 31.8044, lon: 34.6553 },
  'ashkelon, israel': { lat: 31.6688, lon: 34.5743 },
  'israel': { lat: 31.0461, lon: 34.8516 },
  'palestine': { lat: 31.9522, lon: 35.2332 },
  'cairo, egypt': { lat: 30.0444, lon: 31.2357 },
  'alexandria, egypt': { lat: 31.2001, lon: 29.9187 },
  'baghdad, iraq': { lat: 33.3152, lon: 44.3661 },
  'damascus, syria': { lat: 33.5138, lon: 36.2765 },
  'aleppo, syria': { lat: 36.2021, lon: 37.1343 },
  'beirut, lebanon': { lat: 33.8938, lon: 35.5018 },
  'tripoli, libya': { lat: 32.8872, lon: 13.1913 },
  'tunis, tunisia': { lat: 36.8065, lon: 10.1815 },
  'casablanca, morocco': { lat: 33.5731, lon: -7.5898 },
  'marrakech, morocco': { lat: 31.6295, lon: -7.9811 },
  'fes, morocco': { lat: 34.0181, lon: -5.0078 },
  'tehran, iran': { lat: 35.6892, lon: 51.3890 },
  'isfahan, iran': { lat: 32.6546, lon: 51.6680 },
  'istanbul, turkey': { lat: 41.0082, lon: 28.9784 },
  'izmir, turkey': { lat: 38.4237, lon: 27.1428 },
  'constantinople, ottoman empire': { lat: 41.0082, lon: 28.9784 },
  'turkey': { lat: 38.9637, lon: 35.2433 },

  // Eastern Europe & Pale of Settlement
  'warsaw, poland': { lat: 52.2297, lon: 21.0122 },
  'warszawa, poland': { lat: 52.2297, lon: 21.0122 },
  'warsaw': { lat: 52.2297, lon: 21.0122 },
  'krakow, poland': { lat: 50.0647, lon: 19.9450 },
  'krakow': { lat: 50.0647, lon: 19.9450 },
  'cracow, poland': { lat: 50.0647, lon: 19.9450 },
  'lodz, poland': { lat: 51.7592, lon: 19.4560 },
  'wroclaw, poland': { lat: 51.1079, lon: 17.0385 },
  'poznan, poland': { lat: 52.4064, lon: 16.9252 },
  'gdansk, poland': { lat: 54.3520, lon: 18.6466 },
  'lublin, poland': { lat: 51.2465, lon: 22.5684 },
  'bialystok, poland': { lat: 53.1325, lon: 23.1688 },
  'czestochowa, poland': { lat: 50.8118, lon: 19.1203 },
  'radom, poland': { lat: 51.4027, lon: 21.1471 },
  'kielce, poland': { lat: 50.8661, lon: 20.6286 },
  'tarnow, poland': { lat: 50.0121, lon: 20.9858 },
  'rzeszow, poland': { lat: 50.0412, lon: 21.9991 },
  'przemysl, poland': { lat: 49.7839, lon: 22.7679 },
  'zamosc, poland': { lat: 50.7231, lon: 23.2519 },
  'poland': { lat: 51.9194, lon: 19.1451 },

  // Ukraine
  'kyiv, ukraine': { lat: 50.4501, lon: 30.5234 },
  'kiev, ukraine': { lat: 50.4501, lon: 30.5234 },
  'kiev': { lat: 50.4501, lon: 30.5234 },
  'lviv, ukraine': { lat: 49.8397, lon: 24.0297 },
  'lwow, poland': { lat: 49.8397, lon: 24.0297 },
  'lemberg, austria': { lat: 49.8397, lon: 24.0297 },
  'odessa, ukraine': { lat: 46.4825, lon: 30.7233 },
  'odessa': { lat: 46.4825, lon: 30.7233 },
  'kharkiv, ukraine': { lat: 49.9935, lon: 36.2304 },
  'dnipro, ukraine': { lat: 48.4647, lon: 35.0462 },
  'yekaterinoslav, russian empire': { lat: 48.4647, lon: 35.0462 },
  'zaporizhzhia, ukraine': { lat: 47.8388, lon: 35.1396 },
  'vinnytsia, ukraine': { lat: 49.2331, lon: 28.4682 },
  'zhytomyr, ukraine': { lat: 50.2547, lon: 28.6587 },
  'berdichev, ukraine': { lat: 49.8926, lon: 28.5776 },
  'chernivtsi, ukraine': { lat: 48.2921, lon: 25.9358 },
  'czernowitz, bukovina': { lat: 48.2921, lon: 25.9358 },
  'ivano-frankivsk, ukraine': { lat: 48.9226, lon: 24.7111 },
  'stanislawow, poland': { lat: 48.9226, lon: 24.7111 },
  'ternopil, ukraine': { lat: 49.5535, lon: 25.5948 },
  'tarnopol, galicia': { lat: 49.5535, lon: 25.5948 },
  'drohobych, ukraine': { lat: 49.3514, lon: 23.5061 },
  'stryi, ukraine': { lat: 49.2562, lon: 23.8569 },
  'rivne, ukraine': { lat: 50.6199, lon: 26.2516 },
  'lutsk, ukraine': { lat: 50.7472, lon: 25.3254 },
  'poltava, ukraine': { lat: 49.5883, lon: 34.5514 },
  'sumy, ukraine': { lat: 50.9077, lon: 34.7981 },
  'mykolaiv, ukraine': { lat: 46.9750, lon: 31.9946 },
  'kherson, ukraine': { lat: 46.6354, lon: 32.6169 },
  'simferopol, crimea': { lat: 44.9521, lon: 34.1024 },
  'ukraine': { lat: 48.3794, lon: 31.1656 },

  // Belarus
  'minsk, belarus': { lat: 53.9045, lon: 27.5615 },
  'minsk': { lat: 53.9045, lon: 27.5615 },
  'grodno, belarus': { lat: 53.6884, lon: 23.8258 },
  'brest, belarus': { lat: 52.0976, lon: 23.7341 },
  'brisk, belarus': { lat: 52.0976, lon: 23.7341 },
  'gomel, belarus': { lat: 52.4345, lon: 30.9754 },
  'vitebsk, belarus': { lat: 55.1872, lon: 30.2051 },
  'mogilev, belarus': { lat: 53.9168, lon: 30.3449 },
  'pinsk, belarus': { lat: 52.1153, lon: 26.1031 },
  'bobruisk, belarus': { lat: 53.1384, lon: 29.2214 },
  'baranovichi, belarus': { lat: 53.1327, lon: 26.0139 },
  'belarus': { lat: 53.7098, lon: 27.9534 },

  // Lithuania, Latvia, Estonia
  'vilnius, lithuania': { lat: 54.6872, lon: 25.2797 },
  'vilna, lithuania': { lat: 54.6872, lon: 25.2797 },
  'vilna': { lat: 54.6872, lon: 25.2797 },
  'kaunas, lithuania': { lat: 54.8985, lon: 23.9036 },
  'kovno, lithuania': { lat: 54.8985, lon: 23.9036 },
  'klaipeda, lithuania': { lat: 55.7033, lon: 21.1443 },
  'siauliai, lithuania': { lat: 55.9350, lon: 23.3137 },
  'shavli, lithuania': { lat: 55.9350, lon: 23.3137 },
  'panevezys, lithuania': { lat: 55.7348, lon: 24.3575 },
  'lithuania': { lat: 55.1694, lon: 23.8813 },
  'riga, latvia': { lat: 56.9496, lon: 24.1052 },
  'riga': { lat: 56.9496, lon: 24.1052 },
  'daugavpils, latvia': { lat: 55.8747, lon: 26.5362 },
  'dvinsk, latvia': { lat: 55.8747, lon: 26.5362 },
  'liepaja, latvia': { lat: 56.5047, lon: 21.0108 },
  'latvia': { lat: 56.8796, lon: 24.6032 },
  'tallinn, estonia': { lat: 59.4370, lon: 24.7535 },
  'estonia': { lat: 58.5953, lon: 25.0136 },

  // Russia
  'moscow, russia': { lat: 55.7558, lon: 37.6173 },
  'moscow': { lat: 55.7558, lon: 37.6173 },
  'saint petersburg, russia': { lat: 59.9343, lon: 30.3351 },
  'st petersburg, russia': { lat: 59.9343, lon: 30.3351 },
  'petrograd, russia': { lat: 59.9343, lon: 30.3351 },
  'leningrad, russia': { lat: 59.9343, lon: 30.3351 },
  'smolensk, russia': { lat: 54.7903, lon: 32.0504 },
  'rostov-on-don, russia': { lat: 47.2357, lon: 39.7015 },
  'kazan, russia': { lat: 55.8304, lon: 49.0661 },
  'samara, russia': { lat: 53.2415, lon: 50.2212 },
  'nizhny novgorod, russia': { lat: 56.2965, lon: 43.9361 },
  'russia': { lat: 61.5240, lon: 105.3188 },
  'russian empire': { lat: 55.7558, lon: 37.6173 },

  // Moldova & Romania
  'chisinau, moldova': { lat: 47.0105, lon: 28.8638 },
  'kishinev, moldova': { lat: 47.0105, lon: 28.8638 },
  'tiraspol, moldova': { lat: 46.8403, lon: 29.6433 },
  'balti, moldova': { lat: 47.7617, lon: 27.9289 },
  'moldova': { lat: 47.4116, lon: 28.3699 },
  'bucharest, romania': { lat: 44.4268, lon: 26.1025 },
  'iasi, romania': { lat: 47.1585, lon: 27.6014 },
  'cluj-napoca, romania': { lat: 46.7712, lon: 23.6236 },
  'timisoara, romania': { lat: 45.7489, lon: 21.2087 },
  'brasov, romania': { lat: 45.6579, lon: 25.6012 },
  'constanta, romania': { lat: 44.1598, lon: 28.6348 },
  'craiova, romania': { lat: 44.3302, lon: 23.7949 },
  'galati, romania': { lat: 45.4353, lon: 28.0080 },
  'romania': { lat: 45.9432, lon: 24.9668 },

  // Hungary, Czech Republic, Slovakia, Austria, Germany
  'budapest, hungary': { lat: 47.4979, lon: 19.0402 },
  'budapest': { lat: 47.4979, lon: 19.0402 },
  'debrecen, hungary': { lat: 47.5316, lon: 21.6273 },
  'szeged, hungary': { lat: 46.2530, lon: 20.1414 },
  'miskolc, hungary': { lat: 48.1035, lon: 20.7784 },
  'hungary': { lat: 47.1625, lon: 19.5033 },
  'prague, czech republic': { lat: 50.0755, lon: 14.4378 },
  'prague': { lat: 50.0755, lon: 14.4378 },
  'praha, czech republic': { lat: 50.0755, lon: 14.4378 },
  'brno, czech republic': { lat: 49.1951, lon: 16.6068 },
  'ostrava, czech republic': { lat: 49.8209, lon: 18.2625 },
  'plzen, czech republic': { lat: 49.7384, lon: 13.3736 },
  'czech republic': { lat: 49.8175, lon: 15.4730 },
  'czechia': { lat: 49.8175, lon: 15.4730 },
  'bohemia': { lat: 50.0755, lon: 14.4378 },
  'moravia': { lat: 49.1951, lon: 16.6068 },
  'bratislava, slovakia': { lat: 48.1486, lon: 17.1077 },
  'pressburg, austria-hungary': { lat: 48.1486, lon: 17.1077 },
  'kosice, slovakia': { lat: 48.7164, lon: 21.2611 },
  'slovakia': { lat: 48.6690, lon: 19.6990 },
  'vienna, austria': { lat: 48.2082, lon: 16.3738 },
  'wien, austria': { lat: 48.2082, lon: 16.3738 },
  'vienna': { lat: 48.2082, lon: 16.3738 },
  'salzburg, austria': { lat: 47.8095, lon: 13.0550 },
  'graz, austria': { lat: 47.0707, lon: 15.4395 },
  'innsbruck, austria': { lat: 47.2692, lon: 11.4041 },
  'linz, austria': { lat: 48.3069, lon: 14.2858 },
  'austria': { lat: 47.5162, lon: 14.5501 },
  'austria-hungary': { lat: 48.2082, lon: 16.3738 },
  'berlin, germany': { lat: 52.5200, lon: 13.4050 },
  'berlin': { lat: 52.5200, lon: 13.4050 },
  'frankfurt, germany': { lat: 50.1109, lon: 8.6821 },
  'frankfurt am main, germany': { lat: 50.1109, lon: 8.6821 },
  'munich, germany': { lat: 48.1351, lon: 11.5820 },
  'muenchen, germany': { lat: 48.1351, lon: 11.5820 },
  'munich': { lat: 48.1351, lon: 11.5820 },
  'hamburg, germany': { lat: 53.5511, lon: 9.9937 },
  'hamburg': { lat: 53.5511, lon: 9.9937 },
  'cologne, germany': { lat: 50.9375, lon: 6.9603 },
  'koeln, germany': { lat: 50.9375, lon: 6.9603 },
  'stuttgart, germany': { lat: 48.7758, lon: 9.1829 },
  'dusseldorf, germany': { lat: 51.2277, lon: 6.7735 },
  'leipzig, germany': { lat: 51.3397, lon: 12.3731 },
  'dresden, germany': { lat: 51.0504, lon: 13.7373 },
  'hanover, germany': { lat: 52.3759, lon: 9.7320 },
  'nuremberg, germany': { lat: 49.4521, lon: 11.0767 },
  'nuernberg, germany': { lat: 49.4521, lon: 11.0767 },
  'bremen, germany': { lat: 53.0793, lon: 8.8017 },
  'mannheim, germany': { lat: 49.4875, lon: 8.4660 },
  'karlsruhe, germany': { lat: 49.0069, lon: 8.4037 },
  'augsburg, germany': { lat: 48.3705, lon: 10.8978 },
  'wiesbaden, germany': { lat: 50.0782, lon: 8.2398 },
  'bonn, germany': { lat: 50.7374, lon: 7.0982 },
  'kassel, germany': { lat: 51.3127, lon: 9.4797 },
  'mainz, germany': { lat: 49.9929, lon: 8.2473 },
  'worms, germany': { lat: 49.6358, lon: 8.3582 },
  'speyer, germany': { lat: 49.3174, lon: 8.4412 },
  'bavaria, germany': { lat: 48.7904, lon: 11.4979 },
  'prussia': { lat: 52.5200, lon: 13.4050 },
  'germany': { lat: 51.1657, lon: 10.4515 },

  // Western Europe
  'paris, france': { lat: 48.8566, lon: 2.3522 },
  'paris': { lat: 48.8566, lon: 2.3522 },
  'marseille, france': { lat: 43.2965, lon: 5.3698 },
  'lyon, france': { lat: 45.7640, lon: 4.8357 },
  'strasbourg, france': { lat: 48.5734, lon: 7.7521 },
  'alsace, france': { lat: 48.3182, lon: 7.4416 },
  'lorraine, france': { lat: 48.8499, lon: 6.2441 },
  'nice, france': { lat: 43.7102, lon: 7.2620 },
  'bordeaux, france': { lat: 44.8378, lon: -0.5792 },
  'france': { lat: 46.2276, lon: 2.2137 },
  'amsterdam, netherlands': { lat: 52.3676, lon: 4.9041 },
  'amsterdam': { lat: 52.3676, lon: 4.9041 },
  'rotterdam, netherlands': { lat: 51.9244, lon: 4.4777 },
  'the hague, netherlands': { lat: 52.0705, lon: 4.3007 },
  'utrecht, netherlands': { lat: 52.0907, lon: 5.1214 },
  'netherlands': { lat: 52.1326, lon: 5.2913 },
  'holland': { lat: 52.1326, lon: 5.2913 },
  'brussels, belgium': { lat: 50.8503, lon: 4.3517 },
  'antwerp, belgium': { lat: 51.2194, lon: 4.4025 },
  'belgium': { lat: 50.5039, lon: 4.4699 },
  'london, uk': { lat: 51.5074, lon: -0.1278 },
  'london, united kingdom': { lat: 51.5074, lon: -0.1278 },
  'london': { lat: 51.5074, lon: -0.1278 },
  'manchester, england': { lat: 53.4808, lon: -2.2426 },
  'manchester, uk': { lat: 53.4808, lon: -2.2426 },
  'birmingham, england': { lat: 52.4862, lon: -1.8904 },
  'leeds, england': { lat: 53.8008, lon: -1.5491 },
  'liverpool, england': { lat: 53.4084, lon: -2.9916 },
  'newcastle, england': { lat: 54.9783, lon: -1.6178 },
  'sheffield, england': { lat: 53.3811, lon: -1.4701 },
  'edinburgh, scotland': { lat: 55.9533, lon: -3.1883 },
  'glasgow, scotland': { lat: 55.8642, lon: -4.2518 },
  'cardiff, wales': { lat: 51.4816, lon: -3.1791 },
  'belfast, northern ireland': { lat: 54.5973, lon: -5.9301 },
  'dublin, ireland': { lat: 53.3498, lon: -6.2603 },
  'england': { lat: 52.3555, lon: -1.1743 },
  'scotland': { lat: 56.4907, lon: -4.2026 },
  'wales': { lat: 52.1307, lon: -3.7837 },
  'united kingdom': { lat: 55.3781, lon: -3.4360 },
  'uk': { lat: 55.3781, lon: -3.4360 },
  'ireland': { lat: 53.1424, lon: -7.6921 },
  'rome, italy': { lat: 41.9028, lon: 12.4964 },
  'milan, italy': { lat: 45.4642, lon: 9.1900 },
  'venice, italy': { lat: 45.4408, lon: 12.3155 },
  'florence, italy': { lat: 43.7696, lon: 11.2558 },
  'naples, italy': { lat: 40.8518, lon: 14.2681 },
  'turin, italy': { lat: 45.0703, lon: 7.6869 },
  'italy': { lat: 41.8719, lon: 12.5674 },
  'madrid, spain': { lat: 40.4168, lon: -3.7038 },
  'barcelona, spain': { lat: 41.3879, lon: 2.1699 },
  'toledo, spain': { lat: 39.8628, lon: -4.0273 },
  'seville, spain': { lat: 37.3891, lon: -5.9845 },
  'spain': { lat: 40.4637, lon: -3.7492 },
  'lisbon, portugal': { lat: 38.7223, lon: -9.1393 },
  'porto, portugal': { lat: 41.1579, lon: -8.6291 },
  'portugal': { lat: 39.3999, lon: -8.2245 },
  'zurich, switzerland': { lat: 47.3769, lon: 8.5417 },
  'geneva, switzerland': { lat: 46.2044, lon: 6.1432 },
  'basel, switzerland': { lat: 47.5596, lon: 7.5886 },
  'switzerland': { lat: 46.8182, lon: 8.2275 },
  'athens, greece': { lat: 37.9838, lon: 23.7275 },
  'thessaloniki, greece': { lat: 40.6401, lon: 22.9444 },
  'salonica, greece': { lat: 40.6401, lon: 22.9444 },
  'greece': { lat: 39.0742, lon: 21.8243 },
  'sofia, bulgaria': { lat: 42.6977, lon: 23.3219 },
  'plovdiv, bulgaria': { lat: 42.1354, lon: 24.7453 },
  'bulgaria': { lat: 42.7339, lon: 25.4858 },
  'belgrade, serbia': { lat: 44.7866, lon: 20.4489 },
  'serbia': { lat: 44.0165, lon: 21.0059 },
  'zagreb, croatia': { lat: 45.8150, lon: 15.9819 },
  'croatia': { lat: 45.1000, lon: 15.2000 },
  'sarajevo, bosnia': { lat: 43.8563, lon: 18.4131 },

  // USA & Americas
  'new york, ny, usa': { lat: 40.7128, lon: -74.0060 },
  'new york, usa': { lat: 40.7128, lon: -74.0060 },
  'new york, ny': { lat: 40.7128, lon: -74.0060 },
  'new york city, ny, usa': { lat: 40.7128, lon: -74.0060 },
  'new york city': { lat: 40.7128, lon: -74.0060 },
  'new york': { lat: 40.7128, lon: -74.0060 },
  'brooklyn, ny, usa': { lat: 40.6782, lon: -73.9442 },
  'brooklyn, kings, new york, usa': { lat: 40.6782, lon: -73.9442 },
  'brooklyn, ny': { lat: 40.6782, lon: -73.9442 },
  'brooklyn': { lat: 40.6782, lon: -73.9442 },
  'manhattan, ny, usa': { lat: 40.7831, lon: -73.9712 },
  'queens, ny, usa': { lat: 40.7282, lon: -73.7949 },
  'bronx, ny, usa': { lat: 40.8448, lon: -73.8648 },
  'staten island, ny, usa': { lat: 40.5795, lon: -74.1502 },
  'chicago, il, usa': { lat: 41.8781, lon: -87.6298 },
  'chicago, illinois, usa': { lat: 41.8781, lon: -87.6298 },
  'chicago, il': { lat: 41.8781, lon: -87.6298 },
  'chicago': { lat: 41.8781, lon: -87.6298 },
  'philadelphia, pa, usa': { lat: 39.9526, lon: -75.1652 },
  'philadelphia, pennsylvania, usa': { lat: 39.9526, lon: -75.1652 },
  'philadelphia, pa': { lat: 39.9526, lon: -75.1652 },
  'philadelphia': { lat: 39.9526, lon: -75.1652 },
  'boston, ma, usa': { lat: 42.3601, lon: -71.0589 },
  'boston, massachusetts, usa': { lat: 42.3601, lon: -71.0589 },
  'boston, ma': { lat: 42.3601, lon: -71.0589 },
  'boston': { lat: 42.3601, lon: -71.0589 },
  'baltimore, md, usa': { lat: 39.2904, lon: -76.6122 },
  'baltimore, maryland, usa': { lat: 39.2904, lon: -76.6122 },
  'washington, dc, usa': { lat: 38.9072, lon: -77.0369 },
  'washington, d.c., usa': { lat: 38.9072, lon: -77.0369 },
  'pittsburgh, pa, usa': { lat: 40.4406, lon: -79.9959 },
  'cleveland, oh, usa': { lat: 41.4993, lon: -81.6944 },
  'cleveland, ohio, usa': { lat: 41.4993, lon: -81.6944 },
  'detroit, mi, usa': { lat: 42.3314, lon: -83.0458 },
  'detroit, michigan, usa': { lat: 42.3314, lon: -83.0458 },
  'los angeles, ca, usa': { lat: 34.0522, lon: -118.2437 },
  'los angeles, california, usa': { lat: 34.0522, lon: -118.2437 },
  'los angeles, ca': { lat: 34.0522, lon: -118.2437 },
  'los angeles': { lat: 34.0522, lon: -118.2437 },
  'san francisco, ca, usa': { lat: 37.7749, lon: -122.4194 },
  'san francisco, california, usa': { lat: 37.7749, lon: -122.4194 },
  'seattle, wa, usa': { lat: 47.6062, lon: -122.3321 },
  'denver, co, usa': { lat: 39.7392, lon: -104.9903 },
  'miami, fl, usa': { lat: 25.7617, lon: -80.1918 },
  'miami, florida, usa': { lat: 25.7617, lon: -80.1918 },
  'atlanta, ga, usa': { lat: 33.7490, lon: -84.3880 },
  'houston, tx, usa': { lat: 29.7604, lon: -95.3698 },
  'dallas, tx, usa': { lat: 32.7767, lon: -96.7970 },
  'austin, tx, usa': { lat: 30.2672, lon: -97.7431 },
  'st. louis, mo, usa': { lat: 38.6270, lon: -90.1994 },
  'minneapolis, mn, usa': { lat: 44.9778, lon: -93.2650 },
  'milwaukee, wi, usa': { lat: 43.0389, lon: -87.9065 },
  'newark, nj, usa': { lat: 40.7357, lon: -74.1724 },
  'new jersey, usa': { lat: 40.0583, lon: -74.4057 },
  'pennsylvania, usa': { lat: 41.2033, lon: -77.1945 },
  'ohio, usa': { lat: 40.4173, lon: -82.9071 },
  'illinois, usa': { lat: 40.6331, lon: -89.3985 },
  'california, usa': { lat: 36.7783, lon: -119.4179 },
  'texas, usa': { lat: 31.9686, lon: -99.9018 },
  'massachusetts, usa': { lat: 42.4072, lon: -71.3824 },
  'connecticut, usa': { lat: 41.6032, lon: -73.0877 },
  'florida, usa': { lat: 27.6648, lon: -81.5158 },
  'utah, usa': { lat: 39.3210, lon: -111.0937 },
  'usa': { lat: 37.0902, lon: -95.7129 },
  'united states': { lat: 37.0902, lon: -95.7129 },

  // Canada & Latin America & Oceania
  'toronto, ontario, canada': { lat: 43.6532, lon: -79.3832 },
  'toronto, canada': { lat: 43.6532, lon: -79.3832 },
  'toronto': { lat: 43.6532, lon: -79.3832 },
  'montreal, quebec, canada': { lat: 45.5017, lon: -73.5673 },
  'montreal, canada': { lat: 45.5017, lon: -73.5673 },
  'vancouver, bc, canada': { lat: 49.2827, lon: -123.1207 },
  'ottawa, ontario, canada': { lat: 45.4215, lon: -75.6972 },
  'winnipeg, manitoba, canada': { lat: 49.8951, lon: -97.1384 },
  'canada': { lat: 56.1304, lon: -106.3468 },
  'buenos aires, argentina': { lat: -34.6037, lon: -58.3816 },
  'buenos aires': { lat: -34.6037, lon: -58.3816 },
  'argentina': { lat: -38.4161, lon: -63.6167 },
  'sao paulo, brazil': { lat: -23.5505, lon: -46.6333 },
  'rio de janeiro, brazil': { lat: -22.9068, lon: -43.1729 },
  'brazil': { lat: -14.2350, lon: -51.9253 },
  'mexico city, mexico': { lat: 19.4326, lon: -99.1332 },
  'mexico': { lat: 23.6345, lon: -102.5528 },
  'sydney, australia': { lat: -33.8688, lon: 151.2093 },
  'melbourne, australia': { lat: -37.8136, lon: 144.9631 },
  'australia': { lat: -25.2744, lon: 133.7751 },
  'johannesburg, south africa': { lat: -26.2041, lon: 28.0473 },
  'cape town, south africa': { lat: -33.9249, lon: 18.4241 },
  'south africa': { lat: -30.5595, lon: 22.9375 },
};

/**
 * Normalizes a place name for dictionary lookup:
 * - Converts to lower case
 * - Strips punctuation, quotes, trailing dots
 * - Normalizes whitespace and common delimiters
 */
export const normalizePlaceKey = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/["'״׳]/g, '')
    .replace(/[;:]+/g, ',')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Fast lookup in the pre-populated knowledge base.
 * Checks exact match, normalized match, and hierarchical segment matches (city, country, etc.)
 */
export const findKnownLocation = (rawName: string): LocationCoords | null => {
  if (!rawName) return null;

  const normalized = normalizePlaceKey(rawName);

  // 1. Direct match on normalized string
  if (KNOWN_LOCATIONS_DATABASE[normalized]) {
    return KNOWN_LOCATIONS_DATABASE[normalized];
  }

  // 2. Check without common prefix words ("the", "cemetery in", "hospital of", etc.)
  const cleanedPrefix = normalized.replace(/^(the|at|in|near|near to|hospital|church|cemetery|synagogue)\s+/i, '');
  if (KNOWN_LOCATIONS_DATABASE[cleanedPrefix]) {
    return KNOWN_LOCATIONS_DATABASE[cleanedPrefix];
  }

  // 3. Segment analysis for comma-separated addresses
  // e.g. "The Rookery, Ottery St Catchpole, Devon, England" -> "Ottery St Catchpole, Devon, England"
  const segments = normalized.split(',').map(s => s.trim()).filter(Boolean);
  if (segments.length > 1) {
    // Try dropping first segment (often specific building, house, or cemetery)
    const withoutFirst = segments.slice(1).join(', ');
    if (KNOWN_LOCATIONS_DATABASE[withoutFirst]) {
      return KNOWN_LOCATIONS_DATABASE[withoutFirst];
    }

    // Try first + last (e.g. "Brooklyn, Kings, New York, USA" -> "Brooklyn, USA")
    const cityAndCountry = `${segments[0]}, ${segments[segments.length - 1]}`;
    if (KNOWN_LOCATIONS_DATABASE[cityAndCountry]) {
      return KNOWN_LOCATIONS_DATABASE[cityAndCountry];
    }

    // Try just city (first segment)
    if (KNOWN_LOCATIONS_DATABASE[segments[0]]) {
      return KNOWN_LOCATIONS_DATABASE[segments[0]];
    }

    // Try just last segment (country/state) as fallback
    const lastSeg = segments[segments.length - 1];
    if (KNOWN_LOCATIONS_DATABASE[lastSeg]) {
      return KNOWN_LOCATIONS_DATABASE[lastSeg];
    }
  }

  return null;
};
