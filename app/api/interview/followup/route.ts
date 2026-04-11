import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { aiService } from '@/lib/ai/ai.service'
import { checkRateLimit, logUsage, validateTextInput, sanitizeError } from '@/lib/api/rate-limit'

export async function POST(request: NextRequest) {
  const rl = await checkRateLimit('followup')
  if (!rl.allowed) return rl.response

  const body = await request.json()
  const { type, language = 'pt' } = body

  const start = Date.now()
  try {
    if (type === 'replica') {
      const answerV = validateTextInput(body.user_answer ?? '', 'answer')
      if (!answerV.valid) return NextResponse.json({ error: answerV.error }, { status: 400 })

      const result = await aiService.generateFollowup({
        originalQuestion: String(body.original_question ?? '').slice(0, 500),
        userAnswer:       answerV.value,
        gaps:             Array.isArray(body.gaps) ? body.gaps.slice(0, 10) : [],
        language,
      })
      await logUsage({ userId: rl.userId, endpoint: 'followup', durationMs: Date.now() - start })
      return NextResponse.json(result)
    }

    if (type === 'treplica') {
      const answerV = validateTextInput(body.followup_answer ?? '', 'answer')
      if (!answerV.valid) return NextResponse.json({ error: answerV.error }, { status: 400 })

      const result = await aiService.evaluateFollowup({
        originalQuestion: String(body.original_question ?? '').slice(0, 500),
        followupQuestion: String(body.followup_question ?? '').slice(0, 500),
        followupAnswer:   answerV.value,
        language,
      })
      await logUsage({ userId: rl.userId, endpoint: 'followup', durationMs: Date.now() - start })
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: 'Tipo inválido.' }, { status: 400 })
  } catch (err) {
    await logUsage({ userId: rl.userId, endpoint: 'followup', status: 'error', durationMs: Date.now() - start })
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 })
  }
}
