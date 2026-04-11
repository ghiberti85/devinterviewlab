import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const [
    { count: totalQuestions },
    { count: totalSessions },
    { data: sessions },
    { data: concepts },
    { data: evaluations },
    { data: recentSessions },
  ] = await Promise.all([
    supabase.from('questions').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('practice_history').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('practice_history').select('confidence, created_at').eq('user_id', user.id).gte('created_at', ninetyDaysAgo.toISOString()),
    supabase.from('concepts').select('*').eq('user_id', user.id).order('score', { ascending: true }).limit(5),
    supabase.from('ai_evaluations').select('score, question_id, questions(category_id, categories(id, name, slug))').eq('user_id', user.id),
    supabase.from('practice_history').select('*, questions(title)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
  ])

  const avgConfidence = sessions?.length
    ? sessions.reduce((acc, s) => acc + (s.confidence ?? 0), 0) / sessions.length
    : 0

  // Build heatmap (count per day)
  const heatmapMap: Record<string, number> = {}
  sessions?.forEach(s => {
    const date = s.created_at.split('T')[0]
    heatmapMap[date] = (heatmapMap[date] ?? 0) + 1
  })
  const heatmap = Object.entries(heatmapMap).map(([date, count]) => ({ date, count }))

  // Topic scores (avg score per category)
  const categoryScores: Record<string, { name: string; slug: string; total: number; count: number }> = {}
  evaluations?.forEach((e: any) => {
    const cat = e.questions?.categories
    if (cat && e.score !== null) {
      if (!categoryScores[cat.id]) categoryScores[cat.id] = { name: cat.name, slug: cat.slug, total: 0, count: 0 }
      categoryScores[cat.id].total += e.score
      categoryScores[cat.id].count += 1
    }
  })
  const topicScores = Object.entries(categoryScores).map(([id, v]) => ({
    category: { id, name: v.name, slug: v.slug },
    score: Math.round(v.total / v.count),
    count: v.count,
  }))

  return NextResponse.json({
    totalQuestions: totalQuestions ?? 0,
    totalSessions: totalSessions ?? 0,
    avgConfidence: Math.round(avgConfidence * 10) / 10,
    weakConcepts: (concepts ?? []).slice(0, 5).map(c => ({ concept: c, score: c.score })),
    topicScores,
    heatmap,
    recentSessions: recentSessions ?? [],
  })
}
