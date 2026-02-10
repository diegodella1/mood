/**
 * Progressive Disclosure — unlock features based on account age.
 *
 * Day 0-2:  Core only (emoji, streak, post-pulse, history)
 * Day 3+:   Friend features (feed, search, invite)
 * Day 7+:   Leaderboard, aura progress, daily progress
 */

interface UserVisibility {
  showFriendFeatures: boolean;
  showLeaderboard: boolean;
  showAuraProgress: boolean;
  showDailyProgress: boolean;
}

export function getUserVisibility(createdAt: string | null): UserVisibility {
  if (!createdAt) {
    // If we don't know when user was created, show everything
    return {
      showFriendFeatures: true,
      showLeaderboard: true,
      showAuraProgress: true,
      showDailyProgress: true,
    };
  }

  const created = new Date(createdAt);
  const now = new Date();
  const daysSinceCreation = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));

  return {
    showFriendFeatures: daysSinceCreation >= 3,
    showLeaderboard: daysSinceCreation >= 7,
    showAuraProgress: daysSinceCreation >= 7,
    showDailyProgress: daysSinceCreation >= 7,
  };
}
