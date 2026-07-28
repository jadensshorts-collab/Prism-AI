# Prism AI

**Reveal the hidden layers behind every product.**

An AI product-intelligence platform built on the **Base44 Backend** for the Base44 Dev Build-Off (July 21–28, 2026).

**Live app:** https://prism-ai-76d06220.base44.app
**Base44 App ID:** `6a67a71379a7f66c76d06220`

---

## The problem

Every founder, PM, and indie hacker studies products they admire — then guesses. They can see the surface (the UI, the pricing page) but not the layers underneath: why the onboarding is shaped that way, which habit loop drives retention, where the business is actually exposed. That research takes days and usually produces a doc nobody acts on.

Prism compresses it into under a minute, and — critically — doesn't stop at analysis. It converts findings into an original product concept, a build-ready PRD, and prompts tuned to the AI builder you'll actually use.

## What it does

1. **Reveal** — paste any product URL. A backend pipeline runs 8 AI research passes in parallel with live internet context: recon, business, design, technology, psychology, growth, competitors, then an innovation synthesis that reads all the other layers.
2. **Understand** — an interactive report: per-layer scores, a six-facet Innovation Meter, competitor threat cards, decoded persuasion techniques, and 8–10 untapped opportunities.
3. **Consult** — an AI Product Strategist chat grounded in the stored report, citing its actual findings.
4. **Evolve** — Evolution Mode conceives an *original* product exploiting the analyzed product's gaps. Never a clone.
5. **Build** — a 16-section PRD, a scored AI-builder recommendation, and 8 platform-native prompts (Base44, Claude Code, Cursor, Lovable, v0, Replit, Windsurf, Codex).
6. **Keep** — every deliverable is rendered server-side and stored as a durable file with a permanent URL.

---

## How Base44 is used (architecture)

Prism is not a frontend calling an AI API. The backend owns the workflow:

```
User submits a URL
      ↓
Project entity created (status: analyzing)
      ↓
`analyze` backend function (Deno) orchestrates the pipeline
      ↓  recon pass  →  8 layer passes in PARALLEL  →  innovation synthesis
      ↓  (InvokeLLM, live internet context, strict JSON schemas)
      ↓
Each layer written to a ReportSection row as it lands
      ↓
Realtime entity subscriptions stream progress to the client
      ↓
Interactive report → Strategist → Evolution → PRD → Builder prompts
      ↓
`export-artifact` renders markdown server-side → Base44 file storage → Artifact row
```

### Backend capabilities used (11)

| Capability | How Prism uses it |
|---|---|
| **Authentication** | Base44 auth guards the workspace. Custom `/login` page drives Google OAuth, email/password, and OTP-verified registration through Base44's auth endpoints. |
| **Database entities** | 7 related entities: `Project`, `ReportSection`, `ChatMessage`, `Evolution`, `Prd`, `GeneratedPrompt`, `Artifact`. |
| **Row-level security** | Every entity is creator-scoped (`created_by == user.email`) for read/update/delete — users can only ever reach their own intelligence. |
| **Backend functions** | 10 Deno functions: `analyze`, `retry-section`, `strategist`, `evolve`, `generate-prd`, `generate-prompts`, `export-artifact`, `share-report`, `public-report`, `delete-project` (cascading delete across six entities). |
| **AI integration** | `InvokeLLM` with `add_context_from_internet` and strict `response_json_schema` — ~20 structured LLM calls across a full workflow, never free-text parsing. |
| **AI Agents** | The `prism_analyst` agent has RLS-scoped **entity tool access** to `Project`, `ReportSection`, `Evolution`, `Prd`, and `GeneratedPrompt`, plus per-user memory. It decides which layers to read, then answers from real stored data — the UI shows each tool call as it happens. |
| **Realtime** | Entity `subscribe()` streams pipeline progress live; agent conversations stream tool activity via `subscribeToConversation`. Events act as signals that trigger targeted refetches (SDK slims payloads >10 KB). |
| **File storage** | `UploadFile` persists server-rendered reports, PRDs, and prompt packs; URLs recorded on `Artifact` rows. |
| **Service role** | `public-report` reads shared reports via `asServiceRole` — the single, tightly-scoped path that bypasses RLS, gated on an exact 32-hex token match plus an `is_public` flag. |
| **Analytics** | `analytics.track` records workflow milestones (`analysis_started`, `evolve_generated`, `prompts_generated`, `report_shared`). |
| **Hosting** | Custom Vite/React site deployed via `base44 deploy`. |

### Public sharing (a second, no-login surface)

Reports are private by default. An owner can mint a share link, which publishes a read-only public report at `/r/:token` that anyone can open **without an account**. Security was tested explicitly:

| Case | Result |
|---|---|
| Valid token | 200 — full report, 7 sections |
| Owner email / internal fields in payload | Never returned |
| Unknown token | 404 |
| Malformed token | 400, rejected before any database lookup |
| Revoked link | 404 — the token is cleared, killing links already in circulation |

### Engineering decisions worth noting

