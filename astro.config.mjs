// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Niche-agnostic content site config.
// `site` is used for sitemaps/canonical URLs and feeds.
// Update it to the production domain once hosting is chosen (also update
// public/robots.txt and src/consts.ts).
export default defineConfig({
  site: 'https://example.com',
  // Static output by default: cheapest to host, fastest to serve.
  output: 'static',
  // Emits sitemap-index.xml + sitemap-0.xml at build time.
  integrations: [sitemap()],
});
