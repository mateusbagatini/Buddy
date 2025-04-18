"use client"

import { useLanguage } from "@/contexts/language-context"

export function useTranslation() {
  const { language, setLanguage, t } = useLanguage()

  return {
    language,
    setLanguage,
    t: (key: string) => {
      // Fallback values for common keys if translation is missing
      const fallbacks: Record<string, string> = {
        "common.view": "View",
        "common.notStarted": "Not Started",
        "common.continue": "Continue",
        "actionFlow.viewDetails": "View Details",
      }

      // Get translation from context
      const translation = t(key)

      // If translation is the same as the key, it means it wasn't found
      // In that case, use fallback if available
      if (translation === key && fallbacks[key]) {
        return fallbacks[key]
      }

      return translation
    },
  }
}
