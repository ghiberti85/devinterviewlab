import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { aiService } from '@/lib/ai/ai.service'
import { checkRateLimit, logUsage, validateTextInput, sanitizeError } from '@/lib/api/rate-limit'
import { ndjsonStream } from '@/lib/api/stream'

// Edge Runtime: 30 s timeout (vs 10 s for Node on Vercel Hobby)
export const runtime = 'edge'

export async function POST(request: NextRequest) {
  // 1. Rate limit check
  const rl = await checkRateLimit('evaluate')
  if (!rl.allowed) return rl.response

  // 2. Parse + validate input before stream (keeps HTTP 400 working normally)
  const body = await request.json()
  const answerValidation = validateTextInput(body.user_answer, 'answer')
  if (!answerValidation.valid) {
    return NextResponse.json({ error: answerValidation.error }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { question_id, language = 'pt' } = body

  // 3. Fetch question (RLS ensures the user owns it)
  const { data: question, error: qErr } = await supabase
    .from('questions')
    .select('*')
    .eq('id', question_id)
    .single()

  if (qErr || !question) {
    return NextResponse.json({ error: 'Questão não encontrada.' }, { status: 404 })
  }

  const start = Date.now()

  return ndjsonStream(async (emit) => {
    emit({ status: 'thinking' })

    try {
      const evaluation = await aiService.evaluateAnswer(
        question,
        answerValidation.value,
        language
      )

      const { data: saved } = await supabase.from('ai_evaluations').insert({
        user_id:          user.id,
        question_id,
        user_answer:      answerValidation.value,
        score:            evaluation.score,
        feedback:         evaluation.feedback,
        missing_concepts: evaluation.missing_concepts,
        model_used:       evaluation.model_used,
        prompt_version:   evaluation.prompt_version,
      }).select().single()

      await logUsage({ userId: rl.userId, endpoint: 'evaluate', durationMs: Date.now() - start })
      emit({ status: 'complete', data: { ...evaluation, id: saved?.id } })
    } catch (err) {
      await logUsage({ userId: rl.userId, endpoint: 'evaluate', status: 'error', durationMs: Date.now() - start })
      emit({ status: 'error', error: sanitizeError(err) })
    }
  })
}
