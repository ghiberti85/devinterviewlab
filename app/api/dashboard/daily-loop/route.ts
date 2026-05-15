import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { DailyLoopData } from '@/lib/supabase/types'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]

  // Fetch activity dates from practice_history (last 60 days is enough for streak)
  const since = new Date(today)
  since.setDate(since.getDate() - 60)

  const [historyRes, conceptsRes, dueCardsRes] = await Promise.all([
    supabase
      .from('practice_history')
      .select('created_at')
      .eq('user_id', user.id)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false }),

    supabase
      .from('concepts')
      .select('id, name, score')
      .eq('user_id', user.id)
      .order('score', { ascending: true })
      .limit(1),

    supabase
      .from('practice_history')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .lte('next_review_at', new Date().toISOString()),
  ])

  // Compute streak from distinct activity dates
  const activityDates = new Set(
    (historyRes.data ?? []).map(r => r.created_at.split('T')[0])
  )
  const todayActive = activityDates.has(todayStr)

  let streak = 0
  const cursor = new Date(today)
  // If no activity today, start streak check from yesterday
  if (!todayActive) cursor.setDate(cursor.getDate() - 1)

  while (true) {
    const dateStr = cursor.toISOString().split('T')[0]
    if (!activityDates.has(dateStr)) break
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }

  const weakConcept = conceptsRes.data?.[0]
    ? { id: conceptsRes.data[0].id, name: conceptsRes.data[0].name, score: conceptsRes.data[0].score }
    : null

  const result: DailyLoopData = {
    streak,
    todayActive,
    weakestConcept: weakConcept,
    dueFlashcardsCount: dueCardsRes.count ?? 0,
  }

  return NextResponse.json(result)
}
