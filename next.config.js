const { withSentryConfig } = require('@sentry/nextjs')

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint:     { ignoreDuringBuilds: true },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options',    value: 'nosniff' },
          { key: 'X-Frame-Options',           value: 'DENY' },
          { key: 'X-XSS-Protection',          value: '1; mode=block' },
          { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',        value: 'camera=(), microphone=(self), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          {
            key:   'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self'",
              // 'self' covers /monitoring (our explicit Sentry tunnel route)
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.groq.com https://generativelanguage.googleapis.com",
              "media-src 'self' blob:",
              "worker-src 'self' blob:",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
          { key: 'Pragma',        value: 'no-cache' },
        ],
      },
    ]
  },
}

// withSentryConfig adds source map upload and performance monitoring.
// We do NOT use tunnelRoute here — we have our own explicit /monitoring route.
const sentryOptions = {
  silent:          true,
  hideSourceMaps:  true,
  disableLogger:   true,
  automaticVercelMonitors: false,
}

module.exports = process.env.SENTRY_DSN
  ? withSentryConfig(nextConfig, sentryOptions)
  : nextConfig