- **Parallel fan-out.** The 8 layer passes run concurrently via `Promise.all`, cutting a ~2-minute sequential job to ~20 seconds. Each writes its own row, so a single failed layer never sinks the report.
- **Per-section resilience.** Failures are isolated and recorded on the row; `retry-section` re-runs exactly one layer, and the innovation pass re-reads its siblings when regenerated.
- **Two-pass PRD.** Product and engineering halves generate concurrently, then stitch — deeper than one prompt could produce in a single pass.
- **Chunked storage.** Base44 caps entity string fields (~16–24 KB). PRDs are split at paragraph boundaries across ordered `group_id`/`part` rows and reassembled on read.
- **Rate limiting.** Per-user hourly cap enforced server-side inside `analyze`.
- **Grounded chat.** The Strategist loads the stored report plus conversation history server-side, so answers cite real findings instead of hallucinating.
- **Deliberate omission.** `GenerateImage` works but measured **404 s** — beyond the 5-minute function ceiling. It was left out rather than ship a flow that times out mid-demo.

---

## Verified end-to-end

Measured against the deployed app, not estimated:

- Full Linear analysis: **19 s**, 7/7 sections, innovation score 91
- Agent reply: 5 s, **2 real tool calls** (`read_Project`, `read_ReportSection`), citing genuine stored findings
- Evolution → PRD → 8 prompts: ~23 s total
- Artifact exports: 20 KB report, 9 KB PRD, 27 KB prompt pack — stored and re-downloadable
- Realtime: subscription round-trip confirmed delivering update events
- Public share: anonymous request returned the full report; revoked links correctly 404
- Second full run on a previously unseen product (Canva): analyze 18 s → evolve 7 s → PRD 8 s → 8 prompts 12 s → 3 stored artifacts → share → cascading delete of 20 child rows

## Engineering audit

The app was audited end-to-end rather than spot-checked. Defects found and fixed:

| Issue | Impact |
|---|---|
| Animated score rendered a literal **0** whenever `requestAnimationFrame` was throttled (background tab, capture tools) | The headline Innovation Score displayed a *wrong* number, not a neutral one |
| SDK analytics heartbeat looped `User/me` → 401 → flush forever for logged-out visitors | Continuous failed requests on every public page; now shut down until sign-in |
| No React error boundary | A single unexpected data shape white-screened the whole app |
| Deleting an analysis orphaned its sections, PRDs, prompts and files | Silent data leak; now a cascading server-side delete (verified: 20 child rows removed) |
| `useEffect` depending on the state it wrote (Compare) | Duplicate fetches, and infinite retries on failure |
| Realtime events dropped while a refresh was in flight | Final pipeline update could be missed for up to 15 s |
| Client network error marked a *running* analysis as failed | A dropped connection killed a healthy pipeline |
| Agent failure mid-conversation silently swapped transports | Chat history appeared to vanish |
| No Open Graph / Twitter tags, static page title | Shared report links previewed as bare URLs — on a share-driven product |
| Icon-only buttons unnamed; no focus ring; motion ignored OS preference | Unusable by screen reader and keyboard users |
| 18 px tap target on the sign-up link | Below the 44 px touch minimum |
| Whole app shipped in one 679 kB bundle | Landing visitors downloaded the report renderer and markdown engine they never used — now split, 38 % smaller first load |
| Timestamps returned without a timezone marker were parsed as local time | West of UTC every record parsed as *future*, so all relative times silently read "just now"; now pinned to UTC (also corrected the server-side rate-limit window) |
| A pipeline killed by the 5-minute function ceiling left the project "analyzing" forever | No recovery path existed; a stall detector now offers an honest restart |

Security was tested rather than assumed:

- The post-login redirect sanitiser rejects protocol-relative URLs, `javascript:`, backslash tricks, and domain-suffix confusion (`…base44.app.evil.com`) — only same-origin paths survive.
- Share tokens are validated by shape (32 hex) *before* any database lookup; unknown tokens 404, malformed ones 400.
- Revoking a link clears the token, killing URLs already in circulation.
- All nine authenticated backend functions were probed unauthenticated and every one returned 401; `public-report` is the single deliberate exception and leaks no owner data.
- Model-generated content is never rendered as raw HTML — no `dangerouslySetInnerHTML`, and markdown runs without `rehype-raw`.

## Demo flow (≈2.5 minutes)

1. **Land** (0:00) — the prism refracts a beam into a spectrum. One line: *reveal the hidden layers behind every product.*
2. **Reveal** (0:15) — from the workspace, click a landmark product. The pipeline view lights up with a live "Streaming live from Base44" pulse as eight layers land one by one. **This is the wow moment — it's real realtime, not a loading animation.**
3. **Report** (0:50) — the Innovation Meter counts up to 91. Sweep the layer tabs: competitor threat cards, decoded psychology, confidence-rated tech stack.
4. **Agent** (1:20) — ask the Strategist *"where is this most vulnerable?"* Tool chips appear (*Reading the product profile → Consulting analysis layers*) before the answer, proving it reads real data.
5. **Evolve** (1:45) — Evolution Mode generates an original concept built from the gaps.
6. **Build** (2:05) — PRD → builder recommendation (Base44, scored) → eight platform-native prompts.
7. **Share** (2:25) — publish a public link and open it in a logged-out window. A stranger can read the report; the workspace stays private.

## Development

```bash
npm install
npx base44 dev
```

Requires native Deno for local backend functions. Deploy:

```bash
npm run build && npx base44 deploy -y
```

### Layout

- `base44/entities/*.jsonc` — 7 data models with row-level security
- `base44/functions/*/entry.ts` — 7 Deno backend functions
- `src/` — React client (Tailwind, framer-motion, react-router)
- `src/dev/` — dev-only visual QA harness, excluded from production builds
