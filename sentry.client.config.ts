/**
 * Sentry Client-side Configuration
 * Error tracking with privacy protection
 */

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring
  tracesSampleRate: 0.1, // 10% of transactions

  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',

  // Privacy settings
  beforeSend(event) {
    // Remove PII from error reports
    if (event.user) {
      delete event.user.ip_address;
      delete event.user.email;
      delete event.user.username;
    }

    // Remove sensitive URL params
    if (event.request?.url) {
      const url = new URL(event.request.url);
      url.searchParams.delete('email');
      url.searchParams.delete('token');
      event.request.url = url.toString();
    }

    return event;
  },

  // Environment
  environment: process.env.NODE_ENV,

  // Ignore common non-actionable errors
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection',
    'Load failed',
    'Failed to fetch',
  ],
});
