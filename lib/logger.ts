/**
 * Structured logger for server-side use.
 * In production, errors are sent to Sentry (if configured) + console.
 * In development, colorized console output with context.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  userId?: string;
  endpoint?: string;
  duration?: number;
  [key: string]: unknown;
}

function fmt(level: LogLevel, message: string, ctx?: LogContext): string {
  return JSON.stringify({
    ts: new Date().toISOString(),
    level,
    message,
    ...ctx,
  });
}

export const logger = {
  debug(message: string, ctx?: LogContext) {
    if (process.env.NODE_ENV === "development")
      console.debug(`[DEBUG] ${message}`, ctx ?? "");
  },
  info(message: string, ctx?: LogContext) {
    console.info(fmt("info", message, ctx));
  },
  warn(message: string, ctx?: LogContext) {
    console.warn(fmt("warn", message, ctx));
  },
  error(message: string, err?: unknown, ctx?: LogContext) {
    const errInfo =
      err instanceof Error
        ? { errorName: err.name, errorMessage: err.message }
        : { errorRaw: String(err) };
    console.error(fmt("error", message, { ...ctx, ...errInfo }));

    if (process.env.NODE_ENV === "production" && process.env.SENTRY_DSN) {
      import("@sentry/nextjs")
        .then((Sentry) => {
          if (err instanceof Error) Sentry.captureException(err);
          else Sentry.captureMessage(message, "error");
        })
        .catch(() => {});
    }
  },
};
