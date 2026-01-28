'use client';

import { useEffect, useState } from 'react';

interface AppConfig {
  windows: {
    enabled: boolean;
    schedule: Record<string, { start: number; end: number }>;
    tolerance_minutes: number;
  };
  privacy: {
    min_city_pulses: number;
    min_segment_pulses: number;
  };
  push: {
    daily_cap_default: number;
    quiet_hours: { start: number; end: number };
  };
  flip: {
    enabled: boolean;
    min_city_pulses: number;
    min_delta_points: number;
  };
  shift: {
    enabled: boolean;
    min_global_pulses: number;
    min_delta_points: number;
    frequency: string;
  };
  battles: {
    enabled: boolean;
    scoring_mode: string;
  };
  a2hs: {
    enabled: boolean;
    cooldown_hours: number;
    trigger_after_pulses: number;
  };
  nudges: {
    enabled: boolean;
    dedupe_window_minutes: number;
  };
}

const defaultConfig: AppConfig = {
  windows: { enabled: true, schedule: { morning: { start: 8, end: 11 }, afternoon: { start: 13, end: 16 }, night: { start: 20, end: 23 } }, tolerance_minutes: 5 },
  privacy: { min_city_pulses: 10, min_segment_pulses: 5 },
  push: { daily_cap_default: 5, quiet_hours: { start: 22, end: 8 } },
  flip: { enabled: true, min_city_pulses: 20, min_delta_points: 5 },
  shift: { enabled: true, min_global_pulses: 100, min_delta_points: 10, frequency: 'per_window' },
  battles: { enabled: false, scoring_mode: 'per_capita_bucket' },
  a2hs: { enabled: true, cooldown_hours: 72, trigger_after_pulses: 1 },
  nudges: { enabled: true, dedupe_window_minutes: 180 },
};

