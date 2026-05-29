import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { aiService } from '@/lib/ai/ai.service'
import { checkRateLimit, sanitizeError } from '@/lib/api/rate-limit'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const rl = await checkRateLimit('coding-hint')
  if (!rl.allowed) return rl.response

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const {
    problem_title,
    problem_description = '',
    code = '',
    language: codingLanguage = 'javascript',
    ui_language = 'en',
  } = body

  if (!problem_title?.trim()) {
    return NextResponse.json({ error: 'problem_title is required' }, { status: 400 })
  }

  try {
    const result = await aiService.generateCodingHint({
      problemTitle: problem_title,
      problemDescription: problem_description,
      code,
      codingLanguage,
      language: ui_language,
    })

    logger.info('Coding hint generated', { userId: user.id })
    return NextResponse.json(result)
  } catch (err) {
    logger.error('Coding hint failed', err, { userId: user.id })
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 })
  }
}
