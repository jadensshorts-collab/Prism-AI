# Prism AI

**Reveal the hidden layers behind every product.**

An AI product-intelligence platform built on the **Base44 Backend** for the Base44 Dev Build-Off (July 21–28, 2026).

**Live app:** https://prism-ai-web.base44.app

---

## The problem

Every founder, PM, and indie hacker studies products they admire — then guesses. They can see the surface (the UI, the pricing page) but not the layers underneath: why the onboarding is shaped that way, which habit loop drives retention, where the business is actually exposed. That research takes days and usually produces a document nobody acts on.

Prism compresses it into well under a minute, and — critically — doesn't stop at analysis. It converts findings into an original product concept, a build-ready PRD, and prompts tuned to the AI builder you'll actually use.

## What it does

1. **Reveal** — paste any product URL. A backend pipeline runs eight AI analysis passes in parallel: recon, business, design, technology, psychology, growth, competitors, then an innovation synthesis that reads all the other layers.
2. **Understand** — an interactive report: per-layer scores, a six-facet Innovation Meter, competitor threat cards, decoded persuasion techniques, and 8–10 untapped opportunities.
3. **Consult** — an AI Product Strategist grounded in the stored report, citing its actual findings.
4. **Evolve** — Evolution Mode conceives an *original* product exploiting the analyzed product's gaps. Never a clone.
5. **Build** — a 16-section PRD, a scored AI-builder recommendation, and eight platform-native prompts (Base44, Claude Code, Cursor, Lovable, v0, Replit, Windsurf, Codex).
6. **Keep** — every deliverable is rendered on the backend and persisted, ready to re-download.

---

## How Base44 is used (architecture)

Prism is not a frontend calling an AI API. The backend owns the workflow:

```
User submits a URL
      ↓
Project entity created (status: analyzing)
      ↓
`analyze` backend function (Deno) orchestrates the pipeline
      ↓  recon pass  →  7 layer passes in PARALLEL  →  innovation synthesis
      ↓  (each pass pinned to a different model, structured JSON out)
      ↓
Each layer written to a ReportSection row as it lands
      ↓
Realtime entity subscriptions stream progress to the client
      ↓
Interactive report → Strategist → Evolution → PRD → Builder prompts
      ↓
`export-artifact` renders markdown server-side → chunked Artifact rows
```

### Backend capabilities used (10)

| Capability | How Prism uses it |
|---|---|
| **Authentication** | Base44 auth guards the workspace. A custom `/login` page drives Google OAuth, email/password, and OTP-verified registration through Base44's auth endpoints. |
| **Database entities** | 7 related entities: `Project`, `ReportSection`, `ChatMessage`, `Evolution`, `Prd`, `GeneratedPrompt`, `Artifact`. |
| **Row-level security** | Every entity is creator-scoped (`created_by == user.email`) for read/update/delete — users can only ever reach their own intelligence. |
| **Backend functions** | 10 Deno functions: `analyze`, `retry-section`, `strategist`, `evolve`, `generate-prd`, `generate-prompts`, `export-artifact`, `share-report`, `public-report`, `delete-project` (cascading delete across six entities). |
| **AI orchestration** | Roughly 20 structured LLM calls per full workflow, fanned out across six models via Groq, with schema-guided JSON output and cross-model failover. |
| **AI Agents** | The `prism_analyst` agent is defined and deployed with RLS-scoped **entity tool access** to `Project`, `ReportSection`, `Evolution`, `Prd`, and `GeneratedPrompt`, plus per-user memory. Verified making real `read_Project` / `read_ReportSection` tool calls and answering from stored data, with the UI surfacing each call. The agent runtime is metered by the workspace's integration quota; when that quota is exhausted the Strategist transparently falls back to the `strategist` backend function, which grounds the same answers in the stored report. |
| **Realtime** | Entity `subscribe()` streams pipeline progress live; agent conversations stream tool activity via `subscribeToConversation`. Events act as signals that trigger targeted refetches (the SDK slims payloads over 10 KB). |
| **Service role** | `public-report` reads shared reports via `asServiceRole` — the single, tightly-scoped path that bypasses RLS, gated on an exact 32-hex token match plus an `is_public` flag. |
| **Analytics** | `analytics.track` records workflow milestones (`analysis_started`, `evolve_generated`, `prompts_generated`, `report_shared`). |
| **Hosting** | Custom Vite/React site deployed via `base44 deploy`. |

### Working inside a hard rate limit

The inference tier meters **tokens per minute, per model**. A naive pipeline firing seven concurrent analyses at one model dies instantly. Prism treats the limit as an architectural constraint:

