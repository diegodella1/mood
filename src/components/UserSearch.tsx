'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@/providers/UserProvider';
import { debounce } from '@/lib/utils';
import { AURA_DEFINITIONS, AuraType } from '@/lib/auras';

interface SearchResult {
  id: string;
  displayName: string;
  aura: AuraType | null;
  streakDays: number;
  isFollowing: boolean;
}

interface UserSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

const springSmooth = { type: 'spring' as const, damping: 25, stiffness: 200 };

export function UserSearch({ isOpen, onClose }: UserSearchProps) {
  const { user } = useUser();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [suggested, setSuggested] = useState<SearchResult[]>([]);
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());

  // Fetch who user is following
  useEffect(() => {
    if (!user?.id || !isOpen) return;

    const fetchFollowing = async () => {
      try {
        const res = await fetch(`/api/friends?userId=${user.id}&type=following`);
        if (res.ok) {
          const data = await res.json();
          const ids = new Set<string>(data.following?.map((f: { id: string }) => f.id) || []);
          setFollowingSet(ids);
        }
      } catch (error) {
        console.error('Failed to fetch following:', error);
      }
    };

    fetchFollowing();
  }, [user?.id, isOpen]);

  // Fetch suggested users (top streaks in user's city)
  useEffect(() => {
    if (!user?.id || !isOpen) return;

    const fetchSuggested = async () => {
      try {
        const res = await fetch(`/api/leaderboard?type=streaks`);
        if (res.ok) {
          const data = await res.json();
          const suggestions = (data.streaks || [])
            .slice(0, 10)
            .filter((s: { displayName: string }) => s.displayName !== 'Anonymous')
            .map((s: { displayName: string; aura: AuraType | null; streakDays: number; rank: number }) => ({
              id: `suggested-${s.rank}`, // We don't have real IDs from leaderboard
              displayName: s.displayName,
              aura: s.aura,
              streakDays: s.streakDays,
              isFollowing: false,
            }));
          setSuggested(suggestions);
        }
      } catch (error) {
        console.error('Failed to fetch suggested:', error);
      }
    };

    fetchSuggested();
  }, [user?.id, isOpen]);

  // Search users
  const searchUsers = useCallback(
    debounce(async (searchQuery: string) => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);

      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}&userId=${user?.id}`);
        if (res.ok) {
          const data = await res.json();
          setResults(
            (data.users || []).map((u: { id: string; display_name: string; aura: AuraType | null; streak_days: number }) => ({
              id: u.id,
              displayName: u.display_name || 'Anonymous',
              aura: u.aura,
              streakDays: u.streak_days || 0,
              isFollowing: followingSet.has(u.id),
            }))
          );
        }
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300),
    [user?.id, followingSet]
  );

  useEffect(() => {
    searchUsers(query);
  }, [query, searchUsers]);

  const handleFollow = async (userId: string) => {
    if (!user?.id) return;

    const isCurrentlyFollowing = followingSet.has(userId);

    try {
      if (isCurrentlyFollowing) {
        await fetch('/api/friends', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ followerId: user.id, followingId: userId }),
        });
        setFollowingSet((prev) => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      } else {
        await fetch('/api/friends', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ followerId: user.id, followingId: userId }),
        });
        setFollowingSet((prev) => new Set(prev).add(userId));
      }

      // Update results
      setResults((prev) =>
        prev.map((r) =>
          r.id === userId ? { ...r, isFollowing: !isCurrentlyFollowing } : r
        )
      );
    } catch (error) {
      console.error('Follow/unfollow failed:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={springSmooth}
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-x-4 top-20 bottom-20 max-w-lg mx-auto glass-card flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 border-b border-[var(--surface-border)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold text-[var(--color-text-primary)]">
                Find Friends
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

            {/* Search input */}
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name..."
                className="w-full px-4 py-3 pl-10 bg-[var(--surface-glass)] border border-[var(--surface-border)] rounded-xl text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-aurora-cyan)]"
              />
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
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto p-4">
            {isSearching && (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-2 border-[var(--color-aurora-cyan)] border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!isSearching && query.length >= 2 && results.length === 0 && (
              <div className="text-center py-8 text-[var(--color-text-muted)]">
                No users found
              </div>
            )}

            {!isSearching && query.length >= 2 && results.length > 0 && (
              <div className="space-y-2">
                {results.map((result) => (
                  <UserCard
                    key={result.id}
                    user={result}
                    isFollowing={followingSet.has(result.id)}
                    onFollow={() => handleFollow(result.id)}
                  />
                ))}
              </div>
            )}

            {!isSearching && query.length < 2 && suggested.length > 0 && (
              <>
                <h3 className="text-sm font-medium text-[var(--color-text-muted)] mb-3">
                  Top Streakers
                </h3>
                <div className="space-y-2">
                  {suggested.map((s, index) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between p-3 glass-card-subtle rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-[var(--color-aurora-amber)]">
                          #{index + 1}
                        </span>
                        <div>
                          <p className="font-medium text-[var(--color-text-primary)]">
                            {s.displayName}
                          </p>
                          <p className="text-xs text-[var(--color-text-muted)]">
                            {s.streakDays}d streak
                            {s.aura && AURA_DEFINITIONS[s.aura] && ` ${AURA_DEFINITIONS[s.aura].icon}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-center text-[var(--color-text-muted)] mt-4">
                  Set a display name in your profile to appear here
                </p>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function UserCard({
  user,
  isFollowing,
  onFollow,
}: {
  user: SearchResult;
  isFollowing: boolean;
  onFollow: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between p-3 glass-card-subtle rounded-xl"
    >
      <div className="flex items-center gap-3">
        {user.aura && AURA_DEFINITIONS[user.aura] && (
          <span className="text-xl">{AURA_DEFINITIONS[user.aura].icon}</span>
        )}
        <div>
          <p className="font-medium text-[var(--color-text-primary)]">{user.displayName}</p>
          <p className="text-xs text-[var(--color-text-muted)]">{user.streakDays}d streak</p>
        </div>
      </div>

      <motion.button
        onClick={onFollow}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
          isFollowing
            ? 'bg-[var(--surface-glass)] text-[var(--color-text-secondary)] hover:bg-red-500/20 hover:text-red-400'
            : 'aurora-gradient text-white'
        }`}
      >
        {isFollowing ? 'Following' : 'Follow'}
      </motion.button>
    </motion.div>
  );
}
