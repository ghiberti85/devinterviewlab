import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Language = 'en' | 'pt'

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: '🇺🇸 English',
  pt: '🇧🇷 Português',
}

interface SettingsStore {
  language: Language
  setLanguage: (lang: Language) => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      language: 'pt',
      setLanguage: (language) => set({ language }),
    }),
    { name: 'devinterviewlab-settings' }
  )
)
