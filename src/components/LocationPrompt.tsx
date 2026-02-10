'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { findNearestCity, getCityCoords, haversineDistance, CITY_DISTANCE_THRESHOLD } from '@/lib/cities-geo';
import { CitySelector } from '@/components/CitySelector';
import { useUser } from '@/providers/UserProvider';

const SESSION_KEY = 'gp_location_checked';

type PromptState =
  | 'idle'
  | 'banner'
  | 'requesting_geo'
  | 'suggesting'
  | 'city_moved'
  | 'manual_select';

const springSmooth = { type: 'spring' as const, damping: 25, stiffness: 200 };

export function LocationPrompt() {
  const { user, updateUser } = useUser();
  const [state, setState] = useState<PromptState>('idle');
  const [suggestedCity, setSuggestedCity] = useState<{
    cityId: string;
    cityName: string;
    distance: number;
  } | null>(null);
  const [showCitySelector, setShowCitySelector] = useState(false);

  const alreadyChecked = typeof window !== 'undefined' && sessionStorage.getItem(SESSION_KEY) === 'true';

  // Determine initial state
  useEffect(() => {
    if (!user || alreadyChecked) return;

    if (!user.cityId) {
      // No city set -> show banner
      setState('banner');
    } else {
      // Has city -> validate silently (only if geo permission already granted)
      navigator.permissions?.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'granted') {
          validateCurrentCity();
        } else {
          sessionStorage.setItem(SESSION_KEY, 'true');
        }
      }).catch(() => {
        sessionStorage.setItem(SESSION_KEY, 'true');
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.cityId]);

  const validateCurrentCity = useCallback(() => {
    if (!user?.cityId) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        sessionStorage.setItem(SESSION_KEY, 'true');
        const coords = getCityCoords(user.cityId!);
        if (!coords) return;

        const distance = haversineDistance(
          pos.coords.latitude, pos.coords.longitude,
          coords.lat, coords.lng
        );

        if (distance > CITY_DISTANCE_THRESHOLD) {
          const nearest = findNearestCity(pos.coords.latitude, pos.coords.longitude);
          if (nearest && nearest.cityId !== user.cityId) {
            setSuggestedCity(nearest);
            setState('city_moved');
          }
        }
      },
      () => {
        sessionStorage.setItem(SESSION_KEY, 'true');
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }, [user?.cityId]);

  const requestGeolocation = () => {
    setState('requesting_geo');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nearest = findNearestCity(pos.coords.latitude, pos.coords.longitude);
        if (nearest && nearest.distance < CITY_DISTANCE_THRESHOLD * 3) {
          // Reasonable match found
          setSuggestedCity(nearest);
          setState('suggesting');
        } else {
          // Too far from any known city, let them pick manually
          setState('manual_select');
          setShowCitySelector(true);
        }
      },
      () => {
        // Geo denied or failed -> manual select
        setState('manual_select');
        setShowCitySelector(true);
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  };

  const confirmCity = async (cityId: string) => {
    await updateUser({ cityId });
    sessionStorage.setItem(SESSION_KEY, 'true');
    setState('idle');
  };

  const dismiss = () => {
    sessionStorage.setItem(SESSION_KEY, 'true');
    setState('idle');
  };

  const handleCitySelectorSelect = async (cityId: string) => {
    if (cityId) {
      await confirmCity(cityId);
    }
    setShowCitySelector(false);
  };

  if (state === 'idle') return null;

  return (
    <>
      <AnimatePresence>
        {/* Banner: no city set */}
        {state === 'banner' && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            transition={springSmooth}
            className="px-4 pb-3"
          >
            <div className="max-w-lg mx-auto">
              <button
                onClick={requestGeolocation}
                className="w-full glass-card-subtle p-4 flex items-center gap-3 hover:bg-[var(--surface-glass)] transition-all rounded-xl text-left"
              >
                <span className="text-2xl" role="img" aria-label="pin">
                  📍
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">
                    Set your city to see local results
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Tap to detect automatically
                  </p>
                </div>
                <svg
                  className="w-5 h-5 text-[var(--color-text-muted)] shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </motion.div>
        )}

        {/* Requesting geolocation */}
        {state === 'requesting_geo' && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            transition={springSmooth}
            className="px-4 pb-3"
          >
            <div className="max-w-lg mx-auto">
              <div className="glass-card-subtle p-4 flex items-center gap-3 rounded-xl">
                <div className="w-5 h-5 border-2 border-[var(--color-aurora-cyan)] border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Detecting your location...
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Suggestion: found a nearby city */}
        {state === 'suggesting' && suggestedCity && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            transition={springSmooth}
            className="px-4 pb-3"
          >
            <div className="max-w-lg mx-auto">
              <div className="glass-card-glow p-4 rounded-xl">
                <p className="text-sm text-[var(--color-text-primary)] mb-3">
                  <span className="mr-1">📍</span>
                  Looks like you&apos;re in <strong>{suggestedCity.cityName}</strong>
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => confirmCity(suggestedCity.cityId)}
                    className="flex-1 py-2 px-4 rounded-xl text-sm font-medium aurora-gradient text-white"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => {
                      setState('manual_select');
                      setShowCitySelector(true);
                    }}
                    className="flex-1 py-2 px-4 rounded-xl text-sm font-medium glass-card-subtle text-[var(--color-text-secondary)] hover:bg-[var(--surface-glass)]"
                  >
                    Choose another
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* City moved: user has a city but geo says they're elsewhere */}
        {state === 'city_moved' && suggestedCity && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            transition={springSmooth}
            className="px-4 pb-3"
          >
            <div className="max-w-lg mx-auto">
              <div className="glass-card-subtle p-4 rounded-xl">
                <p className="text-sm text-[var(--color-text-primary)] mb-3">
                  <span className="mr-1">📍</span>
                  Looks like you moved to <strong>{suggestedCity.cityName}</strong>. Update your city?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => confirmCity(suggestedCity.cityId)}
                    className="flex-1 py-2 px-4 rounded-xl text-sm font-medium aurora-gradient text-white"
                  >
                    Yes, update
                  </button>
                  <button
                    onClick={dismiss}
                    className="flex-1 py-2 px-4 rounded-xl text-sm font-medium glass-card-subtle text-[var(--color-text-secondary)] hover:bg-[var(--surface-glass)]"
                  >
                    Keep current
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* City Selector Modal (fallback) */}
      <CitySelector
        isOpen={showCitySelector}
        onClose={() => {
          setShowCitySelector(false);
          if (!user?.cityId) setState('banner');
          else dismiss();
        }}
        onSelect={handleCitySelectorSelect}
        currentCityId={user?.cityId}
        countryCode={user?.countryCode}
      />
    </>
  );
}
