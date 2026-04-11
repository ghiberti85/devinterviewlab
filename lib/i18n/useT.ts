import { useSettingsStore } from "@/store/settings.store";
import { translations } from "./translations";

export function useT(): (typeof translations)["en"] {
  const { language } = useSettingsStore();
  return (translations[language] ??
    translations.en) as (typeof translations)["en"];
}
