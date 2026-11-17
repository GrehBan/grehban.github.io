import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ site }) => {
  if (!site) {
    throw new Error("Set SITE_URL so RSS links use the canonical site address.");
  }

  const posts = (await getCollection("blog", ({ data }) => !data.draft && data.locale === "ru")).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  );

  return rss({
    title: "Макс — инженер по backend-разработке и распределённым системам",
    description: "Заметки о Python, асинхронных системах, типизации и проектировании API.",
    site,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.description,
      link: `${import.meta.env.BASE_URL}ru/blog/${post.id.replace(/^ru\//, "")}/`,
    })),
    customData: "<language>ru-ru</language>",
  });
};
