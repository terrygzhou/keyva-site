import { defineMiddleware } from "astro:middleware";
import { defaultLocale } from "./i18n/index";

/**
 * Populate `Astro.locals.lang` from the first URL segment for any request that
 * is not already under a `[lang]` segment (e.g. the API or a stray static page).
 * `[lang]` pages read `Astro.params.lang` directly and pass it explicitly.
 */
const handler = defineMiddleware(async (context, next) => {
  const segments = context.url.pathname.split("/").filter(Boolean);
  const first = segments[0];
  const lang = first === "en" ? "en" : defaultLocale;

  (context.locals as Record<string, unknown>).lang = lang;

  return next();
});

// Default export — what Astro's static/SSR pipeline expects.
export default handler;

// Named export — what @astrojs/cloudflare's generated entry imports:
//   import { onRequest as userOnRequest } from "src/middleware.ts"
export { handler as onRequest };
