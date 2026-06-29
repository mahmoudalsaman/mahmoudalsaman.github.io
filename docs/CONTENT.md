# Content model & authoring workflow

This is how content is structured and moved to publication on qriib. It is
deliberately niche-agnostic — the Content Lead can rename categories, add
fields, and shape editorial strategy without re-platforming. These are sensible
defaults chosen until that role is filled; revisit them together.

## The content model

Every content piece is a Markdown (`.md`/`.mdx`) file under
`src/content/posts/`. Its frontmatter is validated against the schema in
`src/content.config.ts`. Fields:

| Field          | Type                              | Required | Notes                                              |
| -------------- | --------------------------------- | -------- | -------------------------------------------------- |
| `title`        | string                            | yes      | Headline.                                          |
| `description`  | string                            | no       | SEO meta description / list excerpt. Recommended.  |
| `author`       | string                            | no       | Byline. Defaults to `qriib`.                       |
| `status`       | `draft` \| `review` \| `published`| no       | Workflow state. Defaults to `draft`. Authoritative.|
| `draft`        | boolean                           | no       | Derived from `status` (true unless published).     |
| `pubDate`      | date                              | yes      | Intended/actual publication date.                  |
| `updatedDate`  | date                              | no       | Last meaningful edit. Set automatically on moves.  |
| `category`     | string                            | no       | One primary taxonomy bucket.                       |
| `tags`         | string[]                          | no       | Many secondary tags. Defaults to `[]`.             |
| `cover`        | string                            | no       | Hero image path or URL.                            |
| `canonicalUrl` | url                               | no       | For syndicated/cross-posted pieces.                |
| `featured`     | boolean                           | no       | Surface prominently. Defaults to `false`.          |

### Taxonomy default

One `category` (the primary bucket) plus free-form `tags`. This is the smallest
taxonomy that supports browse-by-topic and SEO without forcing a hierarchy
before we know the niche. The Content Lead owns the controlled vocabulary.

## The authoring workflow

A piece moves through three states. **`status` is the single source of truth.**

```
draft ──▶ review ──▶ published
  ▲         │            │
  └─────────┴────────────┘   (kick-back / unpublish)
```

| State       | Meaning                          | Visible in production? | Visible in `astro dev`? |
| ----------- | -------------------------------- | ---------------------- | ----------------------- |
| `draft`     | Being written                    | no                     | yes (preview)           |
| `review`    | Ready for an editor              | no                     | yes (preview)           |
| `published` | Live                             | **yes**                | yes                     |

Production ships only `published` pieces. The dev server shows everything so
authors and reviewers can preview work in progress; non-published pieces render
with a "Preview" banner.

### `draft` is derived, not authored

`draft` mirrors `status` (`draft = status !== 'published'`) and is kept in sync
by the CLI. It exists so any visibility check — whether written as
`status === 'published'` or `!data.draft` — yields the same answer. Prefer the
helpers in `src/lib/content.ts` (`isVisible`, `isPublished`) in new code.

## Driving the workflow: the CLI

No CMS server — transitions are made with a zero-dependency CLI that validates
each move and keeps frontmatter consistent:

```bash
# create a new draft (scaffolds frontmatter + a starter body)
node scripts/content.mjs new my-post --title "My Post"

# hand a draft off for review
node scripts/content.mjs status my-post review

# approve and publish (sets draft:false, stamps updatedDate)
node scripts/content.mjs status my-post published

# send something back for changes, or unpublish
node scripts/content.mjs status my-post draft

# see everything and its state
node scripts/content.mjs list
node scripts/content.mjs list --state review
```

Allowed transitions (illegal ones are rejected):

- `draft → review` — submit for review
- `draft → published` — fast-path publish (solo author)
- `review → published` — approve & ship
- `review → draft` — kick back for changes
- `published → draft` / `published → review` — unpublish / re-review

The CLI is the recommended path because it keeps `status`, `draft`, and
`updatedDate` consistent. You can also hand-edit frontmatter, but then keep
`draft` in sync with `status` yourself.

## When the Content Lead arrives

Open questions to settle together:

- The controlled `category` vocabulary and tag conventions.
- Whether `review` should require a named reviewer/approver field.
- Whether to add scheduled publishing (publish when `pubDate` arrives).
- Author profiles vs. a single `qriib` byline.

Until then, the defaults above are in force.
