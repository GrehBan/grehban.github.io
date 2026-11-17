import type { APIRoute } from "astro";

export const GET: APIRoute = ({ site }) => {
  if (!site) {
    throw new Error("Set SITE_URL so the sitemap URL is canonical.");
  }

  const sitemapUrl = new URL(
    `${import.meta.env.BASE_URL}sitemap-index.xml`,
    site,
  );

  return new Response(`User-agent: *\nAllow: /\nSitemap: ${sitemapUrl}\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
