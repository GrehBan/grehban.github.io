import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ site }) => {
  if (!site) {
    throw new Error("Set SITE_URL so RSS links use the canonical site address.");
  }

  const posts = (await getCollection("blog", ({ data }) => !data.draft)).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  );

  return rss({
    title: "Max — Backend & Distributed Systems Engineer",
    description:
      "Notes on Python, async systems, typing, AI integrations, and API tooling.",
    site,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.description,
      link: `${import.meta.env.BASE_URL}blog/${post.id}/`,
    })),
    customData: "<language>en-us</language>",
  });
};
