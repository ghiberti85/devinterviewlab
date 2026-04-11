import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('questions')
    .select(`*, categories(id,name,slug), question_tags(tags(id,name)), question_concepts(concepts(id,name))`)
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { tag_ids, concept_ids, ...questionData } = body

  const { data, error } = await supabase
    .from('questions')
    .update({ ...questionData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (tag_ids !== undefined) {
    await supabase.from('question_tags').delete().eq('question_id', id)
    if (tag_ids.length > 0) {
      await supabase.from('question_tags').insert(
        tag_ids.map((tag_id: string) => ({ question_id: id, tag_id }))
      )
    }
  }

  if (concept_ids !== undefined) {
    await supabase.from('question_concepts').delete().eq('question_id', id)
    if (concept_ids.length > 0) {
      await supabase.from('question_concepts').insert(
        concept_ids.map((concept_id: string) => ({ question_id: id, concept_id }))
      )
    }
  }

  return NextResponse.json(data)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('questions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
