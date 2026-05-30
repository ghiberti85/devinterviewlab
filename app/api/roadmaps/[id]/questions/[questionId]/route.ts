import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { sanitizeError } from '@/lib/api/rate-limit'

// DELETE /api/roadmaps/[id]/questions/[questionId]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; questionId: string }> }
) {
  const { id, questionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('roadmap_questions')
    .delete()
    .eq('id', questionId)
    .eq('roadmap_id', id)
    .eq('user_id', user.id)

  if (error) {
    logger.error('Failed to delete roadmap question', error, { userId: user.id, roadmapId: id, questionId })
    return NextResponse.json({ error: sanitizeError(error) }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
