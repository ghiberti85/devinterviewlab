import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { aiService } from '@/lib/ai/ai.service'
import { ndjsonStream } from '@/lib/api/stream'
import { sanitizeError } from '@/lib/api/rate-limit'

// Edge Runtime: 30 s timeout (vs 10 s for Node on Vercel Hobby)
export const runtime = 'edge'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { question_id, user_answer, language = 'en' } = await request.json()
  if (!question_id || !user_answer?.trim()) {
    return NextResponse.json(
      { error: 'question_id and user_answer are required' },
      { status: 400 }
    )
  }

  const { data: question, error: qErr } = await supabase
    .from('questions')
    .select('*')
    .eq('id', question_id)
    .eq('user_id', user.id)
    .single()

  if (qErr || !question) {
    return NextResponse.json({ error: 'Question not found' }, { status: 404 })
  }

  return ndjsonStream(async (emit) => {
    emit({ status: 'thinking' })

    try {
      const evaluation = await aiService.evaluateAnswer(question, user_answer, language)

      const { data, error } = await supabase
        .from('ai_evaluations')
        .insert({ ...evaluation, user_id: user.id })
        .select()
        .single()

      if (error) throw new Error(error.message)

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

      emit({ status: 'complete', data })
    } catch (err) {
      emit({ status: 'error', error: sanitizeError(err) })
    }
  })
}
