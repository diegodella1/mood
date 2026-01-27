'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { Theme } from 'emoji-picker-react';

// Dynamically import emoji-picker-react to avoid SSR issues
const Picker = dynamic(
  () => import('emoji-picker-react').then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="h-[350px] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--color-aurora-cyan)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
);

// Spring config
const springSnappy = { type: 'spring' as const, damping: 25, stiffness: 300 };

interface EmojiPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
}

export function EmojiPicker({ isOpen, onClose, onSelect }: EmojiPickerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-[var(--color-void)]/80 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            transition={springSnappy}
            className="relative z-10 glass-card-glow overflow-hidden max-w-[380px] w-full"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-[var(--surface-border)]">
              <h3 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">
                Pick an emoji
              </h3>
              <motion.button
                onClick={onClose}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors p-1"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.button>
            </div>

            {/* Picker */}
            <div className="emoji-picker-container">
              <Picker
                onEmojiClick={(emojiData) => {
                  onSelect(emojiData.emoji);
                  onClose();
                }}
                theme={Theme.DARK}
                width="100%"
                height={350}
                searchPlaceholder="Search emojis..."
                previewConfig={{ showPreview: false }}
                skinTonesDisabled
                lazyLoadEmojis
              />
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
