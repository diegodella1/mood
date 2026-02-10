'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Theme } from 'emoji-picker-react';

const Picker = dynamic(
  () => import('emoji-picker-react').then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="h-[350px] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    ),
  }
);

interface AdminEmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
  label?: string;
}

export function AdminEmojiPicker({ value, onChange, label = 'Icon' }: AdminEmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm text-zinc-400 mb-1">{label}</label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-center text-2xl hover:border-zinc-500 transition-colors flex items-center justify-center gap-2"
      >
        <span>{value || '🎉'}</span>
        <span className="text-xs text-zinc-500">Change</span>
      </button>

      {open && (
        <div className="absolute z-50 mt-2 left-0">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden">
            <Picker
              onEmojiClick={(emojiData) => {
                onChange(emojiData.emoji);
                setOpen(false);
              }}
              theme={Theme.DARK}
              width={350}
              height={400}
              searchPlaceholder="Search emojis..."
              previewConfig={{ showPreview: false }}
              skinTonesDisabled
              lazyLoadEmojis
            />
          </div>
        </div>
      )}
    </div>
  );
}
