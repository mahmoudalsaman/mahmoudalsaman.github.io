import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Workflow states a content piece moves through: draft -> review -> published.
// Source of truth for the authoring workflow. Public pages only render
// `published` pieces; `draft`/`review` are previewable in `astro dev` only.
// The CLI in scripts/content.mjs mirrors this list — keep them in sync.
export const WORKFLOW_STATES = ['draft', 'review', 'published'] as const;

// Niche-agnostic content model for a generic content piece.
// Fields are grouped: identity, workflow, taxonomy, SEO/distribution.
// Defaults are intentionally permissive so the Content Lead can shape
// editorial strategy without fighting the schema. See docs/CONTENT.md.
const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
  schema: z.object({
    // --- Identity ---
    title: z.string(),
    description: z.string().optional(), // SEO meta description / excerpt
    author: z.string().default('qriib'),

    // --- Workflow ---
    // `status` is the authoritative workflow state: draft -> review -> published.
    // Only `published` ships to production.
    status: z.enum(WORKFLOW_STATES).default('draft'),
    // `draft` is the DERIVED production-visibility flag (true unless published),
    // kept in sync with `status` by scripts/content.mjs. It exists so any page
    // predicate written as `!data.draft` stays correct without knowing about the
    // workflow. Prefer the `isVisible`/`isPublished` helpers in src/lib/content.
    draft: z.boolean().default(true),
    pubDate: z.coerce.date(), // intended (or actual) publication date
    updatedDate: z.coerce.date().optional(), // last meaningful edit

    // --- Taxonomy ---
    category: z.string().optional(), // one primary bucket
    tags: z.array(z.string()).default([]), // many secondary tags

    // --- SEO / distribution ---
    cover: z.string().optional(), // hero image path or URL
    canonicalUrl: z.string().url().optional(), // for syndicated/cross-posted pieces
    featured: z.boolean().default(false), // surface prominently
  }),
});

export const collections = { posts };
