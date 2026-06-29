# AI-assisted content pipeline

The throughput engine: turn a structured editorial **brief** into a publishable
**draft**, landed in the [authoring workflow](./CONTENT.md) as `draft` for human
review. This lets a small team scale output without scaling headcount — the AI
drafts and enriches; a human still reviews, edits, and publishes.

```
brief.json ──▶ scripts/pipeline.mjs ──▶ Claude ──▶ src/content/posts/<slug>.md (status: draft)
                                                              │
                                                              ▼
                                          node scripts/content.mjs status <slug> review → published
```

The pipeline is deliberately a thin slice: one model call per draft, structured
output so the result always parses, and the existing `createDraft()` helper in
`scripts/content.mjs` as the single writer of the on-disk format — so AI drafts
and hand-authored drafts are byte-identical in shape and move through the exact
same workflow.

## The brief

A brief is a JSON file describing what to write. Only `topic` is required;
everything else sharpens the output. See [`briefs/example-brief.json`](../briefs/example-brief.json).

| Field             | Required | Purpose                                                        |
| ----------------- | -------- | -------------------------------------------------------------- |
| `topic`           | **yes**  | What the piece is about.                                       |
| `title`           | no       | Working title (the model may refine it).                       |
| `angle`           | no       | The specific take / thesis.                                    |
| `audience`        | no       | Who it's for — shapes voice and depth.                         |
| `tone`            | no       | e.g. "practical, no hype".                                     |
| `category`        | no       | Primary taxonomy bucket.                                       |
| `keywords`        | no       | Target SEO terms, woven in naturally.                          |
| `targetWordCount` | no       | Length target (hit within ~15%).                               |
| `keyPoints`       | no       | Must-cover points — the model covers every one.                |
| `notes`           | no       | Anything else (CTA, constraints).                              |
| `slug`            | no       | Output filename; otherwise derived from title/topic.           |

## Running it

```bash
# Dry run — builds the prompt and lands a placeholder draft. NO API call, NO spend.
# Use this to validate the brief and prove the round-trip end to end.
npm run draft -- briefs/example-brief.json --dry-run

# Real run — requires ANTHROPIC_API_KEY (see below). Generates the draft and
# reports cost + time for the run.
npm run draft -- briefs/example-brief.json

# Agent-supplied content — land a draft from a pre-generated content JSON
# (same shape the model returns). NO external API call, NO spend. An
# orchestrating AI agent generates the draft and round-trips it through the
# same authoring writer the SDK path uses.
npm run draft -- briefs/example-brief.json --from-content briefs/example-brief.content.json

# Then review it like any other draft:
node scripts/content.mjs status scaling-content-without-scaling-headcount review
```

Options: `--model claude-opus-4-8|claude-sonnet-4-6` (default opus),
`--effort low|medium|high` (default high), `--slug <slug>`, `--overwrite`,
`--from-content <file.json>` (land agent-generated content, no API call).

There are two ways the AI content reaches a draft: the **SDK path** (`@anthropic-ai/sdk`
+ `ANTHROPIC_API_KEY`, for unattended/batch runs) and the **agent-supplied path**
(`--from-content`, where an orchestrating agent generates the content and lands it
with zero external spend). Both go through the same `createDraft()` writer.

## Model & configuration

- Uses the official `@anthropic-ai/sdk` and Claude per the `claude-api` skill.
- Default model **`claude-opus-4-8`**; `claude-sonnet-4-6` is the cheaper option
  for higher volume.
- Streaming + adaptive thinking + the `effort` parameter drive quality;
  structured output (`output_config.format`) guarantees the draft parses.
- Set `ANTHROPIC_API_KEY` in `.env` (see `.env.example`). Without a key, only
  `--dry-run` works.

## Unit economics

Every real run prints the actual cost and time for that draft:

```
── unit economics ───────────────────────────
  model        claude-opus-4-8
  input tokens 480
  output tokens 3900
  draft length ~820 words
  time         24.3s
  est. cost    $0.0999 / draft
  → ~10 drafts per $1 of model spend
```

Cost is computed from `usage` tokens × the per-model pricing in `pipeline.mjs`
(Opus 4.8 $5/$25 per 1M in/out; Sonnet 4.6 $3/$15). **Rough planning estimate**
for an ~800-word draft: **~$0.05–0.15 on Opus, ~$0.03–0.09 on Sonnet** (varies
with effort and how much the model thinks) — i.e. on the order of **7–30 drafts
per dollar** of model spend. Real runs replace these estimates with measured
numbers; drop `--effort` to `medium`/`low` to trade some quality for lower cost
at volume.

## ⚠️ Model spend — flag to the CEO

Real runs call a paid API. This is net-new model spend on the cost structure.
Before turning the pipeline loose at volume, the CEO should sign off on the
budget and we should set a spend ceiling. The pipeline's per-draft cost
reporting exists precisely so spend stays observable.

## What's automated vs. human

| Automated (pipeline)                          | Stays human (review gate)                 |
| --------------------------------------------- | ----------------------------------------- |
| First draft from the brief                    | Editorial judgment, final voice           |
| SEO metadata (description, tags, category)    | Fact-checking — the model is told **not** to invent stats/quotes |
| Hitting structure, length, keyword coverage   | Deciding what's good enough to publish     |

Drafts land as `draft` and **never** ship to production until a human moves them
to `published`. The workflow's production-only-publishes guarantee (see
[CONTENT.md](./CONTENT.md)) is unchanged.
