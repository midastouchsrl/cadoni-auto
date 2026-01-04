'use client';

/**
 * Analytics Provider Component
 * Initializes all analytics services on mount
 */

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Analytics } from '@vercel/analytics/react';
import { initAnalytics, trackReferralSource } from '@/lib/analytics';

export default function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize analytics on mount
  useEffect(() => {
    initAnalytics();
    trackReferralSource();
  }, []);

  // Track page changes (for SPA navigation)
  useEffect(() => {
    // Plausible auto-tracks, PostHog we handle manually if needed
  }, [pathname, searchParams]);

  return (
    <>
      {children}
      {/* Vercel Analytics - automatic performance tracking */}
      <Analytics />
    </>
  );
}
