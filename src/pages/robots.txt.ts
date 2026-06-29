import type { APIRoute } from 'astro';

// robots.txt is generated at build time so its Sitemap URL always tracks the
// configured `site` (astro.config.mjs / SITE_URL). No hardcoded domain to keep
// in sync when we point at the production deploy URL.
export const GET: APIRoute = ({ site }) => {
  const sitemap = new URL('/sitemap-index.xml', site).href;
  const body = `User-agent: *
Allow: /

# Sitemap index emitted by @astrojs/sitemap at build time.
Sitemap: ${sitemap}
`;
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
