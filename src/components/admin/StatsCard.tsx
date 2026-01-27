'use client';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: string;
  color?: 'blue' | 'green' | 'yellow' | 'purple' | 'red';
  loading?: boolean;
}

const colorClasses = {
  blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
  green: 'from-green-500/20 to-green-600/10 border-green-500/30',
  yellow: 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30',
  purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
  red: 'from-red-500/20 to-red-600/10 border-red-500/30',
};

export function StatsCard({
  title,
  value,
  change,
  changeLabel = 'vs last week',
  icon,
  color = 'blue',
  loading = false,
}: StatsCardProps) {
  const isPositive = change !== undefined && change >= 0;

  if (loading) {
    return (
      <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-xl p-6 border animate-pulse`}>
        <div className="h-4 bg-zinc-700 rounded w-24 mb-4"></div>
        <div className="h-8 bg-zinc-700 rounded w-16"></div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-xl p-6 border`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-zinc-400 text-sm font-medium">{title}</h3>
        {icon && <span className="text-2xl">{icon}</span>}
      </div>

      <div className="flex items-end justify-between">
        <p className="text-3xl font-bold text-white">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>

        {change !== undefined && (
          <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            <span>{isPositive ? '↑' : '↓'}</span>
            <span>{Math.abs(change)}%</span>
            <span className="text-zinc-500 text-xs ml-1">{changeLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
}
