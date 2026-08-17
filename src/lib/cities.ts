import {
  CITY_COORDINATES,
  COUNTRY_NAMES,
  POPULAR_CITIES,
  getCitiesByCountry,
  getCityById,
  getCityByName,
  isValidCityId,
  normalizeCityId,
  searchCities,
  type CityGeo,
} from '@/lib/cities-geo';

export const CITIES = CITY_COORDINATES.map((city) => city.name).sort();

export {
  CITY_COORDINATES,
  COUNTRY_NAMES,
  POPULAR_CITIES,
  getCitiesByCountry,
  getCityById,
  getCityByName,
  isValidCityId,
  normalizeCityId,
  searchCities,
};

export type { CityGeo };
