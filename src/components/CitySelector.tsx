'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Major cities by country (expandable)
const CITIES_BY_COUNTRY: Record<string, Array<{ id: string; name: string }>> = {
  AR: [
    { id: 'buenos-aires', name: 'Buenos Aires' },
    { id: 'cordoba', name: 'Córdoba' },
    { id: 'rosario', name: 'Rosario' },
    { id: 'mendoza', name: 'Mendoza' },
    { id: 'la-plata', name: 'La Plata' },
    { id: 'tucuman', name: 'Tucumán' },
    { id: 'mar-del-plata', name: 'Mar del Plata' },
  ],
  US: [
    { id: 'new-york', name: 'New York' },
    { id: 'los-angeles', name: 'Los Angeles' },
    { id: 'chicago', name: 'Chicago' },
    { id: 'houston', name: 'Houston' },
    { id: 'miami', name: 'Miami' },
    { id: 'san-francisco', name: 'San Francisco' },
    { id: 'seattle', name: 'Seattle' },
  ],
  BR: [
    { id: 'sao-paulo', name: 'São Paulo' },
    { id: 'rio-de-janeiro', name: 'Rio de Janeiro' },
    { id: 'brasilia', name: 'Brasília' },
    { id: 'salvador', name: 'Salvador' },
    { id: 'fortaleza', name: 'Fortaleza' },
  ],
  MX: [
    { id: 'mexico-city', name: 'Ciudad de México' },
    { id: 'guadalajara', name: 'Guadalajara' },
    { id: 'monterrey', name: 'Monterrey' },
    { id: 'cancun', name: 'Cancún' },
  ],
  ES: [
    { id: 'madrid', name: 'Madrid' },
    { id: 'barcelona', name: 'Barcelona' },
    { id: 'valencia', name: 'Valencia' },
    { id: 'sevilla', name: 'Sevilla' },
  ],
  GB: [
    { id: 'london', name: 'London' },
    { id: 'manchester', name: 'Manchester' },
    { id: 'birmingham', name: 'Birmingham' },
    { id: 'edinburgh', name: 'Edinburgh' },
  ],
  DE: [
    { id: 'berlin', name: 'Berlin' },
    { id: 'munich', name: 'Munich' },
    { id: 'hamburg', name: 'Hamburg' },
    { id: 'frankfurt', name: 'Frankfurt' },
  ],
  FR: [
    { id: 'paris', name: 'Paris' },
    { id: 'lyon', name: 'Lyon' },
    { id: 'marseille', name: 'Marseille' },
    { id: 'toulouse', name: 'Toulouse' },
  ],
  CL: [
    { id: 'santiago', name: 'Santiago' },
    { id: 'valparaiso', name: 'Valparaíso' },
    { id: 'concepcion', name: 'Concepción' },
  ],
  CO: [
    { id: 'bogota', name: 'Bogotá' },
    { id: 'medellin', name: 'Medellín' },
    { id: 'cali', name: 'Cali' },
    { id: 'barranquilla', name: 'Barranquilla' },
  ],
  // Add more countries as needed
};

// Country names for display
const COUNTRY_NAMES: Record<string, string> = {
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
};

interface CitySelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (cityId: string, cityName: string) => void;
  currentCityId?: string | null;
  countryCode?: string | null;
}

const springSmooth = { type: 'spring' as const, damping: 25, stiffness: 200 };

export function CitySelector({
  isOpen,
  onClose,
  onSelect,
  currentCityId,
  countryCode,
}: CitySelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Get cities for user's country first, then others
  const allCities = useMemo(() => {
    const result: Array<{ id: string; name: string; country: string; countryCode: string }> = [];

    // User's country first
    if (countryCode && CITIES_BY_COUNTRY[countryCode]) {
      CITIES_BY_COUNTRY[countryCode].forEach((city) => {
        result.push({
          ...city,
          country: COUNTRY_NAMES[countryCode] || countryCode,
          countryCode,
        });
      });
    }

    // Then other countries
    Object.entries(CITIES_BY_COUNTRY).forEach(([code, cities]) => {
      if (code !== countryCode) {
        cities.forEach((city) => {
          result.push({
            ...city,
            country: COUNTRY_NAMES[code] || code,
            countryCode: code,
          });
        });
      }
    });

    return result;
  }, [countryCode]);

  // Filter by search
  const filteredCities = useMemo(() => {
    if (!searchQuery.trim()) return allCities;

    const query = searchQuery.toLowerCase();
    return allCities.filter(
      (city) =>
        city.name.toLowerCase().includes(query) ||
        city.country.toLowerCase().includes(query)
    );
  }, [allCities, searchQuery]);

  // Group by country for display
  const groupedCities = useMemo(() => {
    const groups: Record<string, typeof filteredCities> = {};

    filteredCities.forEach((city) => {
      if (!groups[city.countryCode]) {
        groups[city.countryCode] = [];
      }
      groups[city.countryCode].push(city);
    });

    return groups;
  }, [filteredCities]);

  // Reset search when opening
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  const handleSelect = (cityId: string, cityName: string) => {
    onSelect(cityId, cityName);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[var(--color-void)]/80 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            transition={springSmooth}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md max-h-[80vh] glass-card-glow rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-5 border-b border-[var(--surface-border)]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl font-bold text-[var(--color-text-primary)]">
                  Select Your City
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Search cities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[var(--surface-glass)] border border-[var(--surface-border)] rounded-xl text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-aurora-cyan)]"
                />
              </div>
            </div>

            {/* City List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Option to clear city */}
              {currentCityId && (
                <button
                  onClick={() => handleSelect('', '')}
                  className="w-full p-3 text-left glass-card-subtle hover:bg-[var(--surface-glass)] transition-all rounded-xl text-[var(--color-text-muted)]"
                >
                  <span className="mr-2">🌍</span>
                  No specific city (global only)
                </button>
              )}

              {Object.entries(groupedCities).map(([code, cities]) => (
                <div key={code}>
                  <h3 className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-2 px-1">
                    {COUNTRY_NAMES[code] || code}
                    {code === countryCode && (
                      <span className="ml-2 text-[var(--color-aurora-cyan)]">Your country</span>
                    )}
                  </h3>
                  <div className="space-y-1">
                    {cities.map((city) => (
                      <button
                        key={city.id}
                        onClick={() => handleSelect(city.id, city.name)}
                        className={`w-full p-3 text-left transition-all rounded-xl flex items-center justify-between ${
                          currentCityId === city.id
                            ? 'glass-card-glow border-[var(--color-aurora-cyan)]'
                            : 'glass-card-subtle hover:bg-[var(--surface-glass)]'
                        }`}
                      >
                        <span className="text-[var(--color-text-primary)]">{city.name}</span>
                        {currentCityId === city.id && (
                          <span className="text-[var(--color-aurora-cyan)]">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {filteredCities.length === 0 && (
                <div className="text-center py-8 text-[var(--color-text-muted)]">
                  <p>No cities found</p>
                  <p className="text-sm mt-1">Try a different search</p>
                </div>
              )}
            </div>

            {/* Footer hint */}
            <div className="p-4 border-t border-[var(--surface-border)] text-center">
              <p className="text-xs text-[var(--color-text-muted)]">
                Your city helps you see local pulse results
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
