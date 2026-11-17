import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

const site = process.env.SITE_URL || "https://grehban.github.io";
const rawBase = process.env.BASE_PATH || "/";
const baseSegments = rawBase.split("/").filter(Boolean);
const base = baseSegments.length ? `/${baseSegments.join("/")}/` : "/";

if (!/^\/(?:[A-Za-z0-9._~-]+\/?)*$/.test(base)) {
  throw new Error(`BASE_PATH must be a URL path, received "${rawBase}"`);
}

export default defineConfig({
  site,
  base,
  output: "static",
  trailingSlash: "always",
  outDir: "./dist/public/",
  integrations: [sitemap()],
  vite: {
    server: {
      allowedHosts: true,
    },
  },
});
