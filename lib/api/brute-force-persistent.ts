import { createClient } from '@supabase/supabase-js'

const MAX_ATTEMPTS = 10
const WINDOW_MS = 15 * 60 * 1000
const BLOCK_MS = 15 * 60 * 1000

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

// --- in-memory fallback (same logic as brute-force.ts) ---

interface AttemptRecord {
  count: number
  firstAt: number
  blockedAt: number | null
}

const fallback = new Map<string, AttemptRecord>()

function checkFallback(ip: string): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now()
  const record = fallback.get(ip)
  if (!record) return { allowed: true }

  if (record.blockedAt !== null) {
    const elapsed = now - record.blockedAt
    if (elapsed < BLOCK_MS) {
      return { allowed: false, retryAfterSec: Math.ceil((BLOCK_MS - elapsed) / 1000) }
    }
    fallback.delete(ip)
    return { allowed: true }
  }

  if (now - record.firstAt > WINDOW_MS) {
    fallback.delete(ip)
    return { allowed: true }
  }

  if (record.count >= MAX_ATTEMPTS) {
    record.blockedAt = now
    return { allowed: false, retryAfterSec: Math.ceil(BLOCK_MS / 1000) }
  }

  return { allowed: true }
}

function recordFallback(ip: string): void {
  const now = Date.now()
  const record = fallback.get(ip)
  if (!record) {
    fallback.set(ip, { count: 1, firstAt: now, blockedAt: null })
    return
  }
  if (now - record.firstAt > WINDOW_MS) {
    fallback.set(ip, { count: 1, firstAt: now, blockedAt: null })
    return
  }
  record.count++
  if (record.count >= MAX_ATTEMPTS) record.blockedAt = now
}

// --- public API ---

export async function checkBruteForcePersistent(
  ip: string,
): Promise<{ allowed: boolean; retryAfterSec?: number }> {
  try {
    const { data, error } = await getSupabase().rpc('bf_check', { p_ip: ip })
    if (error) throw error
    const rows = data as Array<{ allowed: boolean; retry_after_sec: number | null }>
    const row = rows?.[0]
    if (!row) return { allowed: true }
    return row.allowed
      ? { allowed: true }
      : { allowed: false, retryAfterSec: row.retry_after_sec ?? 900 }
  } catch {
    return checkFallback(ip)
  }
}

export async function recordFailedAttemptPersistent(ip: string): Promise<void> {
  try {
    const { error } = await getSupabase().rpc('bf_record_failure', { p_ip: ip })
    if (error) throw error
  } catch {
    recordFallback(ip)
  }
}

export async function resetAttemptsPersistent(ip: string): Promise<void> {
  try {
    const { error } = await getSupabase().rpc('bf_reset', { p_ip: ip })
    if (error) throw error
  } catch {
    fallback.delete(ip)
  }
}
