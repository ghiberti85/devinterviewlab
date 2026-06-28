'use client'

import { useTransition } from 'react'
import { useSettingsStore, type Language } from '@/store/settings.store'
import { Languages } from 'lucide-react'

async function syncLanguageToProfile(language: Language) {
  try {
    await fetch('/api/profile/language', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language }),
    })
  } catch {
    // Non-critical: localStorage is source of truth for UI
  }
}

export function LanguageSelector() {
  const { language, setLanguage } = useSettingsStore()
  const [, startTransition] = useTransition()

  function handleChange(lang: Language) {
    startTransition(() => setLanguage(lang))
    syncLanguageToProfile(lang)
  }

  return (
    <div className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm text-muted-foreground">
      <Languages size={16} className="shrink-0" />
      <select
        value={language}
        onChange={e => handleChange(e.target.value as Language)}
        className="bg-transparent text-sm text-muted-foreground hover:text-foreground focus:outline-none cursor-pointer flex-1"
      >
        <option value="en">🇺🇸 English</option>
        <option value="pt">🇧🇷 Português</option>
      </select>
    </div>
  )
}
