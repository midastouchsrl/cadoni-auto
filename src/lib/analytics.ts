/**
 * VibeCar Analytics Module
 * Unified tracking for Plausible, PostHog, and custom metrics
 *
 * Privacy-first: No PII, no cookies required, fully anonymous
 */

import posthog from 'posthog-js';

// ============================================
// CONFIGURATION
// ============================================

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || '';
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.posthog.com';
const PLAUSIBLE_DOMAIN = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN || 'vibecar.it';

// ============================================
// INITIALIZATION
// ============================================

let initialized = false;

/**
 * Initialize analytics (call once on app mount)
 */
export function initAnalytics(): void {
  if (initialized || typeof window === 'undefined') return;

  // Initialize PostHog
  if (POSTHOG_KEY) {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      // Privacy settings
      persistence: 'memory', // No cookies
      disable_session_recording: true, // No session recording
      autocapture: false, // Manual events only
      capture_pageview: false, // We use Plausible for pageviews
      capture_pageleave: false,
      // Disable PII collection
      sanitize_properties: (properties) => {
        // Remove any potential PII
        const sanitized = { ...properties };
        delete sanitized.$ip;
        delete sanitized.$user_id;
        delete sanitized.email;
        delete sanitized.name;
        delete sanitized.phone;
        return sanitized;
      },
    });

    // Opt out of everything by default, enable only what we need
    posthog.opt_in_capturing();
  }

  initialized = true;
  console.log('[Analytics] Initialized');
}

// ============================================
// EVENT TYPES
// ============================================

export interface EstimateEventProps {
  brand: string;
  model: string;
  year: number;
  km: number;
  fuel: string;
  gearbox: string;
}

export interface EstimateResultProps {
  brand: string;
  model: string;
  year: number;
  confidence: 'alta' | 'media' | 'bassa';
  n_used: number;
  cached: boolean;
  p50: number;
  fallback_step?: string;
  time_to_result_ms?: number;
}

export interface ShareEventProps {
  type: 'link' | 'image' | 'whatsapp';
  brand: string;
  model: string;
  year: number;
  confidence: string;
}

// ============================================
// PLAUSIBLE EVENTS
// ============================================

/**
 * Track event in Plausible (goals)
 */
function trackPlausible(eventName: string, props?: Record<string, string | number | boolean>): void {
  if (typeof window === 'undefined') return;

  // Plausible uses window.plausible
  const plausible = (window as unknown as { plausible?: (event: string, options?: { props?: Record<string, string | number | boolean> }) => void }).plausible;

  if (plausible) {
    plausible(eventName, props ? { props } : undefined);
  }
}

// ============================================
// POSTHOG EVENTS
// ============================================

/**
 * Track event in PostHog
 */
function trackPostHog(eventName: string, properties?: Record<string, unknown>): void {
  if (!POSTHOG_KEY || typeof window === 'undefined') return;

  posthog.capture(eventName, {
    ...properties,
    // Always add timestamp
    timestamp: new Date().toISOString(),
  });
}

// ============================================
// UNIFIED TRACKING FUNCTIONS
// ============================================

/**
 * Track: User starts estimate (fills form)
 */
export function trackStartEstimate(props: EstimateEventProps): void {
  // PostHog: detailed tracking
  trackPostHog('start_estimate', {
    brand: props.brand,
    model: props.model,
    year: props.year,
    km_range: getKmRange(props.km),
    fuel: props.fuel,
    gearbox: props.gearbox,
  });
}

/**
 * Track: Estimate completed successfully
 */
export function trackEstimateCompleted(props: EstimateResultProps): void {
  // Plausible: goal tracking
  trackPlausible('estimate_completed', {
    confidence: props.confidence,
    cached: props.cached,
  });

  // PostHog: detailed analytics
  trackPostHog('estimate_completed', {
    brand: props.brand,
    model: props.model,
    year: props.year,
    confidence: props.confidence,
    n_used: props.n_used,
    cached: props.cached,
    p50_range: getPriceRange(props.p50),
    fallback_step: props.fallback_step || 'none',
    time_to_result_ms: props.time_to_result_ms,
  });

  // Track cache hit separately for metrics
  if (props.cached) {
    trackPostHog('estimate_cached', { cached: true });
  }

  // Track fallback if triggered
  if (props.fallback_step && props.fallback_step !== 'none' && props.fallback_step !== 'stretta') {
    trackPostHog('fallback_triggered', {
      step: props.fallback_step,
      brand: props.brand,
      model: props.model,
    });
  }
}

/**
 * Track: Share button clicked
 */
export function trackShareClicked(props: ShareEventProps): void {
  // Plausible: goal
  trackPlausible('share_clicked', {
    type: props.type,
  });

  // PostHog: detailed
  trackPostHog('share_clicked', {
    type: props.type,
    brand: props.brand,
    model: props.model,
    year: props.year,
    confidence: props.confidence,
  });
}

