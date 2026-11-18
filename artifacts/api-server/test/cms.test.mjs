import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import express from "express";
import pino from "pino";
import pinoHttp from "pino-http";

process.env.SESSION_SECRET = "test-only-session-signing-secret-with-ample-length";
process.env.CMS_ADMIN_USERNAME = "admin";
process.env.CMS_ADMIN_PASSWORD = "test-only-admin-passphrase-2026";

const { createCmsRouter } = await import("../dist/cms-test.mjs");

test("admin login protects GitHub-backed blog create, edit, and delete routes", async (t) => {
  const posts = [];
  let commitNumber = 0;
  const commit = (path) => {
    commitNumber += 1;
    return {
      path,
      commitSha: `test-commit-${commitNumber}`,
      commitUrl: `https://github.com/GrehBan/grehban.github.io/commit/test-${commitNumber}`,
    };
  };

  const store = {
    async list() {
      return [...posts];
    },
    async create(input) {
      const path = input.locale === "ru"
        ? `artifacts/max-portfolio/src/content/blog/ru/${input.slug}.md`
        : `artifacts/max-portfolio/src/content/blog/${input.slug}.md`;
      posts.push({
        ...input,
        path,
        pubDate: input.pubDate,
        tags: [...input.tags],
        draft: input.draft ?? false,
      });
      return commit(path);
    },
    async update(locale, slug, input) {
      const post = posts.find((item) => item.locale === locale && item.slug === slug);
      if (!post) {
        const error = new Error("The blog post or repository was not found.");
        error.statusCode = 404;
        throw error;
      }
      Object.assign(post, input, { updatedDate: new Date("2026-11-18T00:00:00.000Z") });
      return commit(post.path);
    },
    async delete(locale, slug) {
      const index = posts.findIndex((item) => item.locale === locale && item.slug === slug);
      if (index === -1) {
        const error = new Error("The blog post or repository was not found.");
        error.statusCode = 404;
        throw error;
      }
      const [post] = posts.splice(index, 1);
      return commit(post.path);
    },
  };

  const app = express();
  app.use(pinoHttp({ logger: pino({ level: "silent" }) }));
  app.use(express.json());
  app.use("/api", createCmsRouter(store));
  const server = app.listen(0);
  await once(server, "listening");
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));

  const address = server.address();
  assert.ok(address && typeof address === "object");
  const baseUrl = `http://127.0.0.1:${address.port}/api`;

  const anonymous = await fetch(`${baseUrl}/cms/posts`);
  assert.equal(anonymous.status, 401);

  const invalidLogin = await fetch(`${baseUrl}/cms/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "wrong-password" }),
  });
  assert.equal(invalidLogin.status, 401);

  const login = await fetch(`${baseUrl}/cms/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: process.env.CMS_ADMIN_PASSWORD }),
  });
  assert.equal(login.status, 200);
  const session = await login.json();
  assert.equal(typeof session.token, "string");
  const authHeaders = {
    Authorization: `Bearer ${session.token}`,
    "Content-Type": "application/json",
  };

  const blockedTamperedToken = await fetch(`${baseUrl}/cms/posts`, {
    headers: { Authorization: `Bearer ${session.token}x` },
  });
  assert.equal(blockedTamperedToken.status, 401);

  const postInput = {
    locale: "en",
    slug: "test-cms-post",
    title: "A test post",
    description: "A post created by the CMS API test.",
    pubDate: "2026-11-18",
    tags: ["Python", "testing"],
    draft: true,
    body: "## Test body\n\nThis post is not committed to GitHub.",
  };

  const created = await fetch(`${baseUrl}/cms/posts`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify(postInput),
  });
  assert.equal(created.status, 201);
  assert.equal((await created.json()).path, "artifacts/max-portfolio/src/content/blog/test-cms-post.md");

  const listed = await fetch(`${baseUrl}/cms/posts`, {
    headers: { Authorization: `Bearer ${session.token}` },
  });
  assert.equal(listed.status, 200);
  assert.equal((await listed.json())[0].title, "A test post");

  const updated = await fetch(`${baseUrl}/cms/posts/en/test-cms-post`, {
    method: "PUT",
    headers: authHeaders,
    body: JSON.stringify({
      title: "Updated test post",
      description: "The update path is protected and validated.",
      pubDate: "2026-11-18",
      tags: ["Python"],
      draft: false,
      body: "Updated Markdown.",
    }),
  });
  assert.equal(updated.status, 200);
  assert.equal((await updated.json()).path, "artifacts/max-portfolio/src/content/blog/test-cms-post.md");

  const deleted = await fetch(`${baseUrl}/cms/posts/en/test-cms-post`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${session.token}` },
  });
  assert.equal(deleted.status, 200);
  assert.equal(posts.length, 0);
});
