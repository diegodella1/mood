'use client';

import { useState } from 'react';
import { useOneSignal } from '@/providers/OneSignalProvider';
import { trackPushOptIn } from '@/lib/analytics';

interface PushOptInProps {
  onClose?: () => void;
}

export function PushOptIn({ onClose }: PushOptInProps) {
  const { isSubscribed, requestPermission } = useOneSignal();
  const [isRequesting, setIsRequesting] = useState(false);

  if (isSubscribed) return null;

  const handleEnable = async () => {
    setIsRequesting(true);

    try {
      const granted = await requestPermission();
      if (granted) {
        trackPushOptIn();
        onClose?.();
      }
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-2xl p-6 max-w-sm w-full border border-gray-800">
        <div className="text-center mb-6">
          <div className="text-5xl mb-4">🔔</div>
          <h2 className="text-xl font-bold text-white mb-2">
            Never miss a pulse
          </h2>
          <p className="text-gray-400">
            Get notified when pulse windows open and see real-time mood trends
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleEnable}
            disabled={isRequesting}
            className={`
              w-full py-3 rounded-xl font-medium transition-all
              bg-gradient-to-r from-purple-500 to-pink-500
              hover:from-purple-600 hover:to-pink-600
              text-white
              ${isRequesting ? 'opacity-70 cursor-not-allowed' : ''}
            `}
          >
            {isRequesting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Enabling...
              </span>
            ) : (
              'Enable Notifications'
            )}
          </button>

          <button
            onClick={onClose}
            disabled={isRequesting}
            className="w-full py-3 rounded-xl font-medium text-gray-400 hover:text-white transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
