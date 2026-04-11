import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { validateFileBuffer } from '@/lib/file-validation'
import { logger } from '@/lib/logger'

async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const pdfParse = (await import('pdf-parse')).default
    const data = await pdfParse(buffer)
    return data.text ?? ''
  } catch (err) {
    logger.warn('pdf-parse failed to extract text', { error: String(err) })
    return ''
  }
}

// GET /api/documents
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('user_documents')
    .select('id, name, doc_type, file_size, keep_stored, created_at, updated_at')
    .eq('user_id', user.id)
    .order('doc_type', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {
    logger.error('Failed to list documents', error, { userId: user.id })
    return NextResponse.json({ error: 'Erro ao buscar documentos.' }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

// POST /api/documents
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData   = await request.formData()
  const file       = formData.get('file') as File | null
  const docType    = (formData.get('doc_type') as string) || 'other'
  const keepStored = formData.get('keep_stored') === 'true'

  if (!file || file.size === 0) {
    return NextResponse.json({ error: 'Arquivo não fornecido.' }, { status: 400 })
  }

  // Read buffer
  const buffer = Buffer.from(await file.arrayBuffer())

  // ── Magic bytes validation ────────────────────────────────────────────────
  const fileValidation = validateFileBuffer(buffer, file.type, 10 * 1024 * 1024)
  if (!fileValidation.valid) {
    logger.warn('File upload rejected', {
      userId:   user.id,
      fileName: file.name,
      mimeType: file.type,
      size:     file.size,
      reason:   fileValidation.error,
    })
    return NextResponse.json({ error: fileValidation.error }, { status: 400 })
  }

  // Extract text
  const textContent = await extractPdfText(buffer)
  if (!textContent.trim()) {
    return NextResponse.json(
      { error: 'Não foi possível extrair texto do arquivo. Verifique se não é um PDF escaneado (imagem).' },
      { status: 422 }
    )
  }

  logger.info('Document upload started', {
    userId:  user.id,
    docType,
    size:    file.size,
    chars:   textContent.length,
  })

  let filePath: string | null = null

  // Upload to Storage if CV or user wants to keep
  if (docType === 'cv' || keepStored) {
    const ext         = file.name.split('.').pop() ?? 'pdf'
    const storagePath = docType === 'cv'
      ? `${user.id}/cv.${ext}`
      : `${user.id}/${crypto.randomUUID()}.${ext}`

    // Remove old CV file if replacing
    if (docType === 'cv') {
      const { data: existing } = await supabase
        .from('user_documents')
        .select('file_path')
        .eq('user_id', user.id)
        .eq('doc_type', 'cv')
        .maybeSingle()

      if (existing?.file_path) {
        await supabase.storage.from('user-documents').remove([existing.file_path])
      }
    }

    const { error: storageError } = await supabase.storage
      .from('user-documents')
      .upload(storagePath, buffer, {
        contentType: file.type || 'application/pdf',
        upsert:      true,
      })

    if (storageError) {
      logger.error('Storage upload failed', storageError, { userId: user.id, storagePath })
      // Continue — text is still saved in DB even without storage
    } else {
      filePath = storagePath
    }
  }

  // ── DB upsert / insert ───────────────────────────────────────────────────
  if (docType === 'cv') {
    const { data: existing } = await supabase
      .from('user_documents')
      .select('id')
      .eq('user_id', user.id)
      .eq('doc_type', 'cv')
      .maybeSingle()

    let data, error

    if (existing) {
      ;({ data, error } = await supabase
        .from('user_documents')
        .update({
          name:         file.name,
          file_path:    filePath,
          text_content: textContent,
          file_size:    file.size,
          updated_at:   new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select('id, name, doc_type, file_size, keep_stored, created_at, updated_at')
        .single())
    } else {
      ;({ data, error } = await supabase
        .from('user_documents')
        .insert({
          user_id:      user.id,
          name:         file.name,
          doc_type:     'cv',
          file_path:    filePath,
          text_content: textContent,
          file_size:    file.size,
          keep_stored:  true,
        })
        .select('id, name, doc_type, file_size, keep_stored, created_at, updated_at')
        .single())
    }

    if (error) {
      logger.error('CV DB save failed', error, { userId: user.id })
      return NextResponse.json({ error: 'Erro ao salvar CV.' }, { status: 500 })
    }

    logger.info('CV saved', { userId: user.id, docId: data?.id })
    return NextResponse.json({ ...data, chars: textContent.length }, { status: 201 })
  }

  // Other document
  const { data, error } = await supabase
    .from('user_documents')
    .insert({
      user_id:      user.id,
      name:         file.name,
      doc_type:     'other',
      file_path:    filePath,
      text_content: textContent,
      file_size:    file.size,
      keep_stored:  keepStored,
    })
    .select('id, name, doc_type, file_size, keep_stored, created_at')
    .single()

  if (error) {
    logger.error('Document DB save failed', error, { userId: user.id })
    return NextResponse.json({ error: 'Erro ao salvar documento.' }, { status: 500 })
  }

  return NextResponse.json(
    { ...(keepStored ? data : { id: null, name: file.name, doc_type: 'other' }), text_content: textContent, chars: textContent.length },
    { status: 201 }
  )
}