export default function ConfigPage() {
  const [config, setConfig] = useState<AppConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/admin/config', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        // Deep merge to ensure all nested objects exist
        const merged = {
          ...defaultConfig,
          ...data.config,
          windows: {
            ...defaultConfig.windows,
            ...(data.config?.windows || {}),
            schedule: data.config?.windows?.schedule || defaultConfig.windows.schedule,
          },
          privacy: { ...defaultConfig.privacy, ...(data.config?.privacy || {}) },
          push: {
            ...defaultConfig.push,
            ...(data.config?.push || {}),
            quiet_hours: data.config?.push?.quiet_hours || defaultConfig.push.quiet_hours,
          },
          flip: { ...defaultConfig.flip, ...(data.config?.flip || {}) },
          shift: { ...defaultConfig.shift, ...(data.config?.shift || {}) },
          battles: { ...defaultConfig.battles, ...(data.config?.battles || {}) },
          a2hs: { ...defaultConfig.a2hs, ...(data.config?.a2hs || {}) },
          nudges: { ...defaultConfig.nudges, ...(data.config?.nudges || {}) },
        };
        setConfig(merged);
      }
    } catch (error) {
      console.error('Error fetching config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/admin/config', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });
      if (response.ok) {
        setMessage('Configuration saved successfully!');
      } else {
        setMessage('Failed to save configuration');
      }
    } catch (error) {
      setMessage('Error saving configuration');
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (section: keyof AppConfig, key: string, value: unknown) => {
    setConfig((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
  };

  if (loading) {
    return <div className="text-zinc-400">Loading configuration...</div>;
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">App Configuration</h1>
          <p className="text-zinc-500">Manage global app settings without redeploy</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${message.includes('success') ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
          {message}
        </div>
      )}

      {/* Feature Toggles */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Feature Toggles</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { key: 'windows', label: 'Live Windows' },
            { key: 'flip', label: 'City Flips' },
            { key: 'shift', label: 'Global Shifts' },
            { key: 'battles', label: 'City Battles' },
            { key: 'a2hs', label: 'A2HS Prompt' },
            { key: 'nudges', label: 'Nudges' },
          ].map((feature) => {
            const section = config[feature.key as 'windows' | 'flip' | 'shift' | 'battles' | 'a2hs' | 'nudges'];
            return (
              <label key={feature.key} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={section?.enabled ?? false}
                  onChange={(e) => updateConfig(feature.key as keyof AppConfig, 'enabled', e.target.checked)}
                  className="w-5 h-5 rounded bg-zinc-800 border-zinc-700"
                />
                <span className="text-zinc-300">{feature.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Window Schedule */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Window Schedule</h2>
            <p className="text-sm text-zinc-500">Configure when users can pulse. Hours are in 24h format (0-23).</p>
          </div>
          <button
            onClick={() => {
              const windowName = prompt('Enter window name (e.g., "early_morning", "lunch"):');
              if (windowName && windowName.trim()) {
                const name = windowName.trim().toLowerCase().replace(/\s+/g, '_');
                if (config.windows.schedule[name]) {
                  alert('A window with this name already exists!');
                  return;
                }
                setConfig((prev) => ({
                  ...prev,
                  windows: {
                    ...prev.windows,
                    schedule: {
                      ...prev.windows.schedule,
                      [name]: { start: 12, end: 14 },
                    },
                  },
                }));
              }
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
          >
            + Add Window
          </button>
        </div>

        <div className="space-y-3">
          {Object.entries(config.windows?.schedule || {})
            .sort(([, a], [, b]) => a.start - b.start)
            .map(([windowName, windowConfig]) => (
            <div key={windowName} className="flex items-center gap-4 p-4 bg-zinc-800/50 rounded-lg">
              <div className="flex-1">
                <input
                  type="text"
                  value={windowName}
                  onChange={(e) => {
                    const newName = e.target.value.toLowerCase().replace(/\s+/g, '_');
                    if (newName === windowName) return;
                    if (config.windows.schedule[newName]) return;

                    const newSchedule = { ...config.windows.schedule };
                    newSchedule[newName] = newSchedule[windowName];
                    delete newSchedule[windowName];

                    setConfig((prev) => ({
                      ...prev,
                      windows: { ...prev.windows, schedule: newSchedule },
                    }));
                  }}
                  className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded text-white font-medium"
                  placeholder="Window name"
                />
              </div>

              <div className="flex items-center gap-2">
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Start Hour</label>
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={windowConfig.start}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        windows: {
                          ...prev.windows,
                          schedule: {
                            ...prev.windows.schedule,
                            [windowName]: { ...prev.windows.schedule[windowName], start: parseInt(e.target.value) || 0 },
                          },
                        },
                      }))
                    }
                    className="w-20 px-3 py-2 bg-zinc-700 border border-zinc-600 rounded text-white text-center"
                  />
                </div>

                <span className="text-zinc-500 mt-5">→</span>

                <div>
                  <label className="text-xs text-zinc-500 block mb-1">End Hour</label>
                  <input
                    type="number"
                    min={0}
                    max={24}
                    value={windowConfig.end}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        windows: {
                          ...prev.windows,
                          schedule: {
                            ...prev.windows.schedule,
                            [windowName]: { ...prev.windows.schedule[windowName], end: parseInt(e.target.value) || 0 },
                          },
                        },
                      }))
                    }
                    className="w-20 px-3 py-2 bg-zinc-700 border border-zinc-600 rounded text-white text-center"
                  />
                </div>
              </div>

              <div className="text-sm text-zinc-400 w-24 text-center">
                {windowConfig.start}:00 - {windowConfig.end}:00
              </div>

              <button
                onClick={() => {
                  if (Object.keys(config.windows.schedule).length <= 1) {
                    alert('You must have at least one window!');
                    return;
                  }
                  if (!confirm(`Delete window "${windowName}"?`)) return;

                  const newSchedule = { ...config.windows.schedule };
                  delete newSchedule[windowName];

                  setConfig((prev) => ({
                    ...prev,
                    windows: { ...prev.windows, schedule: newSchedule },
                  }));
                }}
                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition-colors"
                title="Delete window"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {Object.keys(config.windows?.schedule || {}).length === 0 && (
          <div className="text-center py-8 text-zinc-500">
            No windows configured. Click "Add Window" to create one.
          </div>
        )}

        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-sm text-blue-400">
            <strong>Tips:</strong> Windows are sorted by start time. Users can only pulse during active windows.
            Changes take effect immediately after saving (cached for 60 seconds).
          </p>
        </div>
      </div>

      {/* Flip Settings */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">City Flip Settings</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Min City Pulses</label>
            <input
              type="number"
              value={config.flip.min_city_pulses}
              onChange={(e) => updateConfig('flip', 'min_city_pulses', parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Min Delta Points</label>
            <input
              type="number"
              value={config.flip.min_delta_points}
              onChange={(e) => updateConfig('flip', 'min_delta_points', parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white"
            />
          </div>
        </div>
      </div>

      {/* Shift Settings */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Global Shift Settings</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Min Global Pulses</label>
            <input
              type="number"
              value={config.shift.min_global_pulses}
              onChange={(e) => updateConfig('shift', 'min_global_pulses', parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Min Delta Points</label>
            <input
              type="number"
              value={config.shift.min_delta_points}
              onChange={(e) => updateConfig('shift', 'min_delta_points', parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Frequency</label>
            <select
              value={config.shift.frequency}
              onChange={(e) => updateConfig('shift', 'frequency', e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white"
            >
              <option value="per_window">Per Window</option>
              <option value="per_day">Per Day</option>
            </select>
          </div>
        </div>
      </div>

      {/* Push Settings */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Push Notification Settings</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Daily Cap</label>
            <input
              type="number"
              value={config.push.daily_cap_default}
              onChange={(e) => updateConfig('push', 'daily_cap_default', parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Quiet Hours Start</label>
            <input
              type="number"
              min={0}
              max={23}
              value={config.push.quiet_hours?.start ?? 22}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  push: { ...prev.push, quiet_hours: { ...prev.push.quiet_hours, start: parseInt(e.target.value) } },
                }))
              }
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Quiet Hours End</label>
            <input
              type="number"
              min={0}
              max={23}
              value={config.push.quiet_hours?.end ?? 8}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  push: { ...prev.push, quiet_hours: { ...prev.push.quiet_hours, end: parseInt(e.target.value) } },
                }))
              }
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white"
            />
          </div>
        </div>
      </div>

      {/* A2HS Settings */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Add to Home Screen Settings</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Cooldown Hours</label>
            <input
              type="number"
              value={config.a2hs.cooldown_hours}
              onChange={(e) => updateConfig('a2hs', 'cooldown_hours', parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Trigger After Pulses</label>
            <input
              type="number"
              value={config.a2hs.trigger_after_pulses}
              onChange={(e) => updateConfig('a2hs', 'trigger_after_pulses', parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white"
            />
          </div>
        </div>
      </div>

      {/* Nudge Settings */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Nudge Settings</h2>
        <div>
          <label className="block text-sm text-zinc-400 mb-1">Dedupe Window (minutes)</label>
          <input
            type="number"
            value={config.nudges.dedupe_window_minutes}
            onChange={(e) => updateConfig('nudges', 'dedupe_window_minutes', parseInt(e.target.value))}
            className="w-40 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white"
          />
        </div>
      </div>
    </div>
  );
}