- **Model fan-out.** Every layer is pinned to a different model, so seven concurrent calls sit in seven separate rate-limit buckets instead of one.
- **Condensed synthesis context.** The innovation pass, Evolution Mode, and the Strategist never receive raw layer JSON — each layer is reduced to the findings that stage actually reasons over, which keeps prompts inside the window without losing substance.
- **Waved compilation.** The eight builder prompts compile two at a time with spacing, so no model is asked for more than its per-minute budget.
- **Cross-model failover.** A rate-limited or malformed response retries down the model list rather than failing the section.
- **Reasoning stripped.** Some models emit `<think>` blocks; those are removed before anything is stored or displayed.

### Public sharing (a second, no-login surface)

Reports are private by default. An owner can mint a share link, publishing a read-only report at `/r/:token` that anyone can open **without an account**. Security was tested explicitly:

| Case | Result |
|---|---|
| Valid token | 200 — full report, 7 sections |
| Owner email / internal fields in payload | Never returned |
| Unknown token | 404 |
| Malformed token | 400, rejected before any database lookup |
| Revoked link | 404 — the token is cleared, killing links already in circulation |

### Other engineering decisions

- **Per-section resilience.** Failures are isolated to their row; `retry-section` re-runs exactly one layer, and the innovation pass re-reads its siblings when regenerated.
- **Two-pass PRD.** Product and engineering halves generate concurrently on different models, then stitch — deeper than one prompt produces in a single pass.
- **Chunked storage.** Entity string fields are size-capped, so PRDs and exported documents are split at paragraph boundaries across ordered `group_id`/`part` rows and reassembled on read.
- **Rate limiting.** A per-user hourly cap is enforced server-side inside `analyze`.
- **Stall detection.** A backend function is capped at five minutes; if a run is killed mid-pipeline the client detects the silence and offers an honest restart instead of spinning forever.

---

## Verified end-to-end

Measured against the deployed app, not estimated:

- Full analysis of a previously unseen product (Notion): 7/7 layers, innovation 88, every enum honoured, 14 technologies detected, 5 competitors
- Evolution concept 4 s → 16-section PRD 12 s → **8/8 builder prompts, 0 failures**
- Strategist replies in 2–3 s citing competitors by name from the stored report
- Section retry re-runs a single layer in ~3 s
- Every invalid input (bad section key, empty message, 2 000-char overflow, unknown export kind) returns a clean 400 — no 500s
- Export rendered and persisted server-side, re-downloadable
- Realtime: subscription round-trip confirmed delivering update events
- Public share: anonymous request returned the full report; revoked links correctly 404
- Cascading delete removed all 20 child rows with zero orphans

## Engineering audit

The app was audited end-to-end rather than spot-checked. Defects found and fixed:

| Issue | Impact |
|---|---|
| Animated score rendered a literal **0** whenever `requestAnimationFrame` was throttled (background tab, capture tools) | The headline Innovation Score displayed a *wrong* number, not a neutral one |
| Timestamps returned without a timezone marker were parsed as local time | West of UTC every record parsed as *future*, so all relative times silently read "just now" |
| SDK analytics heartbeat looped `User/me` → 401 → flush forever for logged-out visitors | Continuous failed requests on every public page |
| Session resolved from local storage alone | Cookie-authenticated returning visitors were signed out on every visit |
| No React error boundary | A single unexpected data shape white-screened the whole app |
| Deleting an analysis orphaned its sections, PRDs, prompts and exports | Silent data leak; now a cascading server-side delete |
| `useEffect` depending on the state it wrote (Compare) | Duplicate fetches, and infinite retries on failure |
| Realtime events dropped while a refresh was in flight | The final pipeline update could be missed for up to 15 s |
| A client network error marked a *running* analysis as failed | A dropped connection killed a healthy pipeline |
| No Open Graph tags, static page title | Shared report links previewed as bare URLs — on a share-driven product |
| Icon-only buttons unnamed; no focus ring; motion ignored the OS preference | Unusable by screen-reader and keyboard users |
| Whole app shipped in one 679 kB bundle | Landing visitors downloaded the report renderer and markdown engine they never used — now split, 38 % smaller first load |

Security was tested rather than assumed: the post-login redirect sanitiser rejects protocol-relative URLs, `javascript:`, backslash tricks, and domain-suffix confusion; all nine authenticated backend functions were probed unauthenticated and every one returned 401; and model-generated content is never rendered as raw HTML.

---

## Development

```bash
npm install
npx base44 dev
```

Requires native Deno for local backend functions, and a `GROQ_API_KEY` secret:

```bash
npx base44 secrets set "GROQ_API_KEY=your-key"
```

Deploy:

```bash
npm run build && npx base44 deploy -y
```

### Layout

- `base44/entities/*.jsonc` — 7 data models with row-level security
- `base44/agents/*.jsonc` — the `prism_analyst` agent and its entity tools
- `base44/functions/*/entry.ts` — 10 Deno backend functions
- `src/` — React client (Tailwind, framer-motion, react-router)
- `src/dev/` — dev-only visual QA harness, excluded from production builds
