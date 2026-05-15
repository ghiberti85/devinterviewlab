import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

// PATCH /api/roadmaps/[id]/progress
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: roadmapId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { topic_name, increment = 1 } = body as { topic_name?: string; increment?: number }

  if (!topic_name) {
    return NextResponse.json({ error: 'topic_name is required.' }, { status: 400 })
  }

  // Fetch the current progress row
  const { data: row, error: fetchError } = await supabase
    .from('roadmap_topic_progress')
    .select('*')
    .eq('roadmap_id', roadmapId)
    .eq('topic_name', topic_name)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !row) {
    return NextResponse.json({ error: 'Progress record not found.' }, { status: 404 })
  }

  const newDone = Math.min(row.questions_done + increment, row.questions_goal)

  const { data: updated, error: updateError } = await supabase
    .from('roadmap_topic_progress')
    .update({
      questions_done: newDone,
      last_practiced_at: new Date().toISOString(),
    })
    .eq('id', row.id)
    .eq('user_id', user.id)
    .select('*')
    .single()

  if (updateError) {
    logger.error('Failed to update topic progress', updateError, { userId: user.id, roadmapId })
    return NextResponse.json({ error: 'Failed to update progress.' }, { status: 500 })
  }

  // Check if all topics are done → complete the roadmap
  const { data: allProgress } = await supabase
    .from('roadmap_topic_progress')
    .select('questions_done, questions_goal')
    .eq('roadmap_id', roadmapId)
    .eq('user_id', user.id)

  if (allProgress && allProgress.every((p) => p.questions_done >= p.questions_goal)) {
    await supabase
      .from('study_roadmaps')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', roadmapId)
      .eq('user_id', user.id)
  }

  return NextResponse.json(updated)
}
