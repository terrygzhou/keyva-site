import zh from "./zh.json";
import en from "./en.json";

/** All supported locales. The default locale is served without a URL prefix. */
export const locales = ["zh", "en"] as const;
export const defaultLocale = "zh";

type Dict = typeof zh;
export const dictionaries: Record<string, Dict> = { zh, en };

/**
 * Resolve a dotted path ("hero.title") against a locale dictionary, falling
 * back to the default locale when the key is missing in the target locale.
 */
export function t(lang: string, path: string): string {
  const pick = (d: Dict | undefined): unknown =>
    path.split(".").reduce<any>((o, k) => (o ? o[k] : undefined), d);
  const val = pick(dictionaries[lang]) ?? pick(dictionaries[defaultLocale]);
  return typeof val === "string" ? val : String(val ?? "");
}

export function isDefault(lang: string) {
  return lang === defaultLocale;
}

/** URL prefix for a locale. Both locales are URL-prefixed in this build
 *  (`/zh/...` and `/en/...`); see the middleware that 301-redirects `/` → `/zh/`. */
export function localePrefix(lang: string) {
  return lang;
}

/**
 * Locale-prefixed URL for a "core" path within the SAME locale. This is the
 * canonical way to build in-page links on a `[lang]` site, so links are always
 * correct regardless of which locale is being rendered:
 *   localPath("zh", "/about/")  -> "/zh/about/"
 *   localPath("en", "/about/")  -> "/en/about/"
 *   localPath("en", "/")        -> "/en"
 */
export function localPath(lang: string, core = "/"): string {
  const c = core.startsWith("/") ? core : `/${core}`;
  return c === "/" ? `/${lang}` : `/${lang}${c}`;
}

/** Root URL of a *target* locale (for the language switcher). */
export function langRoot(lang: string): string {
  return `/${lang}`;
}

/** Build a link to the same "core" page in a target locale. */
export function switchLangPath(
  _currentLang: string,
  corePath: string,
  targetLang: string
): string {
  return localPath(targetLang, corePath);
}

/**
 * Static [lang] path params for getStaticPaths. For pages that fan out into
 * sub-routes, pass `paths` (core pathnames) to emit one entry per locale ×
 * path; pass undefined for locale-only pages.
 */
export function getLangPaths(
  paths?: string[]
): Array<{ lang: string; [key: string]: string | undefined }> {
  if (!paths) {
    return locales.map((lang) => ({ lang: lang as string }));
  }
  return locales.flatMap((lang) =>
    paths.map((p) => ({ lang: lang as string, p }))
  );
}
