import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Language = 'en' | 'pt'

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: '🇺🇸 English',
  pt: '🇧🇷 Português',
}

interface SettingsStore {
  language: Language
  _hasHydrated: boolean
  setLanguage: (lang: Language) => void
  setHasHydrated: (value: boolean) => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      language: 'pt',
      _hasHydrated: false,
      setLanguage: (language) => set({ language }),
      setHasHydrated: (value) => set({ _hasHydrated: value }),
    }),
    {
      name: 'devinterviewlab-settings',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)
