// Site-wide constants used for SEO, feeds, and structured data.
// Keep this niche-agnostic; the Content Lead can rename freely.
export const SITE = {
  title: 'qriib',
  description: 'A lean, niche-agnostic content platform.',
  // Display name used for schema.org Organization / author and feed metadata.
  author: 'qriib',
  // Default social-share/OG image (relative to site root). Optional.
  defaultImage: '/og-default.png',
  // Site language, surfaced in <html lang> and feed metadata.
  lang: 'en',
} as const;
