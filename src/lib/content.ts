import type { CollectionEntry } from 'astro:content';

// Shared content-workflow helpers used by the public pages so visibility
// rules live in exactly one place. See docs/CONTENT.md for the model.

type Post = CollectionEntry<'posts'>;

/** A piece is live only when it has reached the `published` state. */
export function isPublished(post: Post): boolean {
  return post.data.status === 'published';
}

// Preview mode shows unpublished (`draft`/`review`) pieces so authors and
// reviewers can see work in progress on the dev server. It is OFF for the
// production build, so only `published` content ever ships.
//
// NOTE: gate on MODE, not import.meta.env.PROD/DEV. In this Astro/Vite setup
// `astro build` evaluates page modules with PROD=false / DEV=true while only
// MODE is correctly 'production' — a PROD/DEV gate would leak drafts live.
const PREVIEW = import.meta.env.MODE !== 'production';

/**
 * Whether a piece should be visible in the current build.
 * - Production build (`astro build`): only `published` pieces ship.
 * - Dev server (`astro dev`): everything is visible for authoring/review.
 */
export function isVisible(post: Post): boolean {
  return PREVIEW ? true : isPublished(post);
}

/** Newest-first comparator by publication date. */
export function byNewest(a: Post, b: Post): number {
  return b.data.pubDate.valueOf() - a.data.pubDate.valueOf();
}
