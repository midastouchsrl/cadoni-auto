/**
 * VibeCar Analytics Module
 * Unified tracking for Plausible, PostHog, and custom metrics
 *
 * Privacy-first: No PII, no cookies required, fully anonymous
 *
 * Features:
 * - Anonymous ID (persistent localStorage UUID)
 * - Estimate ID (per-valuation UUID for attribution)
 * - Viral tracking with share link attribution
 */

import posthog from 'posthog-js';

// ============================================
// CONFIGURATION
// ============================================

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || '';
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.posthog.com';
const PLAUSIBLE_DOMAIN = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN || 'vibecar.it';

// Storage keys
const ANON_ID_KEY = 'vibecar_anon_id';
const ESTIMATE_CONTEXT_KEY = 'vibecar_estimate_context';

// ============================================
// UUID GENERATION (v4)
// ============================================

/**
 * Generate UUID v4
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ============================================
// ANONYMOUS ID MANAGEMENT
// ============================================

let cachedAnonId: string | null = null;

/**
 * Get or create anonymous ID (persistent in localStorage)
 */
export function getAnonId(): string {
  if (typeof window === 'undefined') return 'server';

  if (cachedAnonId) return cachedAnonId;

  try {
    let anonId = localStorage.getItem(ANON_ID_KEY);
    if (!anonId) {
      anonId = generateUUID();
      localStorage.setItem(ANON_ID_KEY, anonId);
    }
    cachedAnonId = anonId;
    return anonId;
  } catch {
    // localStorage not available (private browsing)
    cachedAnonId = generateUUID();
    return cachedAnonId;
  }
}

// ============================================
// ESTIMATE ID MANAGEMENT
// ============================================

/**
 * Generate a new estimate ID (UUID v4)
 */
export function newEstimateId(): string {
  return generateUUID();
}

// ============================================
// ESTIMATE CONTEXT (current session)
// ============================================

export interface EstimateContext {
  estimate_id: string;
  origin_ref?: string;    // 'share' | 'organic' | 'utm'
  origin_sid?: string;    // Source estimate_id if from share
  utm_source?: string;
  utm_medium?: string;
}

let currentEstimateContext: EstimateContext | null = null;

/**
 * Set current estimate context
 */
export function setEstimateContext(context: EstimateContext): void {
  currentEstimateContext = context;

  // Also persist to sessionStorage for page reloads
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(ESTIMATE_CONTEXT_KEY, JSON.stringify(context));
    } catch {
      // Ignore
    }
  }
}

/**
 * Get current estimate context
 */
export function getEstimateContext(): EstimateContext | null {
  if (currentEstimateContext) return currentEstimateContext;

  if (typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem(ESTIMATE_CONTEXT_KEY);
      if (stored) {
        currentEstimateContext = JSON.parse(stored);
        return currentEstimateContext;
      }
    } catch {
      // Ignore
    }
  }

  return null;
}

/**
 * Clear estimate context (after share or new estimate)
 */
export function clearEstimateContext(): void {
  currentEstimateContext = null;
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem(ESTIMATE_CONTEXT_KEY);
    } catch {
      // Ignore
    }
  }
}

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

  // Check for viral attribution on init
  parseReferralSource();

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
  n_total: number;
  cached: boolean;
  p25: number;
  p50: number;
  p75: number;
  dealer_price: number;
  dealer_gap: number;      // p50 - dealer_price
  iqr_ratio: number;
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
 * Track event in PostHog with identity
 */
