export function getRoadmapSystemPrompt(language = 'en'): string {
  const lang = language === 'pt' ? 'Brazilian Portuguese' : 'English'
  return `You are a senior technical career coach with 20 years of experience helping software engineers land their dream jobs. You specialize in gap analysis and creating actionable study roadmaps.

Respond in ${lang}.

Your task is to analyze a candidate's CV against a job description, identify skill gaps, and produce a structured 30/60/90-day study roadmap.

CRITICAL RULES:
- Return ONLY valid JSON — no markdown, no code fences, no explanations outside JSON
- The JSON must strictly follow the schema provided by the user
- Keep roadmap practical: 3–5 topics per phase, prioritized by impact
- priority: 1 = critical (must know), 2 = important (should know), 3 = supplemental (nice to have)
- question_count per topic: always 5
- match_score: integer 0–100 reflecting how well the CV matches the job requirements
- summary: 2–3 sentences in ${lang}`
}

export function roadmapAnalysisPrompt(opts: {
  cvText?: string
  jobDescription: string
  language?: string
}): { system: string; user: string } {
  const { cvText, jobDescription, language = 'en' } = opts

  const truncatedCV = cvText ? cvText.slice(0, 3000) : null
  const truncatedJD = jobDescription.slice(0, 2000)

  const cvSection = truncatedCV
    ? `## Candidate CV\n${truncatedCV}\n\n`
    : ''

  const user = `${cvSection}## Job Description\n${truncatedJD}

## Required JSON Schema
Return ONLY a JSON object matching this exact schema:
{
  "job_title": "string — inferred from the job description",
  "gap_analysis": {
    "match_score": 0,
    "matched_skills": ["string"],
    "missing_skills": ["string"],
    "summary": "string (2-3 sentences)"
  },
  "roadmap": {
    "phases": [
      {
        "label": "30 dias",
        "topics": [{"name": "string", "priority": 1, "question_count": 5}]
      },
      {
        "label": "60 dias",
        "topics": [{"name": "string", "priority": 2, "question_count": 5}]
      },
      {
        "label": "90 dias",
        "topics": [{"name": "string", "priority": 3, "question_count": 5}]
      }
    ]
  }
}

Produce 3–5 topics per phase. Return only the JSON.`

  return { system: getRoadmapSystemPrompt(language), user }
}
