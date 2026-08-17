// City coordinates for geolocation matching
// Format: [lat, lng] (note: PulseMap uses [lng, lat] but geo API returns [lat, lng])

export interface CityGeo {
  cityId: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
}

export const CITY_COORDINATES: CityGeo[] = [
  // Argentina
  { cityId: 'buenos-aires', name: 'Buenos Aires', country: 'AR', lat: -34.6037, lng: -58.3816 },
  { cityId: 'cordoba', name: 'Córdoba', country: 'AR', lat: -31.4201, lng: -64.1888 },
  { cityId: 'rosario', name: 'Rosario', country: 'AR', lat: -32.9468, lng: -60.6393 },
  { cityId: 'mendoza', name: 'Mendoza', country: 'AR', lat: -32.8895, lng: -68.8458 },
  { cityId: 'la-plata', name: 'La Plata', country: 'AR', lat: -34.9215, lng: -57.9545 },
  { cityId: 'tucuman', name: 'Tucumán', country: 'AR', lat: -26.8083, lng: -65.2176 },
  { cityId: 'mar-del-plata', name: 'Mar del Plata', country: 'AR', lat: -38.0055, lng: -57.5426 },
  // United States
  { cityId: 'new-york', name: 'New York', country: 'US', lat: 40.7128, lng: -74.006 },
  { cityId: 'los-angeles', name: 'Los Angeles', country: 'US', lat: 34.0522, lng: -118.2437 },
  { cityId: 'chicago', name: 'Chicago', country: 'US', lat: 41.8781, lng: -87.6298 },
  { cityId: 'houston', name: 'Houston', country: 'US', lat: 29.7604, lng: -95.3698 },
  { cityId: 'miami', name: 'Miami', country: 'US', lat: 25.7617, lng: -80.1918 },
  { cityId: 'san-francisco', name: 'San Francisco', country: 'US', lat: 37.7749, lng: -122.4194 },
  { cityId: 'seattle', name: 'Seattle', country: 'US', lat: 47.6062, lng: -122.3321 },
  // Brazil
  { cityId: 'sao-paulo', name: 'São Paulo', country: 'BR', lat: -23.5505, lng: -46.6333 },
  { cityId: 'rio-de-janeiro', name: 'Rio de Janeiro', country: 'BR', lat: -22.9068, lng: -43.1729 },
  { cityId: 'brasilia', name: 'Brasília', country: 'BR', lat: -15.7975, lng: -47.8919 },
  { cityId: 'salvador', name: 'Salvador', country: 'BR', lat: -12.9714, lng: -38.5124 },
  { cityId: 'fortaleza', name: 'Fortaleza', country: 'BR', lat: -3.7172, lng: -38.5433 },
  // Mexico
  { cityId: 'mexico-city', name: 'Ciudad de México', country: 'MX', lat: 19.4326, lng: -99.1332 },
  { cityId: 'guadalajara', name: 'Guadalajara', country: 'MX', lat: 20.6597, lng: -103.3496 },
  { cityId: 'monterrey', name: 'Monterrey', country: 'MX', lat: 25.6866, lng: -100.3161 },
  { cityId: 'cancun', name: 'Cancún', country: 'MX', lat: 21.1619, lng: -86.8515 },
  // Spain
  { cityId: 'madrid', name: 'Madrid', country: 'ES', lat: 40.4168, lng: -3.7038 },
  { cityId: 'barcelona', name: 'Barcelona', country: 'ES', lat: 41.3874, lng: 2.1686 },
  { cityId: 'valencia', name: 'Valencia', country: 'ES', lat: 39.4699, lng: -0.3763 },
  { cityId: 'sevilla', name: 'Sevilla', country: 'ES', lat: 37.3891, lng: -5.9845 },
  // United Kingdom
  { cityId: 'london', name: 'London', country: 'GB', lat: 51.5074, lng: -0.1276 },
  { cityId: 'manchester', name: 'Manchester', country: 'GB', lat: 53.4808, lng: -2.2426 },
  { cityId: 'birmingham', name: 'Birmingham', country: 'GB', lat: 52.4862, lng: -1.8904 },
  { cityId: 'edinburgh', name: 'Edinburgh', country: 'GB', lat: 55.9533, lng: -3.1883 },
  // Germany
  { cityId: 'berlin', name: 'Berlin', country: 'DE', lat: 52.52, lng: 13.405 },
  { cityId: 'munich', name: 'Munich', country: 'DE', lat: 48.1351, lng: 11.582 },
  { cityId: 'hamburg', name: 'Hamburg', country: 'DE', lat: 53.5511, lng: 9.9937 },
  { cityId: 'frankfurt', name: 'Frankfurt', country: 'DE', lat: 50.1109, lng: 8.6821 },
  // France
  { cityId: 'paris', name: 'Paris', country: 'FR', lat: 48.8566, lng: 2.3522 },
  { cityId: 'lyon', name: 'Lyon', country: 'FR', lat: 45.764, lng: 4.8357 },
  { cityId: 'marseille', name: 'Marseille', country: 'FR', lat: 43.2965, lng: 5.3698 },
  { cityId: 'toulouse', name: 'Toulouse', country: 'FR', lat: 43.6047, lng: 1.4442 },
  // Chile
  { cityId: 'santiago', name: 'Santiago', country: 'CL', lat: -33.4489, lng: -70.6693 },
  { cityId: 'valparaiso', name: 'Valparaíso', country: 'CL', lat: -33.0472, lng: -71.6127 },
  { cityId: 'concepcion', name: 'Concepción', country: 'CL', lat: -36.8201, lng: -73.0444 },
  // Colombia
  { cityId: 'bogota', name: 'Bogotá', country: 'CO', lat: 4.711, lng: -74.0721 },
  { cityId: 'medellin', name: 'Medellín', country: 'CO', lat: 6.2476, lng: -75.5658 },
  { cityId: 'cali', name: 'Cali', country: 'CO', lat: 3.4516, lng: -76.532 },
  { cityId: 'barranquilla', name: 'Barranquilla', country: 'CO', lat: 10.9685, lng: -74.7813 },
  // Additional map coverage
  { cityId: 'tokyo', name: 'Tokyo', country: 'JP', lat: 35.6895, lng: 139.6917 },
  { cityId: 'sydney', name: 'Sydney', country: 'AU', lat: -33.8688, lng: 151.2093 },
  { cityId: 'melbourne', name: 'Melbourne', country: 'AU', lat: -37.8136, lng: 144.9631 },
  { cityId: 'dubai', name: 'Dubai', country: 'AE', lat: 25.2048, lng: 55.2708 },
  { cityId: 'singapore', name: 'Singapore', country: 'SG', lat: 1.3521, lng: 103.8198 },
  { cityId: 'hong-kong', name: 'Hong Kong', country: 'HK', lat: 22.3193, lng: 114.1694 },
  { cityId: 'rome', name: 'Rome', country: 'IT', lat: 41.9028, lng: 12.4964 },
  { cityId: 'amsterdam', name: 'Amsterdam', country: 'NL', lat: 52.3676, lng: 4.9041 },
  { cityId: 'toronto', name: 'Toronto', country: 'CA', lat: 43.6532, lng: -79.3832 },
  { cityId: 'vancouver', name: 'Vancouver', country: 'CA', lat: 49.2827, lng: -123.1207 },
  { cityId: 'lima', name: 'Lima', country: 'PE', lat: -12.0464, lng: -77.0428 },
  { cityId: 'mumbai', name: 'Mumbai', country: 'IN', lat: 19.076, lng: 72.8777 },
  { cityId: 'delhi', name: 'Delhi', country: 'IN', lat: 28.7041, lng: 77.1025 },
  { cityId: 'bangkok', name: 'Bangkok', country: 'TH', lat: 13.7563, lng: 100.5018 },
  { cityId: 'seoul', name: 'Seoul', country: 'KR', lat: 37.5665, lng: 126.978 },
  { cityId: 'moscow', name: 'Moscow', country: 'RU', lat: 55.7558, lng: 37.6173 },
  { cityId: 'cairo', name: 'Cairo', country: 'EG', lat: 30.0444, lng: 31.2357 },
  { cityId: 'lagos', name: 'Lagos', country: 'NG', lat: 6.5244, lng: 3.3792 },
  { cityId: 'johannesburg', name: 'Johannesburg', country: 'ZA', lat: -26.2041, lng: 28.0473 },
  { cityId: 'shanghai', name: 'Shanghai', country: 'CN', lat: 31.2304, lng: 121.4737 },
  { cityId: 'beijing', name: 'Beijing', country: 'CN', lat: 39.9042, lng: 116.4074 },
  { cityId: 'lisbon', name: 'Lisbon', country: 'PT', lat: 38.7223, lng: -9.1393 },
  { cityId: 'vienna', name: 'Vienna', country: 'AT', lat: 48.2082, lng: 16.3738 },
  { cityId: 'dublin', name: 'Dublin', country: 'IE', lat: 53.3498, lng: -6.2603 },
  { cityId: 'auckland', name: 'Auckland', country: 'NZ', lat: -36.8509, lng: 174.7645 },
  { cityId: 'nairobi', name: 'Nairobi', country: 'KE', lat: -1.2921, lng: 36.8219 },
];

