import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { computeNextReview } from '@/lib/services/spaced-repetition.service'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('mode') ?? 'random'
  const limit = parseInt(searchParams.get('limit') ?? '10')
  const categoryId = searchParams.get('category_id')

  let query = supabase
    .from('questions')
    .select(`*, categories(id,name,slug), question_tags(tags(id,name))`)
    .eq('user_id', user.id)
    .limit(limit)

  if (categoryId) query = query.eq('category_id', categoryId)

  if (mode === 'spaced') {
    // Return questions due for review (next_review_at <= now or never reviewed)
    const { data: dueSessions } = await supabase
      .from('practice_history')
      .select('question_id')
      .eq('user_id', user.id)
      .lte('next_review_at', new Date().toISOString())
      .order('next_review_at', { ascending: true })
      .limit(limit)

    const dueIds = dueSessions?.map(s => s.question_id).filter(Boolean) as string[]

    if (dueIds.length > 0) {
      query = supabase
        .from('questions')
        .select(`*, categories(id,name,slug), question_tags(tags(id,name))`)
        .eq('user_id', user.id)
        .in('id', dueIds)
    }
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Shuffle for random mode
  const shuffled = mode === 'random'
    ? [...(data ?? [])].sort(() => Math.random() - 0.5)
    : data ?? []

  return NextResponse.json(shuffled)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { question_id, session_type, confidence, duration_sec } = body

  const next_review_at = computeNextReview(confidence).toISOString()

  const { data, error } = await supabase
    .from('practice_history')
    .insert({
      user_id: user.id,
      question_id,
      session_type,
      confidence,
      duration_sec,
      next_review_at,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
