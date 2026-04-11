import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export const DAILY_LIMITS: Record<string, number> = {
  evaluate:   50,
  generate:   20,
  transcribe: 30,
  followup:   40,
}

export async function checkRateLimit(endpoint: string): Promise<
  { allowed: true; userId: string } |
  { allowed: false; response: NextResponse }
> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return {
      allowed: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const limit = DAILY_LIMITS[endpoint]
  if (!limit) return { allowed: true, userId: user.id }

  const { data, error } = await supabase.rpc('get_user_daily_usage', {
    p_user_id: user.id,
    p_endpoint: endpoint,
  })

  if (error) {
    logger.warn('Rate limit quota check failed — allowing request', {
      userId: user.id, endpoint, error: error.message,
    })
    return { allowed: true, userId: user.id }
  }

  const used = (data as number) ?? 0

  if (used >= limit) {
    logger.info('Rate limit reached', { userId: user.id, endpoint, used, limit })
    return {
      allowed: false,
      response: NextResponse.json(
        { error: `Limite diário de ${limit} chamadas para "${endpoint}" atingido. Tente amanhã.`, limit, used },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit':     String(limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset':     getNextMidnightUTC(),
            'Retry-After':           String(secondsUntilMidnightUTC()),
          },
        }
      ),
    }
  }

  return { allowed: true, userId: user.id }
}

export async function logUsage(opts: {
  userId:     string
  endpoint:   string
  tokensEst?: number
  durationMs?: number
  status?:    'ok' | 'error' | 'rate_limited'
}) {
  try {
    const supabase = await createClient()
    await supabase.from('usage_logs').insert({
      user_id:     opts.userId,
      endpoint:    opts.endpoint,
      tokens_est:  opts.tokensEst,
      duration_ms: opts.durationMs,
      status:      opts.status ?? 'ok',
    })
  } catch (err) {
    logger.error('Failed to log usage', err, { endpoint: opts.endpoint, userId: opts.userId })
  }
}

export function validateTextInput(
  value: unknown,
  field: 'answer' | 'context' | 'question' | 'body'
): { valid: true; value: string } | { valid: false; error: string } {
  const LIMITS = { answer: 50_000, context: 8_000, question: 500, body: 20_000 }

  if (typeof value !== 'string') {
    return { valid: false, error: `Campo "${field}" deve ser texto.` }
  }
  const limit = LIMITS[field]
  if (value.length > limit) {
    return {
      valid: false,
      error: `Campo "${field}" excede ${limit.toLocaleString()} caracteres.`,
    }
  }
  return { valid: true, value: value.trim() }
}

export function sanitizeError(err: unknown): string {
  if (process.env.NODE_ENV === 'development') {
    return err instanceof Error ? err.message : String(err)
  }
  if (err instanceof Error) {
    if (err.message.includes('rate limit') || err.message.includes('quota')) {
      return 'Serviço de IA temporariamente indisponível. Tente novamente em instantes.'
    }
    if (err.message.includes('timeout')) {
      return 'Requisição demorou muito. Tente com menos questões.'
    }
  }
  return 'Erro interno. Tente novamente.'
}

function getNextMidnightUTC(): string {
  const d = new Date()
  d.setUTCHours(24, 0, 0, 0)
  return d.toISOString()
}

function secondsUntilMidnightUTC(): number {
  const now      = Date.now()
  const midnight = new Date()
  midnight.setUTCHours(24, 0, 0, 0)
  return Math.floor((midnight.getTime() - now) / 1000)
}
