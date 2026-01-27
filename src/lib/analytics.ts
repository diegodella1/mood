// Simple analytics tracking for key events
// Can be extended with actual analytics service later

type EventName =
  | 'page_view'
  | 'mood_selected'
  | 'pulse_submitted'
  | 'reaction_sent'
  | 'push_opt_in'
  | 'push_opt_out'
  | 'pwa_installed';

interface EventProperties {
  mood?: string;
  window_type?: string;
  country_code?: string;
  city_id?: string;
  reaction?: string;
  [key: string]: unknown;
}

export function trackEvent(name: EventName, properties?: EventProperties): void {
  if (typeof window === 'undefined') return;

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Analytics] ${name}`, properties);
  }

  // Future: Send to analytics service
  // gtag('event', name, properties);
  // mixpanel.track(name, properties);
}

export function trackPageView(path: string): void {
  trackEvent('page_view', { path });
}

export function trackMoodSelected(mood: string): void {
  trackEvent('mood_selected', { mood });
}

export function trackPulseSubmitted(mood: string, windowType: string): void {
  trackEvent('pulse_submitted', { mood, window_type: windowType });
}

export function trackReactionSent(reaction: string): void {
  trackEvent('reaction_sent', { reaction });
}

export function trackPushOptIn(): void {
  trackEvent('push_opt_in');
}

export function trackPwaInstalled(): void {
  trackEvent('pwa_installed');
}
