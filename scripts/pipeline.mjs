#!/usr/bin/env node
// qriib AI-assisted content pipeline — structured brief -> publishable draft.
//
//   node scripts/pipeline.mjs <brief.json> [options]
//
// Turns an editorial brief into an enriched Markdown draft and lands it in the
// T2 authoring workflow (status: draft) for human review. Reports the rough
// cost and time per draft so we can reason about unit economics at volume.
//
// Options:
//   --slug <slug>     override the output slug (default: brief.slug or title)
//   --model <id>      claude-opus-4-8 (default) | claude-sonnet-4-6
//   --effort <level>  low | medium | high (default: high)
//   --overwrite       replace an existing piece with the same slug
//   --dry-run         build the prompt + write a placeholder draft, NO API call
//                     (proves the brief->workflow round-trip with zero spend)
//
// Requires ANTHROPIC_API_KEY in the environment for real runs. Model spend is
// flagged to the CEO — see docs/PIPELINE.md. Uses the official @anthropic-ai/sdk
// per the claude-api skill.

import { readFileSync } from 'node:fs';
import { createDraft } from './content.mjs';

// --- pricing (USD per 1M tokens) — keep in sync with the claude-api skill ---
const PRICING = {
  'claude-opus-4-8': { input: 5, output: 25 },
  'claude-sonnet-4-6': { input: 3, output: 15 },
};
const DEFAULT_MODEL = 'claude-opus-4-8';

function die(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

// --- arg parsing ---
function parseArgs(argv) {
  const opts = { effort: 'high', model: DEFAULT_MODEL };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--overwrite') opts.overwrite = true;
    else if (a === '--slug') opts.slug = argv[++i];
    else if (a === '--model') opts.model = argv[++i];
    else if (a === '--effort') opts.effort = argv[++i];
    else if (a.startsWith('--')) die(`unknown option: ${a}`);
    else positional.push(a);
  }
  return { opts, positional };
}

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

// --- brief -> prompt ---
function loadBrief(path) {
  if (!path) die('usage: node scripts/pipeline.mjs <brief.json> [options]');
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    die(`cannot read brief: ${path}`);
  }
  let brief;
  try {
    brief = JSON.parse(raw);
  } catch (e) {
    die(`brief is not valid JSON: ${e.message}`);
  }
  if (!brief.topic) die('brief must include a "topic" field');
  return brief;
}

const SYSTEM_PROMPT = `You are a senior content writer and editor for qriib, a content
publication. You turn editorial briefs into polished, publish-ready drafts.

House style:
- Write for a smart, busy reader. Lead with the point; no filler preamble.
- Confident and clear, never hypey or padded. Short paragraphs, concrete examples.
- Use Markdown: a single H1 title, then H2/H3 sections, lists and bold where they aid scanning.
- Weave the target keywords in naturally for SEO — never keyword-stuff.
- Cover every required point in the brief. Hit the target length within ~15%.
- Do not invent statistics, quotes, or sources. If a specific fact is needed and
  not given, write around it rather than fabricating it.

You return a single structured object: a refined title, an SEO meta description
(<=155 chars), a primary category, 3-6 lowercase tags, and the full article body
as Markdown beginning with the H1.`;

function buildUserPrompt(brief) {
  const lines = ['Write a publishable draft from this editorial brief.', '', 'BRIEF'];
  const field = (label, value) => {
    if (value == null || (Array.isArray(value) && value.length === 0)) return;
    lines.push(`- ${label}: ${Array.isArray(value) ? value.join(', ') : value}`);
  };
  field('Topic', brief.topic);
  field('Working title', brief.title);
  field('Angle', brief.angle);
  field('Audience', brief.audience);
  field('Tone', brief.tone);
  field('Primary category', brief.category);
  field('Target keywords (SEO)', brief.keywords);
  field('Target word count', brief.targetWordCount);
  if (Array.isArray(brief.keyPoints) && brief.keyPoints.length) {
    lines.push('- Must-cover points:');
    for (const p of brief.keyPoints) lines.push(`    - ${p}`);
  }
  if (brief.notes) lines.push(`- Notes: ${brief.notes}`);
  return lines.join('\n');
}

// JSON schema for structured output. Strict shape so the draft always parses.
const DRAFT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string', description: 'Final, refined headline' },
    description: { type: 'string', description: 'SEO meta description, <=155 chars' },
    category: { type: 'string', description: 'One primary category bucket' },
    tags: {
      type: 'array',
      items: { type: 'string' },
      description: '3-6 lowercase topic tags',
    },
    body: { type: 'string', description: 'Full article in Markdown, starting with the H1' },
    wordCount: { type: 'integer', description: 'Approximate word count of the body' },
  },
  required: ['title', 'description', 'category', 'tags', 'body', 'wordCount'],
};

