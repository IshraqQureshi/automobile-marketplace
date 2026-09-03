/**
 * Minimal structured logging. Deliberately not a dependency (pino/winston) —
 * MVP scope doesn't justify that yet; this gives consistent, greppable
 * server-side log lines now, and can be swapped for a real provider later
 * without touching call sites, since everything goes through this module.
 *
 * Never pass secrets/tokens/passwords as `context` — they end up in
 * whatever log aggregation the deployment platform captures.
 */

type LogContext = Record<string, unknown>;

function format(level: string, message: string, context?: LogContext) {
  const entry = {
    level,
    message,
    time: new Date().toISOString(),
    ...(context ? { context } : {}),
  };
  return JSON.stringify(entry);
}

export const logger = {
  info(message: string, context?: LogContext) {
    console.log(format("info", message, context));
  },
  warn(message: string, context?: LogContext) {
    console.warn(format("warn", message, context));
  },
  error(message: string, error?: unknown, context?: LogContext) {
    console.error(
      format("error", message, {
        ...context,
        error: error instanceof Error ? { name: error.name, message: error.message } : error,
      }),
    );
  },
};
