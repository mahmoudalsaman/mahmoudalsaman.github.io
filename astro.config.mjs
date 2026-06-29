// @ts-check
import { defineConfig } from 'astro/config';

// Niche-agnostic content site config.
// `site` is used for sitemaps/canonical URLs and feeds (added in T3).
// Update it to the production domain once hosting is chosen.
export default defineConfig({
  site: 'https://example.com',
  // Static output by default: cheapest to host, fastest to serve.
  output: 'static',
});
