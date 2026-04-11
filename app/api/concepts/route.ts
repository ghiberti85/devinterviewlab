import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: nodes }, { data: edges }] = await Promise.all([
    supabase.from('concepts').select('*').eq('user_id', user.id).order('name'),
    supabase
      .from('concept_relations')
      .select('*')
      .in(
        'source_id',
        supabase.from('concepts').select('id').eq('user_id', user.id)
      ),
  ])

  return NextResponse.json({ nodes: nodes ?? [], edges: edges ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  // Creating a relation
  if (body.source_id && body.target_id) {
    const { data, error } = await supabase
      .from('concept_relations')
      .insert(body)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  }

  // Creating a concept
  const { data, error } = await supabase
    .from('concepts')
    .insert({ ...body, user_id: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
