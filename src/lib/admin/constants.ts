// Admin Panel Constants

export const ADMIN_ROUTES = {
  dashboard: '/admin',
  config: '/admin/config',
  users: '/admin/users',
  events: '/admin/events',
  battles: '/admin/battles',
  notifications: '/admin/notifications',
  alerts: '/admin/alerts',
  login: '/admin/login',
} as const;

export const EVENT_TYPES = [
  { value: 'general', label: 'General' },
  { value: 'challenge', label: 'Challenge' },
  { value: 'special', label: 'Special Event' },
] as const;

export const EVENT_STATUSES = [
  { value: 'draft', label: 'Draft', color: 'bg-gray-500' },
  { value: 'active', label: 'Active', color: 'bg-green-500' },
  { value: 'completed', label: 'Completed', color: 'bg-blue-500' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-500' },
] as const;

export const ALERT_TYPES = [
  { value: 'info', label: 'Info', color: 'bg-blue-500', icon: 'ℹ️' },
  { value: 'warning', label: 'Warning', color: 'bg-yellow-500', icon: '⚠️' },
  { value: 'error', label: 'Error', color: 'bg-red-500', icon: '❌' },
  { value: 'success', label: 'Success', color: 'bg-green-500', icon: '✅' },
  { value: 'promo', label: 'Promotion', color: 'bg-purple-500', icon: '🎉' },
] as const;

export const ALERT_SEVERITIES = [
  { value: 'low', label: 'Low', color: 'text-gray-400' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-400' },
  { value: 'high', label: 'High', color: 'text-orange-400' },
  { value: 'critical', label: 'Critical', color: 'text-red-400' },
] as const;

export const AUDIENCE_TYPES = [
  { value: 'all', label: 'All Users' },
  { value: 'country', label: 'By Country' },
  { value: 'city', label: 'By City' },
  { value: 'users', label: 'Specific Users' },
] as const;

export const NOTIFICATION_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-500' },
  { value: 'sent', label: 'Sent', color: 'bg-green-500' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-gray-500' },
  { value: 'failed', label: 'Failed', color: 'bg-red-500' },
] as const;

export const ITEMS_PER_PAGE = 20;
export const MAX_ITEMS_PER_PAGE = 100; // Enforce max limit to prevent DoS

export const SIDEBAR_ITEMS = [
  { href: ADMIN_ROUTES.dashboard, label: 'Dashboard', icon: '📊' },
  { href: ADMIN_ROUTES.config, label: 'Config', icon: '⚙️' },
  { href: ADMIN_ROUTES.users, label: 'Users', icon: '👥' },
  { href: ADMIN_ROUTES.events, label: 'Events', icon: '📅' },
  { href: ADMIN_ROUTES.battles, label: 'Battles', icon: '⚔️' },
  { href: ADMIN_ROUTES.notifications, label: 'Notifications', icon: '🔔' },
  { href: ADMIN_ROUTES.alerts, label: 'Alerts', icon: '📢' },
] as const;
