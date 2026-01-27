'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/providers/UserProvider';

const REFERRAL_STORAGE_KEY = 'global_pulse_pending_referral';

/**
 * Hook to handle referral codes from URL parameters
 * Stores referral code for processing after user bootstrap
 */
export function useReferral() {
  const { user } = useUser();
  const [isProcessing, setIsProcessing] = useState(false);
  const [referralApplied, setReferralApplied] = useState(false);

  // Capture referral code from URL on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref');

    if (refCode) {
      // Store for processing after user is ready
      localStorage.setItem(REFERRAL_STORAGE_KEY, refCode.toUpperCase());

      // Clean URL without refresh
      const url = new URL(window.location.href);
      url.searchParams.delete('ref');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  // Process pending referral once user is available
  useEffect(() => {
    if (!user?.id || isProcessing || referralApplied) return;

    const pendingReferral = localStorage.getItem(REFERRAL_STORAGE_KEY);
    if (!pendingReferral) return;

    // Don't apply own referral code
    if (user.referralCode === pendingReferral) {
      localStorage.removeItem(REFERRAL_STORAGE_KEY);
      return;
    }

    const applyReferral = async () => {
      setIsProcessing(true);

      try {
        const response = await fetch('/api/referral', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            referralCode: pendingReferral,
          }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setReferralApplied(true);
          console.log('Referral applied successfully');
        } else {
          console.log('Referral not applied:', data.error);
        }
      } catch (error) {
        console.error('Failed to apply referral:', error);
      } finally {
        localStorage.removeItem(REFERRAL_STORAGE_KEY);
        setIsProcessing(false);
      }
    };

    applyReferral();
  }, [user?.id, user?.referralCode, isProcessing, referralApplied]);

  return { isProcessing, referralApplied };
}
