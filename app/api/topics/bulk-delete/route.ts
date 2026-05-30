import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sanitizeError } from '@/lib/api/rate-limit'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { ids } = body
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids must be a non-empty array' }, { status: 400 })
  }

  const { error, count } = await supabase
    .from('topics')
    .delete({ count: 'exact' })
    .in('id', ids)
    .eq('user_id', user.id)

  if (error) {
    logger.error('Failed to bulk delete topics', error, { userId: user.id })
    return NextResponse.json({ error: sanitizeError(error) }, { status: 500 })
  }

  return NextResponse.json({ deleted: count ?? ids.length })
}
