import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const category  = searchParams.get('category')
  const difficulty = searchParams.get('difficulty')
  const search    = searchParams.get('search')
  const language  = searchParams.get('language')
  const page      = parseInt(searchParams.get('page') ?? '1')
  const limit     = 20

  let query = supabase
    .from('questions')
    .select(`
      *,
      categories(id, name, slug),
      question_tags(tags(id, name)),
      question_concepts(concepts(id, name))
    `, { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (category)   query = query.eq('category_id', category)
  if (difficulty) query = query.eq('difficulty', difficulty)
  if (language)   query = query.eq('language', language)

  if (search && search.trim()) {
    // Use full-text search via the generated fts column, fall back to ilike
    query = query.textSearch('fts', search.trim(), { type: 'plain', config: 'simple' })
  }

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data, total: count ?? 0, page })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { tag_ids = [], concept_ids = [], ...questionData } = body

  const { data: question, error } = await supabase
    .from('questions')
    .insert({ ...questionData, user_id: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (tag_ids.length > 0) {
    await supabase.from('question_tags').insert(
      tag_ids.map((tag_id: string) => ({ question_id: question.id, tag_id }))
    )
  }

  if (concept_ids.length > 0) {
    await supabase.from('question_concepts').insert(
      concept_ids.map((concept_id: string) => ({ question_id: question.id, concept_id }))
    )
  }

  return NextResponse.json(question, { status: 201 })
}
