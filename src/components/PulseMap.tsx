'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Map, { Marker, Popup, NavigationControl } from 'react-map-gl';
import { normalizeToEmoji, getEmojiLabel } from '@/lib/constants';
import 'mapbox-gl/dist/mapbox-gl.css';

// Mapbox token from environment
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

interface CityPulse {
  cityId: string;
  totalCount: number;
  dominantMood: string;
  moodCounts: Record<string, number>;
  coordinates?: [number, number]; // [lng, lat]
}

interface PulseMapProps {
  windowId: string | null;
}

// Cache for geocoded cities
const geocodeCache: Record<string, [number, number]> = {};

// Popular cities with pre-defined coordinates (fallback)
const KNOWN_CITIES: Record<string, [number, number]> = {
  'New York': [-74.006, 40.7128],
  'Los Angeles': [-118.2437, 34.0522],
  'Chicago': [-87.6298, 41.8781],
  'London': [-0.1276, 51.5074],
  'Paris': [2.3522, 48.8566],
  'Tokyo': [139.6917, 35.6895],
  'Sydney': [151.2093, -33.8688],
  'Dubai': [55.2708, 25.2048],
  'Singapore': [103.8198, 1.3521],
  'Hong Kong': [114.1694, 22.3193],
  'Berlin': [13.405, 52.52],
  'Madrid': [-3.7038, 40.4168],
  'Rome': [12.4964, 41.9028],
  'Amsterdam': [4.9041, 52.3676],
  'Toronto': [-79.3832, 43.6532],
  'Vancouver': [-123.1207, 49.2827],
  'São Paulo': [-46.6333, -23.5505],
  'Buenos Aires': [-58.3816, -34.6037],
  'Mexico City': [-99.1332, 19.4326],
  'Mumbai': [72.8777, 19.076],
  'Delhi': [77.1025, 28.7041],
  'Bangkok': [100.5018, 13.7563],
  'Seoul': [126.978, 37.5665],
  'Moscow': [37.6173, 55.7558],
  'Cairo': [31.2357, 30.0444],
  'Lagos': [3.3792, 6.5244],
  'Johannesburg': [28.0473, -26.2041],
  'Melbourne': [144.9631, -37.8136],
  'Shanghai': [121.4737, 31.2304],
  'Beijing': [116.4074, 39.9042],
};

