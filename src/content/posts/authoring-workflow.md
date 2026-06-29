---
title: How content moves from draft to publish
description: A walkthrough of the qriib authoring workflow and content model.
author: qriib
status: review
draft: true
pubDate: 2026-06-30
category: platform
tags: [workflow, editorial, platform]
featured: false
---

# How content moves from draft to publish

Every piece on qriib moves through three workflow states:

1. **draft** — being written. Hidden from production; previewable on the dev server.
2. **review** — ready for an editor's eyes. Still hidden from production.
3. **published** — live. The only state that ships to the public site.

The `status` field in a piece's frontmatter is the single source of truth. The
`draft` flag is kept in sync automatically (true unless published) so it is safe
for any part of the platform to gate visibility on either one.

Authors don't edit `status` by hand — the workflow CLI validates each move:

```bash
node scripts/content.mjs new my-post          # create a draft
node scripts/content.mjs status my-post review    # hand off for review
node scripts/content.mjs status my-post published # ship it
```

This very page is currently in **review** — which is why you can only see it on
the dev server. Publish it and it goes live; nothing else changes.
