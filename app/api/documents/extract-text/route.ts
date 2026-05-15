import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateFileBuffer } from '@/lib/file-validation'

// Node.js runtime required for pdf-parse
// This route is intentionally kept minimal and fast (< 3s on typical CVs)
// to stay within Vercel Hobby's 10s limit.

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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file || file.size === 0) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const validation = validateFileBuffer(buffer, file.type, 10 * 1024 * 1024)
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  const text = await extractPdfText(buffer)
  return NextResponse.json({ text: text.slice(0, 50000) })
}
