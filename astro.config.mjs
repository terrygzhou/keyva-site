import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import cloudflare from "@astrojs/cloudflare";

// Replace with the live domain when it is final (drives sitemap/OG absolute URLs).
export default defineConfig({
  site: "https://www.keyvatech.com",
  output: "hybrid",
  integrations: [tailwind()],
  adapter: cloudflare(),
});
