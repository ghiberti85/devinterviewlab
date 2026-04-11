import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { aiService } from '@/lib/ai/ai.service'
import { checkRateLimit, logUsage, validateTextInput, sanitizeError } from '@/lib/api/rate-limit'

export async function POST(request: NextRequest) {
  // 1. Rate limit check
  const rl = await checkRateLimit('evaluate')
  if (!rl.allowed) return rl.response

  // 2. Parse + validate input
  const body = await request.json()
  const answerValidation = validateTextInput(body.user_answer, 'answer')
  if (!answerValidation.valid) {
    return NextResponse.json({ error: answerValidation.error }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { question_id, language = 'pt' } = body

  // 3. Fetch question (RLS ensures user owns it or it exists)
  const { data: question, error: qErr } = await supabase
    .from('questions')
    .select('*')
    .eq('id', question_id)
    .single()

  if (qErr || !question) {
    return NextResponse.json({ error: 'Questão não encontrada.' }, { status: 404 })
  }

  const start = Date.now()
  try {
    const evaluation = await aiService.evaluateAnswer(question, answerValidation.value, language)

    // 4. Persist to DB
    const { data: saved } = await supabase.from('ai_evaluations').insert({
      user_id:       user.id,
      question_id:   question_id,
      user_answer:   answerValidation.value,
      score:         evaluation.score,
      feedback:      evaluation.feedback,
      missing_concepts: evaluation.missing_concepts,
      model_used:    evaluation.model_used,
      prompt_version: evaluation.prompt_version,
    }).select().single()

    await logUsage({ userId: rl.userId, endpoint: 'evaluate', durationMs: Date.now() - start })

    return NextResponse.json({ ...evaluation, id: saved?.id })
  } catch (err) {
    await logUsage({ userId: rl.userId, endpoint: 'evaluate', status: 'error', durationMs: Date.now() - start })
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 })
  }
}
