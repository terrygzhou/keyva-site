import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import cloudflare from "@astrojs/cloudflare";

// Drives sitemap/OG absolute URLs.
export default defineConfig({
  site: "https://www.keyva.cn",
  output: "hybrid",
  integrations: [tailwind()],
  adapter: cloudflare(),
  i18n: {
    defaultLocale: "zh",
    locales: ["zh", "en"],
    routing: {
      prefixDefaultLocale: false,
    },
  },
});
