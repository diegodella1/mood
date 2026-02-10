'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@/providers/UserProvider';
import { formatDistanceToNow } from '@/lib/utils';

interface FeedItem {
  userId: string;
  displayName: string;
  emoji: string | null;
  activityType: string;
  createdAt: string;
  metadata: Record<string, unknown>;
}

const springSmooth = { type: 'spring' as const, damping: 25, stiffness: 200 };

export function FriendsFeed() {
  const { user } = useUser();
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [friendsPulsedToday, setFriendsPulsedToday] = useState(0);

  useEffect(() => {
    if (!user?.id) return;

    const fetchFeed = async () => {
      try {
        const [feedRes, countRes] = await Promise.all([
          fetch(`/api/friends/feed?userId=${user.id}`),
          fetch(`/api/friends/pulsed-today?userId=${user.id}`),
        ]);
        if (feedRes.ok) {
          const data = await feedRes.json();
          setFeed(data.feed || []);
        }
        if (countRes.ok) {
          const data = await countRes.json();
          setFriendsPulsedToday(data.count || 0);
        }
      } catch (error) {
        console.error('Failed to fetch feed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeed();
    const interval = setInterval(fetchFeed, 30000);

    return () => clearInterval(interval);
  }, [user?.id]);

  if (isLoading) {
    return (
      <div className="glass-card-subtle p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--surface-glass)] animate-pulse" />
          <div className="flex-1">
            <div className="h-4 w-32 bg-[var(--surface-glass)] rounded animate-pulse mb-2" />
            <div className="h-3 w-20 bg-[var(--surface-glass)] rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (feed.length === 0) {
    return (
      <div className="glass-card-subtle p-6 text-center">
        <p className="text-2xl mb-2">👋</p>
        <p className="text-sm font-medium text-[var(--color-text-primary)] mb-1">
          No friends yet
        </p>
        <p className="text-xs text-[var(--color-text-muted)] mb-3">
          Add friends to see their vibes and compare moods
        </p>
        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: 'Join me on Global Pulse',
                text: 'Share how you feel and see how the world feels back!',
                url: window.location.origin,
              }).catch(() => {});
            }
          }}
          className="px-4 py-2 text-xs font-medium rounded-xl bg-[var(--color-aurora-cyan)]/20 text-[var(--color-aurora-cyan)] border border-[var(--color-aurora-cyan)]/30 hover:bg-[var(--color-aurora-cyan)]/30 transition-colors"
        >
          Invite Friends
        </button>
      </div>
    );
  }

  const displayFeed = isExpanded ? feed : feed.slice(0, 3);

  return (
    <div className="glass-card-subtle overflow-hidden">
      <div className="p-3 border-b border-[var(--surface-border)] flex items-center justify-between">
        <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
          Friends Activity
        </h3>
        {friendsPulsedToday > 0 && (
          <span className="text-xs text-[var(--color-aurora-cyan)] font-medium">
            {friendsPulsedToday} pulsed today
          </span>
        )}
      </div>

      <div className="divide-y divide-[var(--surface-border)]">
        <AnimatePresence mode="popLayout">
          {displayFeed.map((item, index) => (
            <motion.div
              key={`${item.userId}-${item.createdAt}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ ...springSmooth, delay: index * 0.05 }}
              className="p-3 flex items-center gap-3"
            >
              {/* Emoji or activity icon */}
              <div className="w-10 h-10 rounded-full glass-card flex items-center justify-center text-xl">
                {item.emoji || getActivityIcon(item.activityType)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--color-text-primary)] truncate">
                  <span className="font-medium">{item.displayName}</span>{' '}
                  <span className="text-[var(--color-text-secondary)]">
                    {getActivityText(item.activityType, item.metadata)}
                  </span>
                </p>
                {typeof item.metadata?.note === 'string' && item.metadata.note && (
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 line-clamp-2">
                    {item.metadata.note as string}
                  </p>
                )}
                <p className="text-xs text-[var(--color-text-muted)]">
                  {formatDistanceToNow(new Date(item.createdAt))}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {feed.length > 3 && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full p-2 text-xs text-[var(--color-aurora-cyan)] hover:bg-[var(--surface-glass-light)] transition-colors"
        >
          {isExpanded ? 'Show less' : `Show ${feed.length - 3} more`}
        </button>
      )}
    </div>
  );
}

function getActivityIcon(type: string): string {
  switch (type) {
    case 'pulse':
      return '💫';
    case 'badge':
      return '🏆';
    case 'streak_milestone':
      return '🔥';
    case 'joined':
      return '👋';
    case 'followed':
      return '➕';
    default:
      return '✨';
  }
}

function getActivityText(type: string, metadata: Record<string, unknown>): string {
  switch (type) {
    case 'pulse':
      return 'shared their vibe';
    case 'badge':
      return `unlocked ${metadata.badgeName || 'a badge'}`;
    case 'streak_milestone':
      return `reached ${metadata.days || ''} day streak`;
    case 'joined':
      return 'joined Global Pulse';
    case 'followed':
      return 'started following someone';
    default:
      return 'was active';
  }
}
