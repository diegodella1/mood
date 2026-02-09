// Push Notification Psychology Engine
// Duolingo-style escalation + behavioral science for notification copy
// Used by cron jobs to generate contextual, non-repetitive push notifications

import type { AuraType } from './auras';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Pick a random element from an array */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Get the aura tier label for a streak count */
function streakTier(days: number): 'none' | 'low' | 'fire' | 'lightning' | 'diamond' {
  if (days >= 100) return 'diamond';
  if (days >= 30) return 'lightning';
  if (days >= 7) return 'fire';
  if (days >= 1) return 'low';
  return 'none';
}

// ---------------------------------------------------------------------------
// 1. Escalation Copy (re-engagement based on days inactive)
// ---------------------------------------------------------------------------

/**
 * Returns escalation notification copy based on inactivity level.
 *
 * Levels:
 *   0 — active (no escalation needed)
 *   1 — 1 day missed  (friendly)
 *   2 — 2 days missed  (social proof)
 *   3 — 3 days missed  (loss aversion)
 *   4 — 5 days missed  (breakup / reverse psychology)
 *   5 — 14+ days missed (win-back)
 *
 * Returns `null` when no notification should be sent (e.g. after breakup
 * message at level 4, levels 6-13 are silent).
 */
export function getEscalationCopy(
  level: number,
  userData: {
    streakDays: number;
    displayName?: string;
    cityName?: string;
    friendCount?: number;
  },
): { title: string; message: string } | null {
  const name = userData.displayName ?? 'friend';
  const city = userData.cityName ?? 'your city';
  const friends = userData.friendCount ?? 0;

  switch (level) {
    // Level 0 — active users don't get escalation
    case 0:
      return null;

    // Level 1 — friendly nudge
    case 1:
      return pick([
        {
          title: 'Quick check-in?',
          message: `Hey! Your crew missed you today 💛`,
        },
        {
          title: `We missed you, ${name}`,
          message: 'One tap — how are you feeling right now?',
        },
        {
          title: "How's your day going?",
          message: 'Your friends are waiting to see your pulse',
        },
        {
          title: "You didn't pulse today",
          message: 'It only takes 5 seconds. We believe in you 💛',
        },
      ]);

    // Level 2 — social proof
    case 2:
      return pick([
        {
          title: 'Your friends pulsed',
          message: `${Math.max(friends, 3)} of your friends pulsed today. Join them?`,
        },
        {
          title: "Don't be left out",
          message: `${city} is active right now — pulse with them`,
        },
        {
          title: 'Everyone checked in',
          message: "You're the only one who hasn't pulsed today",
        },
        {
          title: 'The crew is waiting',
          message: `Your group is ${friends > 0 ? friends : 4}/${friends > 0 ? friends + 1 : 5} — you're the missing one`,
        },
      ]);

    // Level 3 — loss aversion
    case 3: {
      if (userData.streakDays > 0) {
        return pick([
          {
            title: 'Streak in danger!',
            message: `Your ${userData.streakDays}-day streak expires tonight. Tap to save it 🔥`,
          },
          {
            title: "Don't lose your streak",
            message: `${userData.streakDays} days of progress — gone if you don't pulse today`,
          },
          {
            title: 'Last chance today',
            message: `Save your ${userData.streakDays}-day streak before midnight 🔥`,
          },
        ]);
      }
      // No streak to lose — use social proof variant
      return pick([
        {
          title: 'Come back today',
          message: `${city} needs your pulse — don't let them down`,
        },
        {
          title: 'Missing 3 days',
          message: "Start a new streak today — future you will thank you",
        },
      ]);
    }

    // Level 4 — breakup / reverse psychology
    case 4:
      return pick([
        {
          title: 'We get it',
          message: "Life happens. We'll stop bugging you. Come back when you're ready 💙",
        },
        {
          title: 'No pressure',
          message: "We'll be here whenever you want to check in again 💙",
        },
        {
          title: 'Taking a break?',
          message: "Totally okay. We'll keep your spot warm 💙",
        },
      ]);

    // Level 5 — win-back (14+ days)
    case 5:
      return pick([
        {
          title: `${city} needs you`,
          message: `Your city dropped in the rankings. They need you back`,
        },
        {
          title: 'A lot has changed',
          message: `${city} has been pulsing without you — come see what you missed`,
        },
        {
          title: 'We saved your spot',
          message: `${name}, your friends are still here. One pulse to reconnect`,
        },
        {
          title: 'Come back anytime',
          message: `Your crew in ${city} is still going strong. Join them?`,
        },
      ]);

    // Levels 6+ (between breakup and win-back) — silence
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// 2. Social Proof Notifications
// ---------------------------------------------------------------------------

export function getSocialProofCopy(data: {
  cityName?: string;
  activeFriends?: number;
  cityPulseCount?: number;
  cityRank?: number;
}): { title: string; message: string } {
  const city = data.cityName ?? 'Your city';
  const friends = data.activeFriends ?? 0;
  const pulses = data.cityPulseCount ?? 0;
  const rank = data.cityRank;

  type CopyOption = { title: string; message: string };
  const options: CopyOption[] = [];

  // Friend-count variants
  if (friends > 0) {
    options.push({
      title: 'Your crew is active',
      message: `${friends} of your friends already pulsed today`,
    });
    options.push({
      title: "Don't miss out",
      message: `Your crew is ${friends}/${friends + 1} — you're the missing one`,
    });
  }

  // City pulse count variants
  if (pulses > 0) {
    options.push({
      title: `${city} is buzzing`,
      message: `${pulses.toLocaleString()} people in ${city} already pulsed today`,
    });
    options.push({
      title: 'Pulse with your city',
      message: `${city} has ${pulses.toLocaleString()} pulses and counting`,
    });
  }

  // City rank variants
  if (rank != null) {
    options.push({
      title: `${city} is climbing!`,
      message: `${city} just hit #${rank} on the leaderboard`,
    });
    options.push({
      title: 'Leaderboard update',
      message: `${city} is #${rank} — help push them higher`,
    });
  }

  // Fallback if no data provided
  if (options.length === 0) {
    options.push(
      {
        title: 'People are pulsing',
        message: 'Your city is checking in right now. Join them?',
      },
      {
        title: 'The world is pulsing',
        message: "See how your city compares — it starts with you",
      },
    );
  }

  return pick(options);
}

// ---------------------------------------------------------------------------
// 3. Loss Aversion Notifications
// ---------------------------------------------------------------------------

export function getLossAversionCopy(data: {
  streakDays: number;
  aura: AuraType;
  hoursLeft?: number;
}): { title: string; message: string } {
  const { streakDays, aura, hoursLeft } = data;

  type CopyOption = { title: string; message: string };
  const options: CopyOption[] = [];

  // Streak-expiry variants
  if (streakDays > 0) {
    const timeLabel = hoursLeft != null && hoursLeft <= 3
      ? `in ${hoursLeft}h`
      : 'at midnight';

    options.push({
      title: 'Streak in danger!',
      message: `Your ${streakDays}-day streak expires ${timeLabel}`,
    });
    options.push({
      title: "Don't break the chain",
      message: `${streakDays} days gone if you miss today. Pulse now!`,
    });
  }

  // Aura-loss variants
  if (aura) {
    const auraIcon = aura === 'fire' ? '🔥' : aura === 'lightning' ? '⚡' : '💎';
    const auraName = aura.charAt(0).toUpperCase() + aura.slice(1);

    options.push({
      title: `${auraName} aura at risk`,
      message: `Don't lose your ${auraName} aura — pulse now! ${auraIcon}`,
    });

    if (aura !== 'diamond') {
      options.push({
        title: 'Protect your aura',
        message: `Your ${auraName} glow fades at midnight ${auraIcon}`,
      });
    }
  }

  // Near-milestone variants
  const milestoneTargets = [7, 14, 30, 50, 100];
  for (const target of milestoneTargets) {
    const remaining = target - streakDays;
    if (remaining > 0 && remaining <= 3) {
      const label = target === 7 ? 'Fire aura'
        : target === 30 ? 'Lightning aura'
        : target === 100 ? 'Diamond'
        : `Day ${target} milestone`;
      options.push({
        title: `${remaining} day${remaining > 1 ? 's' : ''} away!`,
        message: `You're ${remaining} day${remaining > 1 ? 's' : ''} from ${label}. Don't stop now!`,
      });
      break; // only add the nearest milestone
    }
  }

  // Fallback
  if (options.length === 0) {
    options.push({
      title: "Don't miss today",
      message: 'Pulse now to keep your progress alive',
    });
  }

  return pick(options);
}

// ---------------------------------------------------------------------------
// 4. Variable Reward Teaser (after-pulse)
// ---------------------------------------------------------------------------

/**
 * Returns a variable-reward notification or `null`.
 *
 * Implements a **variable ratio schedule** — roughly 30 % of calls return
 * copy so the user can't predict when they'll see it.
 */
export function getRewardTeaserCopy(): { title: string; message: string } | null {
  // ~30 % chance of firing
  if (Math.random() > 0.3) return null;

  return pick([
    {
      title: 'Something unlocked...',
      message: 'Something special unlocked... tap to see 🎁',
    },
    {
      title: 'Mood match!',
      message: `Your mood matched ${(200 + Math.floor(Math.random() * 900)).toLocaleString()} people nearby`,
    },
    {
      title: 'Mystery drop!',
      message: 'You earned a mystery drop! Open the app to claim it',
    },
    {
      title: 'New badge?',
      message: 'You might have earned something new. Tap to check 👀',
    },
    {
      title: 'Rare moment',
      message: "You pulsed at the same time as your whole crew. That's rare ✨",
    },
  ]);
}

// ---------------------------------------------------------------------------
// 5. Window Notifications (open / closing)
// ---------------------------------------------------------------------------

/** Personalized greeting based on streak tier */
function streakPrefix(streakDays: number): string {
  const tier = streakTier(streakDays);
  switch (tier) {
    case 'diamond':
      return `Diamond legend! 💎 Day ${streakDays}`;
    case 'lightning':
      return `Lightning Master ⚡ Day ${streakDays}`;
    case 'fire':
      return `Your fire burns bright 🔥 Day ${streakDays}`;
    case 'low':
      return `Day ${streakDays}! Keep it going`;
    case 'none':
    default:
      return 'How are you feeling?';
  }
}

const WINDOW_LABELS: Record<string, string> = {
  morning: 'morning',
  afternoon: 'afternoon',
  night: 'evening',
};

export function getWindowOpenCopy(
  windowType: string,
  streakDays: number,
): { title: string; message: string } {
  const period = WINDOW_LABELS[windowType] ?? windowType;
  const tier = streakTier(streakDays);

  // Title varies by streak tier
  const title = streakPrefix(streakDays);

  type CopyOption = { title: string; message: string };
  const options: CopyOption[] = [];

  switch (tier) {
    case 'none':
      options.push(
        { title: 'Quick check-in', message: `Good ${period} — how are you feeling right now?` },
        { title: 'Pulse is open', message: `The ${period} window is live. Share your mood!` },
        { title: "How's it going?", message: `${period.charAt(0).toUpperCase() + period.slice(1)} check-in is open. Tap to pulse` },
      );
      break;
    case 'low':
      options.push(
        { title, message: `${period.charAt(0).toUpperCase() + period.slice(1)} window is open — keep the momentum!` },
        { title: `Day ${streakDays}!`, message: `Good ${period}! Pulse now to grow your streak` },
        { title: 'Streak building', message: `Day ${streakDays} — your ${period} check-in awaits` },
      );
      break;
    case 'fire':
      options.push(
        { title, message: `Good ${period} — your ${period} check-in is live 🔥` },
        { title: `Day ${streakDays} 🔥`, message: `Fire streak! Tap to pulse this ${period}` },
        { title: 'Fire check-in', message: `${period.charAt(0).toUpperCase() + period.slice(1)} window open — Day ${streakDays} 🔥` },
      );
      break;
    case 'lightning':
      options.push(
        { title, message: `Good ${period}, Lightning Master. Pulse is open ⚡` },
        { title: `Day ${streakDays} ⚡`, message: `Lightning streak! Your ${period} window is live` },
        { title: 'Lightning check-in', message: `Master-level ${period} check-in — Day ${streakDays} ⚡` },
      );
      break;
    case 'diamond':
      options.push(
        { title, message: `Good ${period}, legend. The world awaits your pulse 💎` },
        { title: `Day ${streakDays} 💎`, message: `Diamond status. Your ${period} window is open` },
        { title: 'Diamond check-in', message: `Day ${streakDays} — the ${period} window is yours 💎` },
      );
      break;
  }

  return pick(options);
}

export function getWindowClosingCopy(
  windowType: string,
  minutesRemaining: number,
  streakDays: number,
): { title: string; message: string } {
  const period = WINDOW_LABELS[windowType] ?? windowType;
  const tier = streakTier(streakDays);
  const timeLabel = minutesRemaining <= 10
    ? `${minutesRemaining} min`
    : `${Math.round(minutesRemaining / 60)}h`;

  type CopyOption = { title: string; message: string };
  const options: CopyOption[] = [];

  // Urgency copy — always include a time-pressure variant
  options.push({
    title: 'Window closing soon',
    message: `${timeLabel} left in the ${period} window — pulse now!`,
  });

  if (tier === 'none') {
    options.push(
      { title: 'Last chance', message: `The ${period} window closes in ${timeLabel}. Quick pulse?` },
      { title: "Don't miss it", message: `${timeLabel} left to share how you're feeling` },
    );
  } else {
    options.push({
      title: 'Streak at stake!',
      message: `${timeLabel} left! Don't lose your ${streakDays}-day streak`,
    });
    options.push({
      title: 'Almost out of time',
      message: `Day ${streakDays} on the line — ${timeLabel} to pulse`,
    });

    if (tier === 'fire' || tier === 'lightning' || tier === 'diamond') {
      const icon = tier === 'fire' ? '🔥' : tier === 'lightning' ? '⚡' : '💎';
      options.push({
        title: `${icon} Closing soon`,
        message: `${timeLabel} left — keep that ${tier} aura alive!`,
      });
    }
  }

  return pick(options);
}

// ---------------------------------------------------------------------------
// 6. FOMO / Competitive Notifications
// ---------------------------------------------------------------------------

export function getCompetitiveCopy(data: {
  userCity?: string;
  rivalCity?: string;
  cityRank?: number;
  battleActive?: boolean;
}): { title: string; message: string } {
  const city = data.userCity ?? 'Your city';
  const rival = data.rivalCity;
  const rank = data.cityRank;

  type CopyOption = { title: string; message: string };
  const options: CopyOption[] = [];

  // Battle variants
  if (data.battleActive && rival) {
    options.push(
      {
        title: `${city} vs ${rival}`,
        message: `The battle is live! Pulse to score for ${city}`,
      },
      {
        title: 'City battle!',
        message: `${rival} is catching up — ${city} needs your pulse now`,
      },
      {
        title: 'Rep your city',
        message: `${city} is battling ${rival}. Don't let them win!`,
      },
    );
  }

  // Rank variants
  if (rank != null) {
    options.push({
      title: 'Leaderboard shift',
      message: `${city} is #${rank} — one spot from climbing. Pulse!`,
    });
    if (rank <= 10) {
      options.push({
        title: 'Top 10!',
        message: `${city} is #${rank} globally. Keep the momentum!`,
      });
    }
    if (rank > 10) {
      options.push({
        title: 'Can we do better?',
        message: `${city} is #${rank}. Every pulse helps climb higher`,
      });
    }
  }

  // Rival without battle
  if (rival && !data.battleActive) {
    options.push(
      {
        title: `${rival} is gaining`,
        message: `${rival} just passed ${city} on the leaderboard`,
      },
      {
        title: 'Rivalry alert',
        message: `${rival} is pulling ahead. Rally ${city}!`,
      },
    );
  }

  // Fallback — general competitive
  if (options.length === 0) {
    options.push(
      {
        title: 'City pride',
        message: `Pulse for ${city} — help them climb the ranks!`,
      },
      {
        title: 'Your city needs you',
        message: `Every pulse counts toward ${city}'s rank`,
      },
    );
  }

  return pick(options);
}
