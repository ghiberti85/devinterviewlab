import { create } from 'zustand'
import type { Question, SessionType } from '@/lib/supabase/types'

interface SessionStore {
  activeQuestion: Question | null
  sessionType: SessionType | null
  elapsedSec: number
  isRunning: boolean
  setActiveQuestion: (q: Question | null) => void
  startSession: (type: SessionType) => void
  tick: () => void
  reset: () => void
}

export const useSessionStore = create<SessionStore>((set) => ({
  activeQuestion: null,
  sessionType: null,
  elapsedSec: 0,
  isRunning: false,
  setActiveQuestion: (q) => set({ activeQuestion: q }),
  startSession: (type) => set({ sessionType: type, elapsedSec: 0, isRunning: true }),
  tick: () => set((s) => ({ elapsedSec: s.elapsedSec + 1 })),
  reset: () => set({ activeQuestion: null, sessionType: null, elapsedSec: 0, isRunning: false }),
}))
