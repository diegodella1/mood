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
        setConfig({ ...defaultConfig, ...data.config });
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
        <h2 className="text-lg font-semibold text-white mb-4">Window Schedule</h2>
        <div className="grid grid-cols-3 gap-4">
          {['morning', 'afternoon', 'night'].map((window) => (
            <div key={window} className="space-y-2">
              <h3 className="text-zinc-400 capitalize">{window}</h3>
              <div className="flex gap-2">
                <div>
                  <label className="text-xs text-zinc-500">Start</label>
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={config.windows.schedule[window]?.start ?? 0}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        windows: {
                          ...prev.windows,
                          schedule: {
                            ...prev.windows.schedule,
                            [window]: { ...prev.windows.schedule[window], start: parseInt(e.target.value) },
                          },
                        },
                      }))
                    }
                    className="w-20 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500">End</label>
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={config.windows.schedule[window]?.end ?? 0}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        windows: {
                          ...prev.windows,
                          schedule: {
                            ...prev.windows.schedule,
                            [window]: { ...prev.windows.schedule[window], end: parseInt(e.target.value) },
                          },
                        },
                      }))
                    }
                    className="w-20 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white"
                  />
                </div>
              </div>
            </div>
          ))}
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
