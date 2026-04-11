'use client'

import { useSettingsStore, type Language } from '@/store/settings.store'
import { Languages } from 'lucide-react'

export function LanguageSelector() {
  const { language, setLanguage } = useSettingsStore()

  return (
    <div className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm text-muted-foreground">
      <Languages size={16} className="shrink-0" />
      <select
        value={language}
        onChange={e => setLanguage(e.target.value as Language)}
        className="bg-transparent text-sm text-muted-foreground hover:text-foreground focus:outline-none cursor-pointer flex-1"
      >
        <option value="en">🇺🇸 English</option>
        <option value="pt">🇧🇷 Português</option>
      </select>
    </div>
  )
}
