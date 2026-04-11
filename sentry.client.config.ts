import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Route events through our own /monitoring tunnel
  tunnel: '/monitoring',

  // Capture 100% of errors, 10% of performance traces
  tracesSampleRate:   0.1,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.0,

  // Enabled in production only
  enabled: process.env.NODE_ENV === 'production',

  // Capture unhandled promise rejections
  integrations: [],

  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    /^AbortError/,
    /^ChunkLoadError/,
  ],

  beforeSend(event) {
    // Don't send events without useful info
    if (!event.exception && !event.message) return null
    return event
  },
})
