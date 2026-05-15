import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { language } = body

  if (language !== 'en' && language !== 'pt') {
    return NextResponse.json({ error: 'Invalid language' }, { status: 400 })
  }

  const { error } = await supabase
    .from('profiles')
    .update({ preferred_language: language })
    .eq('id', user.id)

  if (error) {
    logger.error('Failed to update preferred_language', error, { userId: user.id })
    return NextResponse.json({ error: 'Failed to update language' }, { status: 500 })
  }

  return NextResponse.json({ language })
}
