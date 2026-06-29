# qriib content platform

A lean, niche-agnostic static content site built on [Astro](https://astro.build).

## Why this stack

**Astro, static output.** It is content-first (Markdown/MDX content collections),
ships zero JS by default, builds to plain static HTML, and is the cheapest and
fastest thing to host (any static host / CDN free tier). It stays out of the way
of editorial strategy: drop a Markdown file in, get a fast, SEO-friendly page out.
Content collections give us a typed content model to grow the authoring workflow
(T2), SEO/feeds (T3), and AI-assisted drafting (T4) without re-platforming.

## Project layout

```
src/
  content.config.ts          # content model (typed schema for posts)
  content/posts/*.md         # the content itself — one Markdown file per page
  layouts/BaseLayout.astro   # shared HTML shell (head, header, footer)
  pages/index.astro          # home page — lists non-draft posts
  pages/posts/[...slug].astro# renders one static page per post
astro.config.mjs             # site config (set `site` to the prod domain)
```

## Run it locally

Prereqs: Node 18+ and npm.

```bash
npm install      # install dependencies
npm run dev      # dev server with hot reload at http://localhost:4321
```

Other scripts:

```bash
npm run build    # build static site to dist/
npm run preview  # serve the built dist/ locally
npm run check    # type-check content + components
```

After `npm run build`, the site is fully static in `dist/` — `dist/index.html`
and `dist/posts/hello-content/index.html` — ready to deploy to any static host.

## Adding content

Create a Markdown file under `src/content/posts/` with frontmatter:

```md
---
title: My post
description: One-line summary used for SEO.
pubDate: 2026-06-29
tags: [example]
draft: false
---

Body in Markdown.
```

Set `draft: true` to keep a post out of the build until it is ready.

## Hosting

`output: "static"` means this deploys to any static host or CDN (Cloudflare
Pages, Netlify, Vercel, GitHub Pages, S3+CloudFront). No paid infra has been
provisioned yet — hosting choice + domain go through the CEO before any spend.
Once a domain is chosen, update `site` in `astro.config.mjs` (used for canonical
URLs, sitemaps, and feeds in T3).
