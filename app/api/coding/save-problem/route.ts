import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sanitizeError } from '@/lib/api/rate-limit'
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { problem_title?: string; problem_description?: string; language?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { problem_title, problem_description, language } = body

  if (!problem_title || typeof problem_title !== 'string' || problem_title.trim().length === 0) {
    return NextResponse.json({ error: 'problem_title is required' }, { status: 400 })
  }
  if (problem_title.trim().length > 500) {
    return NextResponse.json({ error: 'problem_title must be 500 characters or fewer' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('coding_sessions')
    .insert({
      user_id: user.id,
      problem_title: problem_title.trim(),
      problem_description: problem_description ?? null,
      language: language ?? 'javascript',
      code: '',
      score: null,
      time_spent_sec: 0,
      timer_duration_sec: null,
      hints_requested: 0,
      hints_shown: 0,
      idle_pauses: 0,
    })
    .select()
    .single()

  if (error) {
    logger.error('save-problem: insert failed', error, { userId: user.id })
    return NextResponse.json({ error: sanitizeError(error) }, { status: 500 })
  }

  logger.info('save-problem: session saved', { userId: user.id, sessionId: data.id })
  return NextResponse.json(data, { status: 201 })
}