const CITY_BY_ID = new Map(CITY_COORDINATES.map((city) => [city.cityId, city]));
const CITY_BY_NAME = new Map(
  CITY_COORDINATES.map((city) => [city.name.toLowerCase(), city])
);

export const COUNTRY_NAMES: Record<string, string> = {
  AR: 'Argentina',
  US: 'United States',
  BR: 'Brazil',
  MX: 'Mexico',
  ES: 'Spain',
  GB: 'United Kingdom',
  DE: 'Germany',
  FR: 'France',
  CL: 'Chile',
  CO: 'Colombia',
  JP: 'Japan',
  AU: 'Australia',
  AE: 'United Arab Emirates',
  SG: 'Singapore',
  HK: 'Hong Kong',
  IT: 'Italy',
  NL: 'Netherlands',
  CA: 'Canada',
  PE: 'Peru',
  IN: 'India',
  TH: 'Thailand',
  KR: 'South Korea',
  RU: 'Russia',
  EG: 'Egypt',
  NG: 'Nigeria',
  ZA: 'South Africa',
  CN: 'China',
  PT: 'Portugal',
  AT: 'Austria',
  IE: 'Ireland',
  NZ: 'New Zealand',
  KE: 'Kenya',
};

export function isValidCityId(cityId: string | null | undefined): boolean {
  return typeof cityId === 'string' && CITY_BY_ID.has(cityId);
}