function usd(n) {
  return `$${n.toFixed(4)}`;
}

function reportEconomics({ model, usage, ms, words }) {
  const price = PRICING[model];
  const inTok = usage.input_tokens ?? 0;
  const outTok = usage.output_tokens ?? 0;
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const cacheWrite = usage.cache_creation_input_tokens ?? 0;
  let cost = null;
  if (price) {
    cost =
      (inTok / 1e6) * price.input +
      (outTok / 1e6) * price.output +
      (cacheRead / 1e6) * price.input * 0.1 +
      (cacheWrite / 1e6) * price.input * 1.25;
  }
  console.log('\n── unit economics ───────────────────────────');
  console.log(`  model        ${model}`);
  console.log(`  input tokens ${inTok}${cacheRead ? ` (+${cacheRead} cached)` : ''}`);
  console.log(`  output tokens ${outTok}`);
  console.log(`  draft length ~${words} words`);
  console.log(`  time         ${(ms / 1000).toFixed(1)}s`);
  console.log(`  est. cost    ${cost == null ? 'unknown (no pricing for model)' : `${usd(cost)} / draft`}`);
  if (cost != null) {
    console.log(`  → ~${Math.floor(1 / cost)} drafts per $1 of model spend`);
  }
  console.log('─────────────────────────────────────────────');
}

async function generateDraft(brief, opts) {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env
  const userPrompt = buildUserPrompt(brief);

  const start = Date.now();
  // Stream (drafts are long-form output) and let adaptive thinking + effort
  // drive quality. Structured output guarantees the response parses.
  const stream = client.messages.stream({
    model: opts.model,
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    output_config: {
      effort: opts.effort,
      format: { type: 'json_schema', schema: DRAFT_SCHEMA },
    },
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });
  const msg = await stream.finalMessage();
  const ms = Date.now() - start;

  if (msg.stop_reason === 'refusal') {
    die(`model refused the request (stop_details: ${JSON.stringify(msg.stop_details)})`);
  }
  const text = msg.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');
  let draft;
  try {
    draft = JSON.parse(text);
  } catch (e) {
    die(`could not parse model output as JSON: ${e.message}\n---\n${text.slice(0, 500)}`);
  }
  return { draft, usage: msg.usage, ms };
}

// --- main ---
const { opts, positional } = parseArgs(process.argv.slice(2));
const brief = loadBrief(positional[0]);
const slug = opts.slug || (brief.slug ? slugify(brief.slug) : slugify(brief.title || brief.topic));

if (opts.dryRun) {
  // No API call: build the prompt and land a clearly-marked placeholder draft so
  // the brief -> authoring-workflow round-trip is verifiable with zero spend.
  const userPrompt = buildUserPrompt(brief);
  console.log('── DRY RUN (no model call, no spend) ─────────');
  console.log(`  model would be: ${opts.model} @ effort=${opts.effort}`);
  console.log('\n  system prompt:\n');
  console.log(SYSTEM_PROMPT.replace(/^/gm, '    '));
  console.log('\n  user prompt:\n');
  console.log(userPrompt.replace(/^/gm, '    '));
  const body = [
    `# ${brief.title || brief.topic}`,
    '',
    '> _Dry-run placeholder. Run without `--dry-run` (with ANTHROPIC_API_KEY set) to generate the real draft._',
    '',
    '## Brief points to cover',
    '',
    ...(brief.keyPoints || ['(none specified)']).map((p) => `- ${p}`),
  ].join('\n');
  const path = createDraft({
    slug,
    title: brief.title || brief.topic,
    description: brief.angle || '',
    category: brief.category || '',
    tags: brief.keywords || [],
    body,
    status: 'draft',
    overwrite: opts.overwrite,
  });
  console.log(`\n✓ placeholder draft written: ${path}`);
  console.log(`  next: review it with  node scripts/content.mjs status ${slug} review`);
  process.exit(0);
}

if (!PRICING[opts.model]) {
  console.warn(`! no pricing table for ${opts.model}; cost will be reported as unknown`);
}

const { draft, usage, ms } = await generateDraft(brief, opts);
const words = draft.wordCount || draft.body.split(/\s+/).filter(Boolean).length;
const path = createDraft({
  slug,
  title: draft.title,
  description: draft.description,
  category: draft.category,
  tags: draft.tags,
  body: draft.body,
  status: 'draft',
  overwrite: opts.overwrite,
});

console.log(`✓ draft generated and landed in the workflow: ${path}`);
console.log(`  title: ${draft.title}`);
console.log(`  next:  node scripts/content.mjs status ${slug} review`);
reportEconomics({ model: opts.model, usage, ms, words });