function trackPostHog(eventName: string, properties?: Record<string, unknown>): void {
  if (!POSTHOG_KEY || typeof window === 'undefined') return;

  const context = getEstimateContext();
  const anonId = getAnonId();

  posthog.capture(eventName, {
    ...properties,
    // Identity
    anon_id: anonId,
    estimate_id: context?.estimate_id,
    // Attribution
    origin_ref: context?.origin_ref,
    origin_sid: context?.origin_sid,
    // Timestamp
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
  // Generate new estimate ID for this session
  const estimateId = newEstimateId();
  const context = getEstimateContext();

  // Update context with new estimate ID, preserving attribution
  setEstimateContext({
    estimate_id: estimateId,
    origin_ref: context?.origin_ref || 'organic',
    origin_sid: context?.origin_sid,
    utm_source: context?.utm_source,
    utm_medium: context?.utm_medium,
  });

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

  // PostHog: detailed analytics with enhanced properties
  trackPostHog('estimate_completed', {
    brand: props.brand,
    model: props.model,
    year: props.year,
    confidence: props.confidence,
    n_used: props.n_used,
    n_total: props.n_total,
    cached: props.cached,
    p25_range: getPriceRange(props.p25),
    p50_range: getPriceRange(props.p50),
    p75_range: getPriceRange(props.p75),
    dealer_price_range: getPriceRange(props.dealer_price),
    dealer_gap: props.dealer_gap,
    iqr_ratio: props.iqr_ratio,
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
// LEAD FORM EVENTS (NO PII)
// ============================================

export interface LeadEventProps {
  confidence: string;
  dealer_gap_bucket: string;
  cached: boolean;
}

/**
 * Track: Lead form opened/viewed
 */
export function trackLeadFormOpened(props: LeadEventProps): void {
  trackPostHog('lead_form_opened', {
    confidence: props.confidence,
    dealer_gap_bucket: props.dealer_gap_bucket,
    cached: props.cached,
  });
}

/**
 * Track: Lead form submitted (NO PII - no email/phone/name)
 */
export function trackLeadSubmitted(props: LeadEventProps): void {
  // Plausible goal
  trackPlausible('lead_submitted', {
    confidence: props.confidence,
  });

  // PostHog event (no PII)
  trackPostHog('lead_submitted', {
    confidence: props.confidence,
    dealer_gap_bucket: props.dealer_gap_bucket,
    cached: props.cached,
  });
}

/**
 * Get dealer gap bucket for analytics
 */
export function getDealerGapBucket(dealerGap: number): string {
  if (dealerGap < 500) return '0-500';
  if (dealerGap < 1000) return '500-1k';
  if (dealerGap < 2000) return '1k-2k';
  if (dealerGap < 3000) return '2k-3k';
  if (dealerGap < 5000) return '3k-5k';
  return '5k+';
}

// ============================================
// VIRAL ATTRIBUTION
// ============================================

/**
 * Parse URL for referral/attribution data (called on init)
 */
function parseReferralSource(): void {
  if (typeof window === 'undefined') return;

  const urlParams = new URLSearchParams(window.location.search);
  const ref = urlParams.get('ref');
  const sid = urlParams.get('sid');    // Source estimate_id
  const utmSource = urlParams.get('utm_source');
  const utmMedium = urlParams.get('utm_medium');

  // Build initial context
  let origin_ref: string = 'organic';
  let origin_sid: string | undefined;

  if (ref === 'share' && sid) {
    origin_ref = 'share';
    origin_sid = sid;

    // Track viral visit immediately
    trackPostHog('viral_visit', {
      source: 'share_link',
      source_estimate_id: sid,
      referrer_domain: document.referrer ? new URL(document.referrer).hostname : 'direct',
    });
  } else if (utmSource) {
    origin_ref = 'utm';

    trackPostHog('utm_visit', {
      utm_source: utmSource,
      utm_medium: utmMedium || 'unknown',
    });
  }

  // Set initial context (will be updated when estimate starts)
  if (origin_ref !== 'organic') {
    setEstimateContext({
      estimate_id: '', // Will be set when estimate starts
      origin_ref,
      origin_sid,
      utm_source: utmSource || undefined,
      utm_medium: utmMedium || undefined,
    });
  }
}

/**
 * Track: Referral source (legacy, kept for compatibility)
 */
export function trackReferralSource(): void {
  // Now handled automatically in parseReferralSource() on init
}

/**
 * Generate share URL with attribution params
 * Points directly to /risultato?sid=xxx for immediate result viewing
 */
export function generateShareUrl(baseUrl?: string): string {
  const context = getEstimateContext();
  const base = baseUrl || window.location.origin;
  const url = new URL('/risultato', base);

  if (context?.estimate_id) {
    url.searchParams.set('sid', context.estimate_id);
  }

  return url.toString();
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
