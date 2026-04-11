import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Tunnel através do nosso próprio domínio — evita bloqueio de CSP e ad blocker
  tunnel: "/monitoring",

  tracesSampleRate: 0.1,
  enabled: process.env.NODE_ENV === "production",

  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    /^AbortError/,
    /^ChunkLoadError/,
  ],
});
