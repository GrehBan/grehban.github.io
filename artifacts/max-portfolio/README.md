# Max — Python Developer

Personal portfolio and static blog built with Astro. The site is configured for
GitHub Pages at `https://grehban.github.io`.

## Local development

```sh
pnpm install
pnpm --filter @workspace/max-portfolio run dev
```

## GitHub Pages deployment

The workflow in `.github/workflows/deploy.yml` builds and deploys on every push
to `main`. In the repository settings, set **Pages → Build and deployment →
Source** to **GitHub Actions**.

The workflow reads optional repository variables:

- `SITE_URL` — canonical site origin; defaults to `https://grehban.github.io`.
- `BASE_PATH` — deployment path; defaults to `/`. Set to `/<repository-name>/`
  only when deploying as a project site without a custom domain.

For a future custom domain, point `SITE_URL` to that domain and set
`BASE_PATH` to `/`. Configure the domain in GitHub Pages and add its `CNAME`
file as instructed by GitHub.

## Contact form

The form uses a serverless Formspree action placeholder. Replace
`https://formspree.io/f/your-form-id` in the contact form with the endpoint
provided by your Formspree account before accepting messages.

## Blog

Add Markdown posts under `src/content/blog/` with `title`, `description`, and
`pubDate` frontmatter. Posts marked `draft: true` are excluded from the blog,
RSS feed, and sitemap. The RSS feed is available at `/rss.xml`.

The included posts are editable starter copy; review their wording and dates
before treating them as published writing.
