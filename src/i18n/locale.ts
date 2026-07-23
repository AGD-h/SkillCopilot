export type Locale = "zh-CN" | "en" | "zh-TW";

export const LOCALES: readonly Locale[] = ["zh-CN", "en", "zh-TW"] as const;

export const LOCALE_STORAGE_KEY = "skillcopilot.locale";

export const DEFAULT_LOCALE: Locale = "zh-CN";

export function isLocale(value: unknown): value is Locale {
  return value === "zh-CN" || value === "en" || value === "zh-TW";
}

/** Maps a BCP-47-ish language tag to a supported Locale. */
export function resolveLocaleFromLanguage(tag: string): Locale {
  const normalized = tag.trim().toLowerCase().replace(/_/g, "-");
  if (!normalized) return DEFAULT_LOCALE;

  if (
    normalized === "zh-tw" ||
    normalized === "zh-hk" ||
    normalized === "zh-mo" ||
    normalized.includes("zh-hant") ||
    normalized.startsWith("zh-hant")
  ) {
    return "zh-TW";
  }

  if (normalized === "zh" || normalized.startsWith("zh-")) {
    return "zh-CN";
  }

  return "en";
}

export function detectSystemLocale(): Locale {
  try {
    const languages =
      typeof navigator !== "undefined" && Array.isArray(navigator.languages)
        ? navigator.languages
        : [];
    for (const language of languages) {
      if (typeof language === "string" && language.trim()) {
        return resolveLocaleFromLanguage(language);
      }
    }
    if (typeof navigator !== "undefined" && navigator.language) {
      return resolveLocaleFromLanguage(navigator.language);
    }
  } catch {
    // Fall through to default when browser APIs throw.
  }
  return DEFAULT_LOCALE;
}

export function readStoredLocale(): Locale | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(raw)) return raw;
  } catch {
    // Ignore quota / privacy mode failures.
  }
  return null;
}

export function writeStoredLocale(locale: Locale): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Ignore write failures; UI still switches in-memory.
  }
}

export function resolveInitialLocale(): Locale {
  return readStoredLocale() ?? detectSystemLocale();
}

/** Locale string passed to Intl / Date#toLocaleString. */
export function intlLocale(locale: Locale): string {
  return locale;
}
