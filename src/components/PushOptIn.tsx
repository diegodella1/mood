'use client';

import { useState } from 'react';
import { useOneSignal } from '@/providers/OneSignalProvider';
import { trackPushOptIn } from '@/lib/analytics';

interface PushOptInProps {
  onClose?: () => void;
}

export function PushOptIn({ onClose }: PushOptInProps) {
  const { isSubscribed, isInitialized, initError, browserPermission, requestPermission } = useOneSignal();
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  if (isSubscribed) return null;

  // Show browser-denied state
  const isBrowserDenied = browserPermission === 'denied';
  const isUnsupported = browserPermission === 'unsupported';

  const handleEnable = async () => {
    setIsRequesting(true);
    setError(null);

    try {
      const result = await requestPermission();

      if (result.granted) {
        trackPushOptIn();
        setShowSuccess(true);
        // Auto-close after showing success
        setTimeout(() => {
          onClose?.();
        }, 1500);
      } else if (result.error) {
        setError(result.error);
      } else {
        // Permission was dismissed (user closed the prompt without accepting)
        setError('Permission request was dismissed. Click to try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsRequesting(false);
    }
  };

  // Success state
  if (showSuccess) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-gray-900 rounded-2xl p-6 max-w-sm w-full border border-gray-800">
          <div className="text-center">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-xl font-bold text-white mb-2">
              Notifications enabled!
            </h2>
            <p className="text-gray-400">
              You&apos;ll receive alerts when pulse windows open
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-2xl p-6 max-w-sm w-full border border-gray-800">
        <div className="text-center mb-6">
          <div className="text-5xl mb-4">{isBrowserDenied || isUnsupported ? '🔕' : '🔔'}</div>
          <h2 className="text-xl font-bold text-white mb-2">
            {isBrowserDenied
              ? 'Notifications blocked'
              : isUnsupported
              ? 'Notifications not supported'
              : 'Never miss a pulse'}
          </h2>
          <p className="text-gray-400">
            {isBrowserDenied
              ? 'You\'ve blocked notifications in your browser. To enable them, click the lock icon in your address bar and allow notifications.'
              : isUnsupported
              ? 'Your browser doesn\'t support push notifications. Try using Chrome, Firefox, or Edge.'
              : 'Get notified when pulse windows open and see real-time mood trends'}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {/* Init error warning */}
        {initError && !isBrowserDenied && !isUnsupported && (
          <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg text-yellow-400 text-sm text-center">
            {initError}
          </div>
        )}

        <div className="space-y-3">
          {!isBrowserDenied && !isUnsupported && (
            <button
              onClick={handleEnable}
              disabled={isRequesting || !isInitialized}
              className={`
                w-full py-3 rounded-xl font-medium transition-all
                bg-gradient-to-r from-purple-500 to-pink-500
                hover:from-purple-600 hover:to-pink-600
                text-white
                ${(isRequesting || !isInitialized) ? 'opacity-70 cursor-not-allowed' : ''}
              `}
            >
              {isRequesting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Enabling...
                </span>
              ) : !isInitialized ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Loading...
                </span>
              ) : (
                'Enable Notifications'
              )}
            </button>
          )}

          <button
            onClick={onClose}
            disabled={isRequesting}
            className="w-full py-3 rounded-xl font-medium text-gray-400 hover:text-white transition-colors"
          >
            {isBrowserDenied || isUnsupported ? 'Close' : 'Maybe later'}
          </button>
        </div>
      </div>
    </div>
  );
}
