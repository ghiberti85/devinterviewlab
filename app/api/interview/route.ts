import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { aiService } from '@/lib/ai/ai.service'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { question_id, user_answer, language = 'en' } = await request.json()
  if (!question_id || !user_answer?.trim()) {
    return NextResponse.json({ error: 'question_id and user_answer are required' }, { status: 400 })
  }

  const { data: question, error: qErr } = await supabase
    .from('questions')
    .select('*')
    .eq('id', question_id)
    .eq('user_id', user.id)
    .single()

  if (qErr || !question) return NextResponse.json({ error: 'Question not found' }, { status: 404 })

  const evaluation = await aiService.evaluateAnswer(question, user_answer, language)

  const { data, error } = await supabase
    .from('ai_evaluations')
    .insert({ ...evaluation, user_id: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Downgrade concept scores for detected gaps
  if (evaluation.missing_concepts.length > 0) {
    const { data: concepts } = await supabase
      .from('concepts')
      .select('id, name, score')
      .eq('user_id', user.id)
      .in('name', evaluation.missing_concepts)

    if (concepts) {
      for (const concept of concepts) {
        await supabase
          .from('concepts')
          .update({ score: Math.max(0, concept.score - 5) })
          .eq('id', concept.id)
      }
    }
  }

  return NextResponse.json(data, { status: 201 })
}
