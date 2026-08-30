import { useAppStore } from "@/store/app";
import en from "./en.json";
import ta from "./ta.json";
import hi from "./hi.json";

export type LanguageCode = "en" | "ta" | "hi";

export interface LanguageOption {
  code: LanguageCode;
  name: string;
  nativeName: string;
  dropdownLabel: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  {
    code: "en",
    name: "English",
    nativeName: "English",
    dropdownLabel: "English",
  },
  {
    code: "ta",
    name: "Tamil",
    nativeName: "தமிழ்",
    dropdownLabel: "Tamil (தமிழ்)",
  },
  {
    code: "hi",
    name: "Hindi",
    nativeName: "हिन्दी",
    dropdownLabel: "Hindi (हिन्दी)",
  },
];

const dictionaries: Record<LanguageCode, Record<string, unknown>> = {
  en: en as unknown as Record<string, unknown>,
  ta: ta as unknown as Record<string, unknown>,
  hi: hi as unknown as Record<string, unknown>,
};

/**
 * Pure translation function resolving dot notation keys with fallback to English.
 */
export function translate(
  lang: LanguageCode,
  key: string,
  params?: Record<string, string | number>,
): string {
  const dict = dictionaries[lang] || dictionaries.en;
  const parts = key.split(".");

  let current: unknown = dict;
  for (const part of parts) {
    if (current && typeof current === "object" && part in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      // Fall back to English
      current = undefined;
      break;
    }
  }

  // Fallback to English dictionary if not found in current language
  if (current === undefined && lang !== "en") {
    let fallback: unknown = dictionaries.en;
    for (const part of parts) {
      if (
        fallback &&
        typeof fallback === "object" &&
        part in (fallback as Record<string, unknown>)
      ) {
        fallback = (fallback as Record<string, unknown>)[part];
      } else {
        fallback = undefined;
        break;
      }
    }
    current = fallback;
  }

  if (typeof current !== "string") {
    return key;
  }

  let text = current;
  if (params) {
    for (const [paramKey, paramVal] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(paramVal));
    }
  }

  return text;
}

/**
 * React hook to access reactive translations and switch language.
 */
export function useTranslation() {
  const language = useAppStore((s) => s.language);
  const setLanguage = useAppStore((s) => s.setLanguage);

  const t = (key: string, params?: Record<string, string | number>) => {
    return translate(language, key, params);
  };

  const currentLanguageOption =
    SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0]!;

  return {
    t,
    language,
    setLanguage,
    currentLanguageOption,
    supportedLanguages: SUPPORTED_LANGUAGES,
  };
}
