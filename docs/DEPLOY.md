# Deploy runbook — production + analytics dashboard

This is the end-to-end procedure to put the site live and turn on real
traffic/engagement reporting. It is the deploy half of QRI-4's success
condition (tracked in QRI-6).

## Two hosting paths (both $0/mo)

- **Path A — GitHub Pages (zero external account, agent-executable). ← LIVE.**
  `gh` is already authenticated (`mahmoudalsaman`) and the site is fully static,
  so the live site goes up with no third-party account and no credential handoff.
  Deployed via a built-output `gh-pages` branch (see "Path A steps"). This
  delivers the live/crawlable half of QRI-4.
- **Path B — Cloudflare Pages (CoS-recommended).** Slightly nicer dashboard and
  one-click Cloudflare Web Analytics, but requires a human to create/authorize a
  Cloudflare account. See "Path B steps" below.

Analytics dashboard (the "real engagement numbers" half) needs a provider with a
hosted dashboard — Cloudflare Web Analytics (free, needs a Cloudflare account +
beacon token) or GoatCounter (free, needs a GoatCounter account). Either is a
small env-var change once the token exists.

## Path A steps — GitHub Pages (recommended fast unblock)

> Assumes a **root** deployment so no Astro `base` path is needed: use a user
> site repo named `mahmoudalsaman.github.io` (served at root) or a custom domain.
> A project repo served under `/<repo>/` would need an Astro `base` path + link
> updates first (the hardcoded `/` links in `BaseLayout.astro` would break).

Deploy method: built `dist/` is published to a `gh-pages` branch and Pages
serves from it. (A GitHub Actions workflow would be cleaner, but the available
`gh` token lacks the `workflow` scope, so a committed workflow file can't be
pushed. Grant `workflow` scope later to switch to Actions-based deploys.)

1. Create the repo + push source `main`:
   `gh repo create mahmoudalsaman.github.io --public --source=. --remote=origin --push`
2. Build with the live URL and publish the output to `gh-pages`:
   ```sh
   SITE_URL='https://mahmoudalsaman.github.io' npm run build
   touch dist/.nojekyll   # skip Jekyll processing of the static output
   # push dist/ contents to the gh-pages branch (git worktree or subtree)
   ```
3. Enable Pages from the branch:
   `gh api -X POST repos/mahmoudalsaman/mahmoudalsaman.github.io/pages -f 'source[branch]=gh-pages' -f 'source[path]=/'`
4. Redeploy on content change: rebuild and re-push `gh-pages` (same as step 2).
5. (Analytics) Once the beacon token exists, rebuild with
   `PUBLIC_ANALYTICS_PROVIDER=cloudflare PUBLIC_CF_BEACON_TOKEN=<token>` set and
   re-push `gh-pages`. Until then the site ships zero trackers.

## Path B steps — Cloudflare Pages

Cost: ~$0/mo.

## Recommendation (cost: ~$0/mo)

- **Hosting:** Cloudflare Pages — free tier, generous for static sites. Start on
  the free `*.pages.dev` subdomain; no custom domain or spend needed to get real
  numbers. (Netlify / Vercel free tiers are equivalent fallbacks.)
- **Analytics:** Cloudflare Web Analytics — FREE, cookieless, no consent banner,
  hosted dashboard covering pageviews + visit duration + bounce (traffic **and**
  engagement). One-click if hosted on Cloudflare Pages.
- **Only future spend:** an optional custom domain (~$10/yr), flagged separately
  if/when we want a branded URL.

## Prereqs (CEO / account owner — the deploy blocker)

1. A Cloudflare account connected to this repo.
2. Web Analytics enabled for the site → copy the **beacon token**.

Once these exist, everything below is ~10 minutes of config. No code changes
are required — the URL and analytics provider are entirely env-driven.

## Steps

1. **Create the Pages project** (Cloudflare dashboard → Workers & Pages → Create
   → Pages → connect this Git repo).
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Framework preset: Astro (or "None" — the build command is what matters).

2. **Set environment variables** (Pages → Settings → Variables, Production):
   - `SITE_URL` = the deploy URL, e.g. `https://<project>.pages.dev`
     (drives sitemap, canonical/OG URLs, RSS, and robots.txt — single source of
     truth; see `astro.config.mjs`).
   - `PUBLIC_ANALYTICS_PROVIDER` = `cloudflare`
   - `PUBLIC_CF_BEACON_TOKEN` = the Web Analytics beacon token.

3. **Deploy** (first deploy triggers automatically on connect; later deploys on
   push to `main`).

## Verification (this is the success condition)

- Visit the live `hello-content` post a few times across a session.
- Confirm `https://<deploy-url>/robots.txt` and `/sitemap-index.xml` resolve and
  reference the live domain.
- Confirm the Cloudflare Web Analytics dashboard shows **pageviews** and
  **visit duration / bounce** (engagement) for those visits — not zeros.
- View source on a live page → the Cloudflare beacon
  (`static.cloudflareinsights.com/beacon.min.js`) is present (it only renders
  when `PUBLIC_ANALYTICS_PROVIDER=cloudflare` **and** the token is set).

## Post-deploy (SEO distribution)

- Submit `https://<deploy-url>/sitemap-index.xml` to Google Search Console.

## Local sanity check (no account needed)

```sh
SITE_URL='https://qriib.pages.dev' npm run build
cat dist/robots.txt            # Sitemap line should show the SITE_URL
grep canonical dist/index.html # canonical should show the SITE_URL
```

To smoke-test the analytics beacon locally, set `PUBLIC_ANALYTICS_PROVIDER=cloudflare`
and `PUBLIC_CF_BEACON_TOKEN=<token>` in a local `.env` (see `.env.example`) and
inspect the built HTML for the beacon script.
