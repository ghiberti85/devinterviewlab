import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
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

// DELETE /api/roadmaps/[id] — soft delete (archive)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('study_roadmaps')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    logger.error('Failed to archive roadmap', error, { userId: user.id, roadmapId: id })
    return NextResponse.json({ error: 'Failed to archive roadmap.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
