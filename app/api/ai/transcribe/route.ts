import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, logUsage, sanitizeError } from '@/lib/api/rate-limit'
import { logger } from '@/lib/logger'
import OpenAI from 'openai'

export async function POST(request: NextRequest) {
  const rl = await checkRateLimit('transcribe')
  if (!rl.allowed) return rl.response

  const formData = await request.formData()
  const audio    = formData.get('audio') as File | null
  const language = (formData.get('language') as string) || 'pt'

  if (!audio || audio.size === 0) {
    return NextResponse.json({ error: 'Áudio não fornecido.' }, { status: 400 })
  }

  // Size check: 25MB Whisper limit
  if (audio.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: 'Áudio muito grande. Máximo 25MB.' }, { status: 400 })
  }

  // Content-type check for audio
  const mime = audio.type || ''
  if (!mime.startsWith('audio/') && !mime.includes('webm') && !mime.includes('mp4') && !mime.includes('mpeg')) {
    return NextResponse.json({ error: 'Tipo de arquivo de áudio inválido.' }, { status: 400 })
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'Transcrição não configurada. Adicione OPENAI_API_KEY nas variáveis de ambiente.' },
      { status: 503 }
    )
  }

  const baseURL = process.env.OPENAI_BASE_URL
  const model   = baseURL?.includes('groq.com') ? 'whisper-large-v3-turbo' : 'whisper-1'

  const openai  = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL })

  const start = Date.now()
  try {
    const transcription = await openai.audio.transcriptions.create({
      file:     audio,
      model,
      language: language === 'pt' ? 'pt' : 'en',
    })

    await logUsage({ userId: rl.userId, endpoint: 'transcribe', durationMs: Date.now() - start })
    logger.info('Transcription success', { userId: rl.userId, chars: transcription.text.length, durationMs: Date.now() - start })

    return NextResponse.json({ transcript: transcription.text })
  } catch (err) {
    await logUsage({ userId: rl.userId, endpoint: 'transcribe', status: 'error', durationMs: Date.now() - start })
    logger.error('Transcription failed', err, { userId: rl.userId })
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 })
  }
}
