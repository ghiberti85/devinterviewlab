interface AttemptRecord {
  count: number;
  firstAt: number;
  blockedAt: number | null;
}

const attempts = new Map<string, AttemptRecord>();

const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const BLOCK_MS = 15 * 60 * 1000; // 15 minutos de bloqueio

export function getClientIP(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function checkBruteForce(ip: string): {
  allowed: boolean;
  retryAfterSec?: number;
} {
  const now = Date.now();
  const record = attempts.get(ip);

  if (!record) return { allowed: true };

  if (record.blockedAt) {
    const elapsed = now - record.blockedAt;
    if (elapsed < BLOCK_MS) {
      return {
        allowed: false,
        retryAfterSec: Math.ceil((BLOCK_MS - elapsed) / 1000),
      };
    }
    attempts.delete(ip);
    return { allowed: true };
  }

  if (now - record.firstAt > WINDOW_MS) {
    attempts.delete(ip);
    return { allowed: true };
  }

  if (record.count >= MAX_ATTEMPTS) {
    record.blockedAt = now;
    return {
      allowed: false,
      retryAfterSec: Math.ceil(BLOCK_MS / 1000),
    };
  }

  return { allowed: true };
}

export function recordFailedAttempt(ip: string): void {
  const now = Date.now();
  const record = attempts.get(ip);

  if (!record) {
    attempts.set(ip, { count: 1, firstAt: now, blockedAt: null });
    return;
  }

  if (now - record.firstAt > WINDOW_MS) {
    attempts.set(ip, { count: 1, firstAt: now, blockedAt: null });
    return;
  }

  record.count++;
  if (record.count >= MAX_ATTEMPTS) {
    record.blockedAt = now;
  }
}

export function resetAttempts(ip: string): void {
  attempts.delete(ip);
}
