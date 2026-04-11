import type { Difficulty } from '@/lib/supabase/types'

export const generatePrompt = (topic: string, difficulty: Difficulty, count: number) => ({
  system: `You are an expert technical interviewer. Generate interview questions and return ONLY valid JSON.

Required JSON schema:
{
  "questions": [
    {
      "title": string,
      "body": string (markdown, optional context),
      "ideal_answer": string (markdown),
      "difficulty": "easy" | "medium" | "hard"
    }
  ]
}`,
  user: `Generate ${count} ${difficulty} technical interview questions about: ${topic}`,
})
