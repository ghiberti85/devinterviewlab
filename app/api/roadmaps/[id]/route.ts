import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { sanitizeError } from '@/lib/api/rate-limit'
import type { StudyRoadmap } from '@/lib/supabase/types'

// GET /api/roadmaps/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: roadmap, error } = await supabase
    .from('study_roadmaps')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !roadmap) {
    return NextResponse.json({ error: 'Roadmap not found.' }, { status: 404 })
  }

  const { data: progress } = await supabase
    .from('roadmap_topic_progress')
    .select('*')
    .eq('roadmap_id', id)
    .eq('user_id', user.id)

  return NextResponse.json({ ...roadmap, progress: progress ?? [] } satisfies StudyRoadmap)
}

// DELETE /api/roadmaps/[id] — hard delete: roadmap + questions + related topics
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch the roadmap to extract topic names for concept cleanup
  const { data: roadmap, error: fetchError } = await supabase
    .from('study_roadmaps')
    .select('roadmap, user_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !roadmap) {
    return NextResponse.json({ error: 'Roadmap not found.' }, { status: 404 })
  }

  const topicNames: string[] = (roadmap.roadmap?.phases ?? [])
    .flatMap((p: { topics: { name: string }[] }) => p.topics.map((t: { name: string }) => t.name))

  try {
    // 1. Delete roadmap questions (linked by roadmap_id)
    await supabase
      .from('roadmap_questions')
      .delete()
      .eq('roadmap_id', id)
      .eq('user_id', user.id)

    // 2. Delete progress records (linked by roadmap_id)
    await supabase
      .from('roadmap_topic_progress')
      .delete()
      .eq('roadmap_id', id)
      .eq('user_id', user.id)

    // 3. Delete Flash Topics whose title matches a roadmap topic name
    if (topicNames.length > 0) {
      // Supabase doesn't support OR ilike in .in(), so fetch matching IDs first
      const { data: matchingTopics } = await supabase
        .from('topics')
        .select('id')
        .eq('user_id', user.id)
        .in('title', topicNames)

      if (matchingTopics && matchingTopics.length > 0) {
        const ids = matchingTopics.map((t: { id: string }) => t.id)
        await supabase.from('topics').delete().in('id', ids).eq('user_id', user.id)
      }
    }

    // 4. Hard delete the roadmap itself
    const { error: deleteError } = await supabase
      .from('study_roadmaps')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (deleteError) throw deleteError

    logger.info('Roadmap deleted', { userId: user.id, roadmapId: id, topicNames: topicNames.length })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    logger.error('Failed to delete roadmap', err, { userId: user.id, roadmapId: id })
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 })
  }
}
