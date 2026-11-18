# Max — Backend & Distributed Systems Engineer

A bilingual English/Russian portfolio and static blog built with Astro and
deployed to GitHub Pages at <https://grehban.github.io/>.

## Development

Requires Node.js 24+ and pnpm 10.

```sh
pnpm install
pnpm dev
```

Check and build the site:

```sh
pnpm check
pnpm build
```

## Blog posts

Blog content is Markdown in `artifacts/max-portfolio/src/content/blog/`.
English posts go in that directory; Russian posts go in its `ru/` subdirectory.
Keep each post's frontmatter valid against `src/content.config.ts`. Set
`draft: true` to exclude a post from the public blog, RSS feed, and sitemap.

To manage posts, open <https://grehban.github.io/admin/> and follow the links to
the repository's GitHub editor. GitHub account permissions protect edits; each
commit to `master` starts a GitHub Pages build. The current posts are already
in the repository and can be edited there.

## Deployment

`.github/workflows/deploy.yml` builds the static site and deploys
`artifacts/max-portfolio/dist/public` to GitHub Pages. Set the repository's
**Pages → Build and deployment → Source** to **GitHub Actions**.

Optional repository variables:

- `SITE_URL` — canonical site origin; defaults to `https://grehban.github.io`.
- `BASE_PATH` — deployment path; defaults to `/` for this user site.

The contact form still uses a Formspree placeholder. Configure its endpoint in
`artifacts/max-portfolio/src/components/HomePage.astro` before accepting
messages.
