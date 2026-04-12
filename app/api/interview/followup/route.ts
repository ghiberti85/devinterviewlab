import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { aiService } from '@/lib/ai/ai.service'
import { checkRateLimit, logUsage, validateTextInput, sanitizeError } from '@/lib/api/rate-limit'
import { ndjsonStream } from '@/lib/api/stream'

// Edge Runtime: 30 s timeout (vs 10 s for Node on Vercel Hobby)
export const runtime = 'edge'

export async function POST(request: NextRequest) {
  const rl = await checkRateLimit('followup')
  if (!rl.allowed) return rl.response

  const body = await request.json()
  const { type, language = 'pt' } = body

  if (type !== 'replica' && type !== 'treplica') {
    return NextResponse.json({ error: 'Tipo inválido.' }, { status: 400 })
  }

  // Validate the answer field before the stream starts so HTTP 400 works normally
  const rawAnswer = type === 'replica'
    ? (body.user_answer ?? '')
    : (body.followup_answer ?? '')

  const answerV = validateTextInput(rawAnswer, 'answer')
  if (!answerV.valid) return NextResponse.json({ error: answerV.error }, { status: 400 })

  const start = Date.now()

  return ndjsonStream(async (emit) => {
    emit({ status: 'thinking' })

    try {
      let result: unknown

      if (type === 'replica') {
        result = await aiService.generateFollowup({
          originalQuestion: String(body.original_question ?? '').slice(0, 500),
          userAnswer:       answerV.value,
          gaps:             Array.isArray(body.gaps) ? body.gaps.slice(0, 10) : [],
          language,
        })
      } else {
        result = await aiService.evaluateFollowup({
          originalQuestion: String(body.original_question ?? '').slice(0, 500),
          followupQuestion: String(body.followup_question ?? '').slice(0, 500),
          followupAnswer:   answerV.value,
          language,
        })
      }

      await logUsage({ userId: rl.userId, endpoint: 'followup', durationMs: Date.now() - start })
      emit({ status: 'complete', data: result })
    } catch (err) {
      await logUsage({ userId: rl.userId, endpoint: 'followup', status: 'error', durationMs: Date.now() - start })
      emit({ status: 'error', error: sanitizeError(err) })
    }
  })
}
