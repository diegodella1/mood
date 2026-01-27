import type { Reaction, WindowType } from '../constants';

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          timezone: string;
          country_code: string | null;
          city_id: string | null;
          gender: string | null;
          push_opt_in: boolean;
          streak_days: number;
          last_pulse_date: string | null;
          streak_shields: number;
          shields_last_granted: string | null;
          max_streak_ever: number;
          aura: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          timezone: string;
          country_code?: string | null;
          city_id?: string | null;
          gender?: string | null;
          push_opt_in?: boolean;
          streak_days?: number;
          last_pulse_date?: string | null;
          streak_shields?: number;
          shields_last_granted?: string | null;
          max_streak_ever?: number;
          aura?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          timezone?: string;
          country_code?: string | null;
          city_id?: string | null;
          gender?: string | null;
          push_opt_in?: boolean;
          streak_days?: number;
          last_pulse_date?: string | null;
          streak_shields?: number;
          shields_last_granted?: string | null;
          max_streak_ever?: number;
          aura?: string | null;
          updated_at?: string;
        };
      };
      pulse_windows: {
        Row: {
          id: string;
          date: string;
          window_type: WindowType;
          tz: string;
          starts_at_utc: string;
          ends_at_utc: string;
        };
        Insert: {
          id: string;
          date: string;
          window_type: WindowType;
          tz: string;
          starts_at_utc: string;
          ends_at_utc: string;
        };
        Update: {
          id?: string;
          date?: string;
          window_type?: WindowType;
          tz?: string;
          starts_at_utc?: string;
          ends_at_utc?: string;
        };
      };
      pulses: {
        Row: {
          id: string;
          user_id: string;
          window_id: string;
          mood: string;
          country_code: string | null;
          city_id: string | null;
          gender: string | null;
          reaction_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          window_id: string;
          mood: string;
          country_code?: string | null;
          city_id?: string | null;
          gender?: string | null;
          reaction_count?: number;
          created_at?: string;
        };
        Update: {
          mood?: string;
          reaction_count?: number;
        };
      };
      reactions: {
        Row: {
          id: string;
          pulse_id: string;
          from_user_id: string;
          emoji: Reaction;
          created_at: string;
        };
        Insert: {
          id?: string;
          pulse_id: string;
          from_user_id: string;
          emoji: Reaction;
          created_at?: string;
        };
        Update: {
          emoji?: Reaction;
        };
      };
      aggregates_global_window: {
        Row: {
          window_id: string;
          mood_counts: Record<string, number>;
          total_count: number;
          top_cities: Array<{ city_id: string; count: number }>;
          updated_at: string;
        };
        Insert: {
          window_id: string;
          mood_counts?: Record<string, number>;
          total_count?: number;
          top_cities?: Array<{ city_id: string; count: number }>;
          updated_at?: string;
        };
        Update: {
          mood_counts?: Record<string, number>;
          total_count?: number;
          top_cities?: Array<{ city_id: string; count: number }>;
          updated_at?: string;
        };
      };
      aggregates_country_window: {
        Row: {
          window_id: string;
          country_code: string;
          mood_counts: Record<string, number>;
          total_count: number;
          updated_at: string;
        };
        Insert: {
          window_id: string;
          country_code: string;
          mood_counts?: Record<string, number>;
          total_count?: number;
          updated_at?: string;
        };
        Update: {
          mood_counts?: Record<string, number>;
          total_count?: number;
          updated_at?: string;
        };
      };
      aggregates_city_window: {
        Row: {
          window_id: string;
          city_id: string;
          mood_counts: Record<string, number>;
          total_count: number;
          updated_at: string;
        };
        Insert: {
          window_id: string;
          city_id: string;
          mood_counts?: Record<string, number>;
          total_count?: number;
          updated_at?: string;
        };
        Update: {
          mood_counts?: Record<string, number>;
          total_count?: number;
          updated_at?: string;
        };
      };
      notification_templates: {
        Row: {
          id: string;
          type: string;
          title: string;
          body: string;
          cooldown_minutes: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          type: string;
          title: string;
          body: string;
          cooldown_minutes?: number;
          created_at?: string;
        };
        Update: {
          type?: string;
          title?: string;
          body?: string;
          cooldown_minutes?: number;
        };
      };
      notification_jobs: {
        Row: {
          id: string;
          template_id: string;
          audience_type: string;
          audience_payload: Record<string, unknown>;
          status: 'pending' | 'sent' | 'failed';
          dedupe_key: string | null;
          created_at: string;
          processed_at: string | null;
        };
        Insert: {
          id?: string;
          template_id: string;
          audience_type: string;
          audience_payload?: Record<string, unknown>;
          status?: 'pending' | 'sent' | 'failed';
          dedupe_key?: string | null;
          created_at?: string;
          processed_at?: string | null;
        };
        Update: {
          status?: 'pending' | 'sent' | 'failed';
          processed_at?: string | null;
        };
      };
      badges: {
        Row: {
          id: string;
          name: string;
          description: string;
          icon: string;
          condition: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description: string;
          icon: string;
          condition: Record<string, unknown>;
          created_at?: string;
        };
        Update: {
          name?: string;
          description?: string;
          icon?: string;
          condition?: Record<string, unknown>;
        };
      };
      user_badges: {
        Row: {
          user_id: string;
          badge_id: string;
          earned_at: string;
        };
        Insert: {
          user_id: string;
          badge_id: string;
          earned_at?: string;
        };
        Update: never;
      };
      events: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          start_at: string;
          end_at: string;
          banner_url: string | null;
          event_type: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          start_at: string;
          end_at: string;
          banner_url?: string | null;
          event_type?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          start_at?: string;
          end_at?: string;
          banner_url?: string | null;
          event_type?: string;
          status?: string;
        };
      };
      event_participations: {
        Row: {
          user_id: string;
          event_id: string;
          joined_at: string;
          completion_data: Record<string, unknown>;
        };
        Insert: {
          user_id: string;
          event_id: string;
          joined_at?: string;
          completion_data?: Record<string, unknown>;
        };
        Update: {
          completion_data?: Record<string, unknown>;
        };
      };
      notification_schedules: {
        Row: {
          id: string;
          template_id: string | null;
          title: string;
          body: string;
          scheduled_for: string;
          audience_type: string;
          audience_payload: Record<string, unknown>;
          status: 'pending' | 'sent' | 'cancelled' | 'failed';
          sent_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          template_id?: string | null;
          title: string;
          body: string;
          scheduled_for: string;
          audience_type?: string;
          audience_payload?: Record<string, unknown>;
          status?: 'pending' | 'sent' | 'cancelled' | 'failed';
          sent_at?: string | null;
          created_at?: string;
        };
        Update: {
          title?: string;
          body?: string;
          scheduled_for?: string;
          audience_type?: string;
          audience_payload?: Record<string, unknown>;
          status?: 'pending' | 'sent' | 'cancelled' | 'failed';
          sent_at?: string | null;
        };
      };
      alerts: {
        Row: {
          id: string;
          title: string;
          message: string;
          alert_type: string;
          severity: string;
          dismissible: boolean;
          active_from: string;
          active_until: string | null;
          target_audience: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          message: string;
          alert_type?: string;
          severity?: string;
          dismissible?: boolean;
          active_from?: string;
          active_until?: string | null;
          target_audience?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          message?: string;
          alert_type?: string;
          severity?: string;
          dismissible?: boolean;
          active_from?: string;
          active_until?: string | null;
          target_audience?: string;
        };
      };
      user_alerts: {
        Row: {
          user_id: string;
          alert_id: string;
          seen_at: string;
          dismissed_at: string | null;
        };
        Insert: {
          user_id: string;
          alert_id: string;
          seen_at?: string;
          dismissed_at?: string | null;
        };
        Update: {
          dismissed_at?: string | null;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          action: string;
          resource_type: string;
          resource_id: string | null;
          admin_id: string | null;
          changes: Record<string, unknown>;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          action: string;
          resource_type: string;
          resource_id?: string | null;
          admin_id?: string | null;
          changes?: Record<string, unknown>;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: never;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
