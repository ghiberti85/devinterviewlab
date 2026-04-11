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
  score: number
  feedback: EvaluationFeedback
  missing_concepts: string[]
  model_used: string
  prompt_version: string
  created_at: string
  questions?: Pick<Question, 'title' | 'difficulty'>
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
