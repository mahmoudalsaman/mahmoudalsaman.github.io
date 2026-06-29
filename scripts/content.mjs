#!/usr/bin/env node
// qriib content workflow CLI — authoring + draft -> review -> published.
//
//   node scripts/content.mjs new <slug> [--title "..."]   scaffold a draft
//   node scripts/content.mjs status <slug> <state>        move between states
//   node scripts/content.mjs list [--state <state>]       show all pieces
//
// No dependencies: the content lives in flat-frontmatter Markdown files, so the
// CLI edits frontmatter line-by-line. `status` is authoritative; the derived
// `draft` flag (true unless published) is always kept in sync so page predicates
// stay correct. See docs/CONTENT.md.

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const POSTS_DIR = join(ROOT, 'src', 'content', 'posts');

const STATES = ['draft', 'review', 'published'];
// Allowed transitions. The canonical path is draft -> review -> published;
// reverse edges support kick-backs and unpublishing.
const TRANSITIONS = {
  draft: ['review', 'published'],
  review: ['published', 'draft'],
  published: ['review', 'draft'],
};

const today = () => new Date().toISOString().slice(0, 10); // YYYY-MM-DD

function die(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

function postPath(slug) {
  return join(POSTS_DIR, `${slug}.md`);
}

// Split a Markdown file into [frontmatterLines, bodyString].
function splitFrontmatter(raw, slug) {
  const lines = raw.split('\n');
  if (lines[0] !== '---') die(`${slug}: no frontmatter block`);
  const end = lines.indexOf('---', 1);
  if (end === -1) die(`${slug}: unterminated frontmatter block`);
  return [lines.slice(1, end), lines.slice(end + 1).join('\n')];
}

function readField(fmLines, key) {
  const re = new RegExp(`^${key}:\\s*(.*)$`);
  for (const line of fmLines) {
    const m = line.match(re);
    if (m) return m[1].trim();
  }
  return undefined;
}

// Set (or insert) a `key: value` line in the frontmatter.
function setField(fmLines, key, value) {
  const re = new RegExp(`^${key}:\\s*`);
  const idx = fmLines.findIndex((l) => re.test(l));
  const line = `${key}: ${value}`;
  if (idx === -1) fmLines.push(line);
  else fmLines[idx] = line;
}

function writePost(slug, fmLines, body) {
  const out = `---\n${fmLines.join('\n')}\n---\n${body.replace(/^\n/, '\n')}`;
  writeFileSync(postPath(slug), out);
}

function listSlugs() {
  if (!existsSync(POSTS_DIR)) return [];
  return readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith('.md') || f.endsWith('.mdx'))
    .map((f) => f.replace(/\.(md|mdx)$/, ''));
}

// --- commands ---

function cmdNew(slug, opts) {
  if (!slug) die('usage: content new <slug> [--title "..."]');
  const path = postPath(slug);
  if (existsSync(path)) die(`${slug} already exists`);
  const title =
    opts.title ??
    slug.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const fm = [
    `title: ${JSON.stringify(title)}`,
    'description: ""',
    'author: qriib',
    'status: draft',
    'draft: true',
    `pubDate: ${today()}`,
    'category: ""',
    'tags: []',
    'featured: false',
  ];
  writeFileSync(
    path,
    `---\n${fm.join('\n')}\n---\n\n# ${title}\n\nStart writing here.\n`,
  );
  console.log(`✓ created draft: src/content/posts/${slug}.md`);
}

function cmdStatus(slug, next) {
  if (!slug || !next) die('usage: content status <slug> <draft|review|published>');
  if (!STATES.includes(next)) die(`unknown state "${next}" (${STATES.join(', ')})`);
  const path = postPath(slug);
  if (!existsSync(path)) die(`no such piece: ${slug}`);

  const [fm, body] = splitFrontmatter(readFileSync(path, 'utf8'), slug);
  const current = readField(fm, 'status') ?? 'draft';
  if (current === next) {
    console.log(`• ${slug} is already "${next}" — nothing to do`);
    return;
  }
  if (!(TRANSITIONS[current] ?? []).includes(next)) {
    die(
      `illegal transition ${current} -> ${next}. ` +
        `allowed from ${current}: ${(TRANSITIONS[current] ?? []).join(', ') || '(none)'}`,
    );
  }

  setField(fm, 'status', next);
  // Keep the derived production-visibility flag in sync.
  setField(fm, 'draft', next === 'published' ? 'false' : 'true');
  setField(fm, 'updatedDate', today());
  // On first publish, anchor pubDate to today if it was a placeholder default.
  if (next === 'published' && !readField(fm, 'pubDate')) {
    setField(fm, 'pubDate', today());
  }
  writePost(slug, fm, body);
  console.log(`✓ ${slug}: ${current} -> ${next}`);
}

function cmdList(opts) {
  const slugs = listSlugs();
  if (!slugs.length) {
    console.log('(no content pieces yet — try: content new my-first-post)');
    return;
  }
  const rows = slugs
    .map((slug) => {
      const [fm] = splitFrontmatter(readFileSync(postPath(slug), 'utf8'), slug);
      return {
        slug,
        status: readField(fm, 'status') ?? 'draft',
        title: (readField(fm, 'title') ?? '').replace(/^["']|["']$/g, ''),
      };
    })
    .filter((r) => !opts.state || r.status === opts.state)
    .sort((a, b) => STATES.indexOf(a.status) - STATES.indexOf(b.status));

  const w = Math.max(...rows.map((r) => r.slug.length), 4);
  console.log(`${'SLUG'.padEnd(w)}  STATUS      TITLE`);
  for (const r of rows) {
    console.log(`${r.slug.padEnd(w)}  ${r.status.padEnd(10)}  ${r.title}`);
  }
}

// --- arg parsing ---

function parseFlags(argv) {
  const opts = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) opts[argv[i].slice(2)] = argv[++i];
    else positional.push(argv[i]);
  }
  return { opts, positional };
}

const [cmd, ...rest] = process.argv.slice(2);
const { opts, positional } = parseFlags(rest);

switch (cmd) {
  case 'new':
    cmdNew(positional[0], opts);
    break;
  case 'status':
    cmdStatus(positional[0], positional[1]);
    break;
  case 'list':
    cmdList(opts);
    break;
  default:
    console.log(
      [
        'qriib content workflow CLI',
        '',
        '  node scripts/content.mjs new <slug> [--title "..."]   scaffold a draft',
        '  node scripts/content.mjs status <slug> <state>        draft|review|published',
        '  node scripts/content.mjs list [--state <state>]       show all pieces',
      ].join('\n'),
    );
    if (cmd && cmd !== 'help') process.exit(1);
}
