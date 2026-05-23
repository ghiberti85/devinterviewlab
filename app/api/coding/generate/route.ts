import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { aiService } from '@/lib/ai/ai.service'
import { checkRateLimit, sanitizeError } from '@/lib/api/rate-limit'
import { logger } from '@/lib/logger'
import type { ProblemDifficulty } from '@/lib/ai/prompts/coding-generate.prompt'

const VALID_DIFFICULTIES: ProblemDifficulty[] = ['easy', 'medium', 'hard']

export async function POST(request: NextRequest) {
  const rl = await checkRateLimit('coding-generate')
  if (!rl.allowed) return rl.response

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const {
    difficulty = 'medium',
    topic = '',
    coding_language = 'javascript',
    ui_language = 'en',
  } = body

  if (!VALID_DIFFICULTIES.includes(difficulty)) {
    return NextResponse.json({ error: 'Invalid difficulty' }, { status: 400 })
  }

  try {
    const result = await aiService.generateCodingProblem({
      difficulty,
      topic: topic?.trim() || undefined,
      codingLanguage: coding_language,
      language: ui_language,
    })

    logger.info('Coding problem generated', { userId: user.id, difficulty, topic })
    return NextResponse.json(result)
  } catch (err) {
    logger.error('Coding problem generation failed', err, { userId: user.id })
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 })
  }
}
