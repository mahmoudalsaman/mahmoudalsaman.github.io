import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Niche-agnostic content model.
// Posts are plain Markdown/MDX files under src/content/posts/.
// The schema is intentionally minimal so the Content Lead can shape
// editorial strategy without the stack getting in the way. T2 will
// extend this with the draft -> review -> publish workflow.
const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    draft: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
  }),
});

export const collections = { posts };
