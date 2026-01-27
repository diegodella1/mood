'use client';

import { useState } from 'react';
import { REACTIONS, REACTION_EMOJIS, Reaction } from '@/lib/constants';
import { useUser } from '@/providers/UserProvider';
import { trackReactionSent } from '@/lib/analytics';

interface ReactionBarProps {
  pulseId: string;
  onReact?: (reaction: Reaction) => void;
}

export function ReactionBar({ pulseId, onReact }: ReactionBarProps) {
  const { user } = useUser();
  const [selectedReaction, setSelectedReaction] = useState<Reaction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReaction = async (reaction: Reaction) => {
    if (!user?.id || selectedReaction || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/reaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pulseId,
          fromUserId: user.id,
          emoji: reaction,
        }),
      });

      if (response.ok) {
        setSelectedReaction(reaction);
        trackReactionSent(reaction);
        onReact?.(reaction);

        // Haptic feedback
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate(10);
        }
      }
    } catch (error) {
      console.error('Reaction error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center gap-2 py-2">
      {REACTIONS.map((reaction) => {
        const isSelected = selectedReaction === reaction;
        const isDisabled = !!selectedReaction && !isSelected;

        return (
          <button
            key={reaction}
            onClick={() => handleReaction(reaction)}
            disabled={isDisabled || isSubmitting}
            className={`
              p-2 rounded-full transition-all duration-200
              ${isSelected
                ? 'bg-purple-500/30 scale-110'
                : 'hover:bg-gray-700/50 hover:scale-105'
              }
              ${isDisabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
            `}
            aria-label={`React with ${reaction}`}
          >
            <span className="text-2xl" role="img" aria-hidden="true">
              {REACTION_EMOJIS[reaction]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