/**
 * Track: Share completed (image downloaded or link copied)
 */
export function trackShareCompleted(props: ShareEventProps): void {
  // Plausible: goal
  if (props.type === 'image') {
    trackPlausible('share_image_downloaded');
  }

  // PostHog
  trackPostHog('share_completed', {
    type: props.type,
    brand: props.brand,
    model: props.model,
  });
}

/**
 * Track: Recalculation requested
 */
export function trackRecalculationClicked(props: { brand: string; model: string; year: number }): void {
  trackPostHog('recalculation_clicked', props);
}

/**
 * Track: Error occurred
 */
export function trackError(error: string, context?: Record<string, unknown>): void {
  trackPostHog('error_occurred', {
    error,
    ...context,
  });
}

/**
 * Track: Estimate failed (no results)
 */
export function trackEstimateFailed(props: EstimateEventProps, reason: string): void {
  trackPostHog('estimate_failed', {
    brand: props.brand,
    model: props.model,
    year: props.year,
    reason,
  });
}

// ============================================
// VIRAL METRICS
// ============================================

/**
 * Track: Referral source (for K-factor calculation)
 */
export function trackReferralSource(): void {
  if (typeof window === 'undefined') return;

  const referrer = document.referrer;
  const urlParams = new URLSearchParams(window.location.search);
  const utmSource = urlParams.get('utm_source');
  const sharedFrom = urlParams.get('ref'); // ?ref=share parameter

  if (sharedFrom === 'share') {
    trackPostHog('viral_visit', {
      source: 'share_link',
      referrer_domain: referrer ? new URL(referrer).hostname : 'direct',
    });
  } else if (utmSource) {
    trackPostHog('utm_visit', {
      utm_source: utmSource,
      utm_medium: urlParams.get('utm_medium') || 'unknown',
    });
  }
}

// ============================================
// HELPER FUNCTIONS (anonymization)
// ============================================

/**
 * Convert exact km to range (privacy)
 */
function getKmRange(km: number): string {
  if (km < 10000) return '0-10k';
  if (km < 30000) return '10-30k';
  if (km < 50000) return '30-50k';
  if (km < 100000) return '50-100k';
  if (km < 150000) return '100-150k';
  if (km < 200000) return '150-200k';
  return '200k+';
}

/**
 * Convert exact price to range (privacy)
 */
function getPriceRange(price: number): string {
  if (price < 5000) return '0-5k';
  if (price < 10000) return '5-10k';
  if (price < 15000) return '10-15k';
  if (price < 20000) return '15-20k';
  if (price < 30000) return '20-30k';
  if (price < 50000) return '30-50k';
  return '50k+';
}

// ============================================
// PERFORMANCE TRACKING
// ============================================

let estimateStartTime: number | null = null;

/**
 * Start timing an estimate
 */
export function startEstimateTiming(): void {
  estimateStartTime = performance.now();
}

/**
 * Get time elapsed since estimate started
 */
export function getEstimateTimeMs(): number | undefined {
  if (!estimateStartTime) return undefined;
  const elapsed = Math.round(performance.now() - estimateStartTime);
  estimateStartTime = null;
  return elapsed;
}

// ============================================
// METRICS CALCULATION (for dashboard)
// ============================================

/**
 * Metrics definitions for PostHog dashboard
 */
export const METRICS = {
  // Share rate = share_clicked / estimate_completed
  shareRate: {
    name: 'Share Rate',
    formula: 'share_clicked / estimate_completed',
    description: 'Percentage of users who share their valuation',
  },

  // Cache hit rate = estimate_cached / estimate_completed
  cacheHitRate: {
    name: 'Cache Hit Rate',
    formula: 'estimate_cached / estimate_completed',
    description: 'Percentage of estimates served from cache',
  },

  // Fallback rate = fallback_triggered / estimate_completed
  fallbackRate: {
    name: 'Fallback Rate',
    formula: 'fallback_triggered / estimate_completed',
    description: 'Percentage of estimates requiring fallback search',
  },

  // K-factor = viral_visit * (estimate_completed ratio) / share_completed
  kFactor: {
    name: 'Viral Coefficient (K)',
    formula: 'viral_visits * conversion_rate',
    description: 'Average new users generated per share',
  },

  // Time to result (P50)
  timeToResult: {
    name: 'Time to Result (P50)',
    formula: 'percentile(time_to_result_ms, 50)',
    description: 'Median time from form submit to result display',
  },
};

/**
 * Funnel definition for PostHog
 */
export const FUNNEL = {
  name: 'Estimate to Share',
  steps: [
    { event: 'start_estimate', label: 'Started Estimate' },
    { event: 'estimate_completed', label: 'Estimate Completed' },
    { event: 'share_clicked', label: 'Share Clicked' },
    { event: 'share_completed', label: 'Share Completed' },
  ],
};
