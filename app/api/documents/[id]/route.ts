import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/documents/[id] — get document including text_content (for generation)
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Special case: 'cv' as id returns the user's CV
  const { data, error } = id === 'cv'
    ? await supabase.from('user_documents').select('*').eq('user_id', user.id).eq('doc_type', 'cv').maybeSingle()
    : await supabase.from('user_documents').select('*').eq('id', id).eq('user_id', user.id).maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 })
  return NextResponse.json(data)
}

// DELETE /api/documents/[id] — delete document and its storage file
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get file_path before deleting
  const { data: doc } = await supabase
    .from('user_documents')
    .select('file_path, doc_type')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!doc) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 })

  // Delete from storage if file exists
  if (doc.file_path) {
    await supabase.storage.from('user-documents').remove([doc.file_path])
  }

  // Delete from DB
  const { error } = await supabase
    .from('user_documents')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}

// PATCH /api/documents/[id] — update keep_stored
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { data, error } = await supabase
    .from('user_documents')
    .update({ keep_stored: body.keep_stored, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, name, keep_stored')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