export function getCityById(cityId: string): CityGeo | null {
  return CITY_BY_ID.get(cityId) ?? null;
}

export function getCityByName(name: string): CityGeo | null {
  return CITY_BY_NAME.get(name.trim().toLowerCase()) ?? null;
}

export function normalizeCityId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (CITY_BY_ID.has(trimmed)) return trimmed;
  return getCityByName(trimmed)?.cityId ?? null;
}

export function getCitiesByCountry(): Record<string, Array<{ id: string; name: string }>> {
  const grouped: Record<string, Array<{ id: string; name: string }>> = {};
  for (const city of CITY_COORDINATES) {
    if (!grouped[city.country]) grouped[city.country] = [];
    grouped[city.country].push({ id: city.cityId, name: city.name });
  }
  return grouped;
}

export function searchCities(query: string, limit = 8): CityGeo[] {
  const needle = query.trim().toLowerCase();
  if (needle.length < 1) return [];
  const matches: CityGeo[] = [];
  for (const city of CITY_COORDINATES) {
    if (city.name.toLowerCase().includes(needle) || city.cityId.includes(needle)) {
      matches.push(city);
      if (matches.length >= limit) break;
    }
  }
  return matches;
}

export const POPULAR_CITIES = [
  'buenos-aires',
  'new-york',
  'london',
  'tokyo',
  'sao-paulo',
  'mexico-city',
  'madrid',
  'paris',
  'berlin',
  'sydney',
]
  .map((id) => getCityById(id))
  .filter((city): city is CityGeo => city !== null);

/** Haversine distance between two points in km */
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Find the nearest city to a given lat/lng */
export function findNearestCity(
  lat: number,
  lng: number
): { cityId: string; cityName: string; country: string; distance: number } | null {
  let nearest: typeof CITY_COORDINATES[number] | null = null;
  let minDistance = Infinity;

  for (const city of CITY_COORDINATES) {
    const d = haversineDistance(lat, lng, city.lat, city.lng);
    if (d < minDistance) {
      minDistance = d;
      nearest = city;
    }
  }

  if (!nearest) return null;

  return {
    cityId: nearest.cityId,
    cityName: nearest.name,
    country: nearest.country,
    distance: minDistance,
  };
}

/** Get coordinates for a city by its ID */
export function getCityCoords(cityId: string): { lat: number; lng: number } | null {
  const city = CITY_BY_ID.get(cityId) ?? getCityByName(cityId);
  if (!city) return null;
  return { lat: city.lat, lng: city.lng };
}

/** Threshold in km to consider "same city" */
export const CITY_DISTANCE_THRESHOLD = 150;
