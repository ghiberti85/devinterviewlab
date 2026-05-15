export type Difficulty = 'easy' | 'medium' | 'hard'
export type SessionType = 'flashcard' | 'random' | 'simulation'
export type RelationType = 'requires' | 'related' | 'part_of'
export type Language = 'en' | 'pt'

export interface Profile {
  id: string
  username: string | null
  preferred_language: Language
  created_at: string
}

export interface Category {
  id: string
  name: string
  slug: string
}

export interface Tag {
  id: string
  name: string
}

export interface Question {
  id: string
  user_id: string
  category_id: string | null
  title: string
  body: string | null
  ideal_answer: string | null
  difficulty: Difficulty
  is_behavioral: boolean
  language: Language
  created_at: string
  updated_at: string
  categories?: Category
  question_tags?: { tags: Tag }[]
  question_concepts?: { concepts: Concept }[]
}

export interface Concept {
  id: string
  user_id: string
  name: string
  description: string | null
  score: number
  created_at: string
}

export interface ConceptRelation {
  id: string
  source_id: string
  target_id: string
  relation_type: RelationType
}

export interface PracticeSession {
  id: string
  user_id: string
  question_id: string | null
  session_type: SessionType
  confidence: 1 | 2 | 3 | 4 | 5
  duration_sec: number
  next_review_at: string | null
  created_at: string
}

export interface STARAnalysis {
  situation: { detected: boolean; score: number; notes: string }
  task:      { detected: boolean; score: number; notes: string }
  action:    { detected: boolean; score: number; notes: string }
  result:    { detected: boolean; score: number; notes: string }
}

export interface ScoreBreakdown {
  correctness: number
  completeness: number
  clarity: number
  depth: number
}

export interface EvaluationFeedback {
  strengths: string[]
  gaps: string[]
  suggestions: string[]
  star_analysis?: STARAnalysis
  score_breakdown: ScoreBreakdown
  missing_concepts: string[]
}

export interface AIEvaluation {
  id: string
  user_id: string
  question_id: string | null
  user_answer: string
  transcript: string | null
  score: number
  feedback: EvaluationFeedback
  missing_concepts: string[]
  model_used: string
  prompt_version: string
  created_at: string
  questions?: Pick<Question, 'title' | 'difficulty'>
}

export interface CodeEvaluationFeedback {
  time_complexity: string
  space_complexity: string
  issues: string[]
  suggestions: string[]
  verdict: string
  process_feedback?: string
}

export interface CodingSession {
  id: string
  user_id: string
  problem_title: string
  problem_description: string | null
  language: string
  code: string
  score: number | null
  feedback: CodeEvaluationFeedback | null
  time_spent_sec: number | null
  timer_duration_sec: number | null
  hints_requested: number
  hints_shown: number
  idle_pauses: number
  created_at: string
}

export interface DailyLoopData {
  streak: number
  todayActive: boolean
  weakestConcept: { id: string; name: string; score: number } | null
  dueFlashcardsCount: number
}

export interface ScoreCard {
  id: string
  user_id: string
  session_label: string | null
  evaluation_ids: string[]
  overall_score: number
  radar: { correctness: number; completeness: number; clarity: number; depth: number }
  strengths: string[]
  gaps: string[]
  missing_concepts: string[]
  recommendation: string | null
  created_at: string
}

export interface RoadmapTopic {
  name: string
  priority: 1 | 2 | 3
  question_count: number
}
export interface RoadmapPhase {
  label: string
  topics: RoadmapTopic[]
}
export interface GapAnalysis {
  match_score: number
  matched_skills: string[]
  missing_skills: string[]
  summary: string
}
export interface StudyRoadmap {
  id: string
  user_id: string
  job_title: string | null
  job_description: string | null
  cv_text_snapshot: string | null
  gap_analysis: GapAnalysis
  roadmap: { phases: RoadmapPhase[] }
  status: 'active' | 'completed' | 'archived'
  created_at: string
  updated_at: string
  progress?: RoadmapTopicProgress[]
}
export interface RoadmapTopicProgress {
  id: string
  roadmap_id: string
  user_id: string
  topic_name: string
  questions_done: number
  questions_goal: number
  last_practiced_at: string | null
  created_at: string
}

export interface TopicQuickQA {
  q: string
  a: string
}

export interface Topic {
  id: string
  user_id: string
  category_id: string | null
  title: string
  difficulty: 'easy' | 'medium' | 'hard'
  summary: string
  when_to_use: string | null
  code_snippet: string | null
  quick_qa: TopicQuickQA[]
  tags: string[]
  language: 'en' | 'pt'
  translated_from: string | null
  created_at: string
  // computed by API — true when a translation already exists in the DB
  has_translation?: boolean
}

export interface AnalyticsData {
  totalQuestions: number
  totalSessions: number
  avgConfidence: number
  weakConcepts: { concept: Concept; score: number }[]
  topicScores: { category: Category; score: number; count: number }[]
  heatmap: { date: string; count: number }[]
  recentSessions: (PracticeSession & { questions: Pick<Question, 'title'> | null })[]
}
