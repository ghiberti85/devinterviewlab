import { describe, it, expect } from 'vitest'
import { getRoadmapSystemPrompt, roadmapAnalysisPrompt } from '@/lib/ai/prompts/roadmap.prompt'

describe('getRoadmapSystemPrompt', () => {
  it('contains "English" when language is en', () => {
    const prompt = getRoadmapSystemPrompt('en')
    expect(prompt).toContain('English')
  })

  it('contains "Brazilian Portuguese" when language is pt', () => {
    const prompt = getRoadmapSystemPrompt('pt')
    expect(prompt).toContain('Brazilian Portuguese')
  })
})

describe('roadmapAnalysisPrompt', () => {
  it('truncates cvText to 3000 characters', () => {
    const longCV = 'A'.repeat(5000)
    const { user } = roadmapAnalysisPrompt({ cvText: longCV, jobDescription: 'Engineer role' })
    const cvSection = user.match(/## Candidate CV\n([\s\S]*?)\n\n## Job Description/)?.[1] ?? ''
    expect(cvSection.length).toBeLessThanOrEqual(3000)
  })

  it('truncates jobDescription to 2000 characters', () => {
    const longJD = 'B'.repeat(5000)
    const { user } = roadmapAnalysisPrompt({ jobDescription: longJD })
    const jdSection = user.match(/## Job Description\n([\s\S]*?)\n\n## Required JSON Schema/)?.[1] ?? ''
    expect(jdSection.length).toBeLessThanOrEqual(2000)
  })

  it('includes JSON schema keywords: phases, gap_analysis, match_score', () => {
    const { user } = roadmapAnalysisPrompt({ jobDescription: 'Some job description' })
    expect(user).toContain('phases')
    expect(user).toContain('gap_analysis')
    expect(user).toContain('match_score')
  })

  it('does not include CV section when cvText is not provided', () => {
    const { user } = roadmapAnalysisPrompt({ jobDescription: 'Some job description' })
    expect(user).not.toContain('## Candidate CV')
  })
})
