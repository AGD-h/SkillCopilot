export type Locale = "zh-CN" | "en" | "zh-TW";

export const LOCALES: readonly Locale[] = ["zh-CN", "en", "zh-TW"] as const;

export const LOCALE_STORAGE_KEY = "skillcopilot.locale";

export const DEFAULT_LOCALE: Locale = "zh-CN";

export function isLocale(value: unknown): value is Locale {
  return value === "zh-CN" || value === "en" || value === "zh-TW";
}

/**
 * Maps a BCP-47 language tag to a supported Locale.
 *
 * Core language/script/region subtags are considered until a single-character
 * singleton (u, x, t, …) starts an extension. Extensions never contribute
 * region/script decisions.
 */
export function resolveLocaleFromLanguage(tag: string): Locale {
  const normalized = tag.trim().toLowerCase().replace(/_/g, "-");
  if (!normalized) return DEFAULT_LOCALE;

  // Prefer Intl.Locale when available; fall back to a small subtag parser.
  try {
    if (typeof Intl !== "undefined" && typeof Intl.Locale === "function") {
      const locale = new Intl.Locale(normalized);
      return classifyZhParts(locale.language, locale.script, locale.region);
    }
  } catch {
    // Malformed tags fall through to the manual parser.
  }

  return resolveLocaleFromSubtags(normalized);
}

function classifyZhParts(
  language: string | undefined,
  script: string | undefined | null,
  region: string | undefined | null,
): Locale {
  const lang = (language ?? "").toLowerCase();
  if (lang !== "zh") {
    return lang ? "en" : DEFAULT_LOCALE;
  }

  const scriptNorm = (script ?? "").toLowerCase();
  if (scriptNorm === "hant") {
    return "zh-TW";
  }

  const regionNorm = (region ?? "").toLowerCase();
  if (regionNorm === "tw" || regionNorm === "hk" || regionNorm === "mo") {
    return "zh-TW";
  }

  return "zh-CN";
}

/** Manual BCP-47 core-subtag parse used when Intl.Locale is unavailable. */
function resolveLocaleFromSubtags(normalized: string): Locale {
  const parts = normalized.split("-").filter(Boolean);
  if (parts.length === 0) return DEFAULT_LOCALE;

  const language = parts[0];
  if (language !== "zh") {
    return "en";
  }

  let script: string | undefined;
  let region: string | undefined;

  for (let i = 1; i < parts.length; i += 1) {
    const part = parts[i];
    // Singleton starts an extension sequence — stop reading core tags.
    if (part.length === 1) {
      break;
    }
    // Script: 4 letters (Hant / Hans).
    if (!script && /^[a-z]{4}$/.test(part)) {
      script = part;
      continue;
    }
    // Region: 2 letters (TW / HK / MO / CN / SG) or 3 digits.
    if (!region && (/^[a-z]{2}$/.test(part) || /^\d{3}$/.test(part))) {
      region = part;
      continue;
    }
    // Other variant / extended-language subtags: ignore for our mapping.
  }

  return classifyZhParts(language, script, region);
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
