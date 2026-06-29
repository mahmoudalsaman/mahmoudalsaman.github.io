// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Niche-agnostic content site config.
// `site` drives sitemaps, canonical/OG URLs, feeds, and robots.txt
// (src/pages/robots.txt.ts). It reads from the SITE_URL env var so the
// production URL is set ONCE in the host's environment (e.g. Cloudflare Pages)
// with no code change — falling back to a placeholder for local dev.
const site = process.env.SITE_URL ?? 'https://example.com';

export default defineConfig({
  site,
  // Static output by default: cheapest to host, fastest to serve.
  output: 'static',
  // Emits sitemap-index.xml + sitemap-0.xml at build time.
  integrations: [sitemap()],
});
