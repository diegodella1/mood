// City coordinates for geolocation matching
// Format: [lat, lng] (note: PulseMap uses [lng, lat] but geo API returns [lat, lng])

interface CityGeo {
  cityId: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
}

const CITY_COORDINATES: CityGeo[] = [
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
];

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
  const city = CITY_COORDINATES.find((c) => c.cityId === cityId);
  if (!city) return null;
  return { lat: city.lat, lng: city.lng };
}

/** Threshold in km to consider "same city" */
export const CITY_DISTANCE_THRESHOLD = 150;