async function geocodeCity(cityId: string): Promise<[number, number] | null> {
  // Check cache first
  if (geocodeCache[cityId]) {
    return geocodeCache[cityId];
  }

  // Check known cities
  if (KNOWN_CITIES[cityId]) {
    geocodeCache[cityId] = KNOWN_CITIES[cityId];
    return KNOWN_CITIES[cityId];
  }

  // Try partial match for known cities
  for (const [knownCity, coords] of Object.entries(KNOWN_CITIES)) {
    if (cityId.toLowerCase().includes(knownCity.toLowerCase()) ||
        knownCity.toLowerCase().includes(cityId.toLowerCase())) {
      geocodeCache[cityId] = coords;
      return coords;
    }
  }

  // Use Mapbox Geocoding API
  if (!MAPBOX_TOKEN) return null;

  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(cityId)}.json?access_token=${MAPBOX_TOKEN}&types=place&limit=1`
    );
    const data = await response.json();

    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center;
      geocodeCache[cityId] = [lng, lat];
      return [lng, lat];
    }
  } catch (error) {
    console.error('Geocoding error for', cityId, error);
  }

  return null;
}

export function PulseMap({ windowId }: PulseMapProps) {
  const [cities, setCities] = useState<CityPulse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState<CityPulse | null>(null);
  const [viewState, setViewState] = useState({
    longitude: 0,
    latitude: 20,
    zoom: 1.5,
  });

  // Fetch cities data
  useEffect(() => {
    if (!windowId) return;

    async function fetchCities() {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/pulse/cities?windowId=${encodeURIComponent(windowId as string)}`);
        const data = await response.json();

        if (data.cities) {
          // Geocode all cities
          const citiesWithCoords = await Promise.all(
            data.cities.map(async (city: CityPulse) => {
              const coordinates = await geocodeCity(city.cityId);
              return { ...city, coordinates };
            })
          );

          // Filter out cities without coordinates
          setCities(citiesWithCoords.filter((c: CityPulse) => c.coordinates));
        }
      } catch (error) {
        console.error('Failed to fetch cities:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCities();
  }, [windowId]);

  const handleMarkerClick = useCallback((city: CityPulse) => {
    setSelectedCity(city);
    if (city.coordinates) {
      setViewState({
        longitude: city.coordinates[0],
        latitude: city.coordinates[1],
        zoom: 5,
      });
    }
  }, []);

  // Calculate marker size based on pulse count
  const getMarkerSize = useCallback((count: number) => {
    const minSize = 24;
    const maxSize = 60;
    const maxCount = Math.max(...cities.map(c => c.totalCount), 1);
    return minSize + ((count / maxCount) * (maxSize - minSize));
  }, [cities]);

  // Map style - dark cosmic theme
  const mapStyle = 'mapbox://styles/mapbox/dark-v11';

  if (!MAPBOX_TOKEN) {
    return (
      <div className="glass-card p-8 text-center">
        <p className="text-[var(--color-text-muted)]">
          Map not available. Please configure NEXT_PUBLIC_MAPBOX_TOKEN.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card-glow overflow-hidden relative"
      style={{ height: '400px' }}
    >
      {isLoading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-cosmic-dark)]">
          <div className="relative">
            <div className="w-12 h-12 border-3 border-[var(--color-aurora-cyan)] border-t-transparent rounded-full animate-spin" />
            <div className="absolute inset-0 aurora-gradient opacity-30 blur-xl rounded-full" />
          </div>
        </div>
      ) : null}

      <Map
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        mapStyle={mapStyle}
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
      >
        <NavigationControl position="top-right" showCompass={false} />

        {cities.map((city) => {
          if (!city.coordinates) return null;

          const emoji = normalizeToEmoji(city.dominantMood);
          const size = getMarkerSize(city.totalCount);

          return (
            <Marker
              key={city.cityId}
              longitude={city.coordinates[0]}
              latitude={city.coordinates[1]}
              anchor="center"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                handleMarkerClick(city);
              }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.2 }}
                className="cursor-pointer relative"
                style={{ fontSize: size }}
              >
                <span className="filter drop-shadow-lg">{emoji}</span>
                {city.totalCount > 5 ? (
                  <span className="absolute -bottom-1 -right-1 bg-[var(--color-aurora-cyan)] text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {city.totalCount}
                  </span>
                ) : null}
              </motion.div>
            </Marker>
          );
        })}

        <AnimatePresence>
          {selectedCity && selectedCity.coordinates ? (
            <Popup
              longitude={selectedCity.coordinates[0]}
              latitude={selectedCity.coordinates[1]}
              anchor="bottom"
              onClose={() => setSelectedCity(null)}
              closeButton={false}
              className="pulse-map-popup"
            >
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="p-3 min-w-[180px]"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">
                    {normalizeToEmoji(selectedCity.dominantMood)}
                  </span>
                  <div>
                    <h4 className="font-display font-semibold text-[var(--color-text-primary)]">
                      {selectedCity.cityId}
                    </h4>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {selectedCity.totalCount} pulses
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {Object.entries(selectedCity.moodCounts)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 3)
                    .map(([mood, count]) => {
                      const percentage = (count / selectedCity.totalCount) * 100;
                      return (
                        <div key={mood} className="flex items-center gap-2">
                          <span className="text-sm">{normalizeToEmoji(mood)}</span>
                          <div className="flex-1 h-1.5 bg-[var(--color-cosmic-dark)] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[var(--color-aurora-cyan)] rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-xs text-[var(--color-text-muted)] w-8 text-right">
                            {Math.round(percentage)}%
                          </span>
                        </div>
                      );
                    })}
                </div>
              </motion.div>
            </Popup>
          ) : null}
        </AnimatePresence>
      </Map>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 glass-card-subtle p-3">
        <p className="text-xs text-[var(--color-text-muted)] mb-1">
          {cities.length} cities
        </p>
        <p className="text-xs text-[var(--color-text-secondary)]">
          Tap a city to see details
        </p>
      </div>
    </motion.div>
  );
}
