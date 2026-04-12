import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { aiService } from '@/lib/ai/ai.service'
import { checkRateLimit, logUsage, validateTextInput, sanitizeError } from '@/lib/api/rate-limit'
import { ndjsonStream } from '@/lib/api/stream'
import type { Difficulty } from '@/lib/supabase/types'

// NOTE: Cannot use Edge Runtime here because pdf-parse requires Node.js APIs.
// The 10 s Vercel Hobby timeout applies. For contexts without a temp file
// (i.e. using a saved CV + text context), Groq typically responds in < 10 s.
// Full fix: Vercel Pro (60 s limit) or splitting PDF extraction into a
// separate Node route while keeping the AI call on Edge.

async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const pdfParse = (await import('pdf-parse')).default
    const data = await pdfParse(buffer)
    return data.text ?? ''
  } catch {
    return ''
  }
}

export async function POST(request: NextRequest) {
  const rl = await checkRateLimit('generate')
  if (!rl.allowed) return rl.response

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData    = await request.formData()
  const rawContext  = (formData.get('context') as string) ?? ''
  const difficulty  = (formData.get('difficulty') as Difficulty | 'mixed') ?? 'mixed'
  const count       = Math.min(Math.max(1, parseInt(formData.get('count') as string ?? '5')), 15)
  const categoryName= (formData.get('category_name') as string) || undefined
  const isBehavioral= formData.get('is_behavioral') === 'true'
  const language    = (formData.get('language') as string) || 'pt'

  const ctxValidation = validateTextInput(rawContext, 'context')
  const context = ctxValidation.valid ? ctxValidation.value : ''

  // Load saved CV
  let cvText: string | undefined
  const { data: savedCv } = await supabase
    .from('user_documents')
    .select('text_content')
    .eq('user_id', user.id)
    .eq('doc_type', 'cv')
    .single()
  if (savedCv?.text_content) cvText = savedCv.text_content

  // Load selected saved docs
  const savedDocIds = (formData.get('saved_doc_ids') as string ?? '')
    .split(',').map(s => s.trim()).filter(Boolean)
  let extraSavedText = ''
  if (savedDocIds.length > 0) {
    const { data: savedDocs } = await supabase
      .from('user_documents')
      .select('text_content, name')
      .eq('user_id', user.id)
      .in('id', savedDocIds)
    if (savedDocs?.length) {
      extraSavedText = savedDocs
        .map(d => `=== ${d.name} ===\n${d.text_content}`)
        .join('\n\n')
    }
  }

  // Extract temp file text (requires Node.js — blocks Edge migration)
  let tempFileText = ''
  const tempFile = formData.get('temp_file') as File | null
  if (tempFile && tempFile.size > 0 && tempFile.size <= 10 * 1024 * 1024) {
    const buffer = Buffer.from(await tempFile.arrayBuffer())
    tempFileText = await extractPdfText(buffer)
  }

  const combinedContext = [extraSavedText, tempFileText, context].filter(Boolean).join('\n\n')

  if (!cvText && !combinedContext.trim()) {
    return NextResponse.json(
      { error: 'Faça upload do CV ou adicione contexto para gerar questões.' },
      { status: 400 }
    )
  }

  const start = Date.now()

  return ndjsonStream(async (emit) => {
    emit({ status: 'thinking' })

    try {
      const result = await aiService.generateFromContext({
        context: combinedContext, cvText, difficulty, count,
        categoryName, isBehavioral, language,
      })
      await logUsage({ userId: rl.userId, endpoint: 'generate', durationMs: Date.now() - start })
      emit({ status: 'complete', data: result })
    } catch (err) {
      await logUsage({ userId: rl.userId, endpoint: 'generate', status: 'error', durationMs: Date.now() - start })
      emit({ status: 'error', error: sanitizeError(err) })
    }
  })
}
