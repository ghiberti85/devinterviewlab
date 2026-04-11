/**
 * Structured logger for server-side use.
 * In production, errors are sent to Sentry (if configured) + console.
 * In development, colorized console output with context.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  userId?:   string
  endpoint?: string
  method?:   string
  duration?: number
  [key: string]:  unknown
}

function formatMessage(level: LogLevel, message: string, ctx?: LogContext): string {
  const ts  = new Date().toISOString()
  const base = { ts, level, message, ...ctx }
  return JSON.stringify(base)
}

export const logger = {
  debug(message: string, ctx?: LogContext) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${message}`, ctx ?? '')
    }
  },

  info(message: string, ctx?: LogContext) {
    console.info(formatMessage('info', message, ctx))
  },

  warn(message: string, ctx?: LogContext) {
    console.warn(formatMessage('warn', message, ctx))
  },

  error(message: string, err?: unknown, ctx?: LogContext) {
    const errorInfo = err instanceof Error
      ? { errorName: err.name, errorMessage: err.message, stack: err.stack }
      : { errorRaw: String(err) }

    console.error(formatMessage('error', message, { ...ctx, ...errorInfo }))

    // Send to Sentry in production if configured
    if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
      import('@sentry/nextjs').then(Sentry => {
        Sentry.withScope(scope => {
          if (ctx?.userId) scope.setUser({ id: ctx.userId as string })
          if (ctx?.endpoint) scope.setTag('endpoint', ctx.endpoint as string)
          Object.entries(ctx ?? {}).forEach(([k, v]) => scope.setExtra(k, v))
          if (err instanceof Error) {
            Sentry.captureException(err)
          } else {
            Sentry.captureMessage(message, 'error')
          }
        })
      }).catch(() => {
        // Sentry unavailable — already logged to console above
      })
    }
  },
}
