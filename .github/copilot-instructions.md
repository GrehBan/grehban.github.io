# Copilot instructions

## Commands

Run these from the repository root with Node.js 24+ and pnpm 10:

```sh
pnpm install
pnpm dev
pnpm check
pnpm build
pnpm preview
```

`pnpm check` runs `astro check`; `pnpm build` runs that check before building the static site. The GitHub Pages workflow runs `pnpm build`.

## Architecture

This repository contains one deployable application: the bilingual Astro
portfolio under `artifacts/max-portfolio/`. It builds static output to
`artifacts/max-portfolio/dist/public/`; GitHub Actions publishes that directory
to GitHub Pages. There is no runtime API or server-side CMS.

The blog is an Astro content collection configured in
`artifacts/max-portfolio/src/content.config.ts`. Markdown under
`src/content/blog/` is English; `src/content/blog/ru/` is Russian. The
collection schema validates the frontmatter. `SiteLayout.astro` centralizes
canonical URLs, language alternates, RSS links, and shared navigation.

The `/admin/` page is a guide to GitHub's authenticated repository editor.
Editing a Markdown file or adding a commit to `master` is the content-management
operation; the Pages workflow rebuilds the public site after the commit.

## Conventions

- The OpenAPI/CMS backend has been removed. Keep blog management static and use
  GitHub's own account permissions; do not add credentials or tokens to
  browser code or generated site output.
- Use `src/data/portfolio.ts` for structured English/Russian portfolio data;
  keep locale-specific routes and content aligned.
- Use lowercase kebab-case Markdown filenames. English files live directly
  under `src/content/blog/`; Russian files go under `src/content/blog/ru/` and
  set `locale: ru`.
- Blog frontmatter is defined by `src/content.config.ts`. Posts with
  `draft: true` are excluded from public blog listings, RSS feeds, and sitemap
  output.
- `SITE_URL` controls the canonical site origin and `BASE_PATH` controls the
  deployment prefix. For `grehban.github.io`, their defaults are the root
  origin and `/`.
- Do not hand-edit `dist/` or `.astro/`; change Astro source, content, or
  configuration and rebuild.
- Preserve `minimumReleaseAge: 1440` in `pnpm-workspace.yaml`.
