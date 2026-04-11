import { useSettingsStore } from '@/store/settings.store'
import { translations, type Translations } from './translations'

export function useT(): Translations {
  const { language } = useSettingsStore()
  return translations[language] ?? translations.en
}
