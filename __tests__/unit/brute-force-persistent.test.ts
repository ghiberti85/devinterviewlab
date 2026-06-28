import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- mock @supabase/supabase-js ---
const mockRpc = vi.fn()
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ rpc: mockRpc }),
}))

// Import AFTER the mock is set up
const { checkBruteForcePersistent, recordFailedAttemptPersistent, resetAttemptsPersistent } =
  await import('@/lib/api/brute-force-persistent')

const IP = '10.0.0.1'

beforeEach(() => {
  mockRpc.mockReset()
})

describe('checkBruteForcePersistent', () => {
  it('returns allowed=true when Supabase says allowed', async () => {
    mockRpc.mockResolvedValueOnce({ data: [{ allowed: true, retry_after_sec: null }], error: null })
    const result = await checkBruteForcePersistent(IP)
    expect(result.allowed).toBe(true)
    expect(mockRpc).toHaveBeenCalledWith('bf_check', { p_ip: IP })
  })

  it('returns allowed=false with retryAfterSec when Supabase says blocked', async () => {
    mockRpc.mockResolvedValueOnce({ data: [{ allowed: false, retry_after_sec: 540 }], error: null })
    const result = await checkBruteForcePersistent(IP)
    expect(result.allowed).toBe(false)
    expect(result.retryAfterSec).toBe(540)
  })

  it('falls back to in-memory (allow) when Supabase throws', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: new Error('db error') })
    const result = await checkBruteForcePersistent('5.5.5.5')
    expect(result.allowed).toBe(true)
  })

  it('returns 900 as default retryAfterSec when retry_after_sec is null and blocked', async () => {
    mockRpc.mockResolvedValueOnce({ data: [{ allowed: false, retry_after_sec: null }], error: null })
    const result = await checkBruteForcePersistent(IP)
    expect(result.allowed).toBe(false)
    expect(result.retryAfterSec).toBe(900)
  })
})

describe('recordFailedAttemptPersistent', () => {
  it('calls bf_record_failure RPC', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: null })
    await recordFailedAttemptPersistent(IP)
    expect(mockRpc).toHaveBeenCalledWith('bf_record_failure', { p_ip: IP })
  })

  it('does not throw when Supabase errors (fallback silently)', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: new Error('db error') })
    await expect(recordFailedAttemptPersistent(IP)).resolves.not.toThrow()
  })
})

describe('resetAttemptsPersistent', () => {
  it('calls bf_reset RPC', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: null })
    await resetAttemptsPersistent(IP)
    expect(mockRpc).toHaveBeenCalledWith('bf_reset', { p_ip: IP })
  })

  it('does not throw when Supabase errors (fallback silently)', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: new Error('db error') })
    await expect(resetAttemptsPersistent(IP)).resolves.not.toThrow()
  })
})

describe('in-memory fallback integration', () => {
  it('blocks after 10 failed attempts via fallback path', async () => {
    const testIp = '192.168.1.1'
    // Make all Supabase calls fail so we exercise the fallback
    mockRpc.mockResolvedValue({ data: null, error: new Error('db down') })

    // Record 10 failures
    for (let i = 0; i < 10; i++) {
      await recordFailedAttemptPersistent(testIp)
    }

    const result = await checkBruteForcePersistent(testIp)
    expect(result.allowed).toBe(false)
    expect(result.retryAfterSec).toBeGreaterThan(0)
  })
})
