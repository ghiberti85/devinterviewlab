import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sanitizeError } from '@/lib/api/rate-limit'
import { logger } from '@/lib/logger'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { data, error } = await supabase
      .from('score_cards')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(data)
  } catch (err) {
    logger.error('score-card GET by id failed', err, { userId: user.id })
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { error } = await supabase
      .from('score_cards')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error
    logger.info('score card deleted', { userId: user.id, scoreCardId: id })
    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('score-card DELETE failed', err, { userId: user.id })
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 })
  }
}
