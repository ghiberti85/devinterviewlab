import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { aiService } from '@/lib/ai/ai.service'
import { checkRateLimit, logUsage, sanitizeError } from '@/lib/api/rate-limit'
import { logger } from '@/lib/logger'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('coding_sessions')
    .select('id, problem_title, language, score, time_spent_sec, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const rl = await checkRateLimit('coding')
  if (!rl.allowed) return rl.response

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { problem_title, problem_description, language: codingLanguage, code, time_spent_sec, timer_duration_sec, ui_language = 'pt' } = body

  if (!code?.trim()) return NextResponse.json({ error: 'Code is required' }, { status: 400 })
  if (!problem_title?.trim()) return NextResponse.json({ error: 'Problem title is required' }, { status: 400 })

  const start = Date.now()

  try {
    const evaluation = await aiService.evaluateCode({
      problemTitle: problem_title,
      problemDescription: problem_description ?? '',
      code,
      codingLanguage: codingLanguage ?? 'javascript',
      language: ui_language,
    })

    const { data, error } = await supabase
      .from('coding_sessions')
      .insert({
        user_id: user.id,
        problem_title,
        problem_description,
        language: codingLanguage ?? 'javascript',
        code,
        score: evaluation.score,
        feedback: evaluation.feedback,
        time_spent_sec,
        timer_duration_sec,
      })
      .select()
      .single()

    if (error) {
      logger.error('Failed to save coding session', error, { userId: user.id })
      return NextResponse.json({ error: 'Failed to save session' }, { status: 500 })
    }

    await logUsage({ userId: user.id, endpoint: 'coding', durationMs: Date.now() - start })
    return NextResponse.json({ session: data, evaluation }, { status: 201 })
  } catch (err) {
    logger.error('Coding evaluation failed', err, { userId: user.id })
    await logUsage({ userId: user.id, endpoint: 'coding', status: 'error', durationMs: Date.now() - start })
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 })
  }
}
