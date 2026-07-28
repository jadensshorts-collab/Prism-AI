// Prism AI — PRD Generator. Produces a complete, build-ready Product
// Requirements Document from an Evolution concept. Generated in two focused
// passes (product + engineering) for depth, then stitched into one document.
import { createClientFromRequest } from "npm:@base44/sdk";

// --- Groq LLM client -------------------------------------------------------
// Groq meters tokens-per-minute per model, so calls fail over across the
// line-up. Structured output uses json_object mode with the schema inlined in
// the prompt (strict json_schema is only supported by part of the line-up).
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODELS = [
  "llama-3.3-70b-versatile",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3.6-27b",
  "llama-3.1-8b-instant",
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function groqChat(prompt: string, model: string, maxTokens: number, json: boolean) {
  const key = Deno.env.get("GROQ_API_KEY");
  if (!key) throw new Error("GROQ_API_KEY is not configured");
  const body: Record<string, unknown> = {
    model,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_completion_tokens: maxTokens,
  };
  if (json) body.response_format = { type: "json_object" };
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    const err = new Error(e?.error?.message || `Groq HTTP ${res.status}`) as Error & { rateLimited?: boolean };
    err.rateLimited = res.status === 429;
    // Token budgets refill on a rolling minute, so respect the server's hint
    // instead of guessing at a delay.
    const ra = Number(res.headers.get("retry-after"));
    if (Number.isFinite(ra) && ra > 0) (err as { retryAfterMs?: number }).retryAfterMs = Math.min(ra * 1000, 20000);
    throw err;
  }
  const data = await res.json();
  return stripReasoning((data?.choices?.[0]?.message?.content ?? "") as string);
}

// Some models emit chain-of-thought in <think> blocks. None of that belongs
// in user-facing output, so strip it before the text is stored or shown.
function stripReasoning(text: string): string {
  const THINK_BLOCK = new RegExp('<think>[\\s\\S]*?</think>', 'gi');
  const THINK_TAG = new RegExp('</?think>', 'gi');
  return text.replace(THINK_BLOCK, '').replace(THINK_TAG, '').trim();
}

function extractJson(text: string): Record<string, any> {
  const cleaned = text.replace(/^\`\`\`(?:json)?/i, "").replace(/\`\`\`$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // fall through to brace scanning
  }
  const start = cleaned.indexOf("{");
  if (start === -1) throw new Error("Model returned no JSON object");
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < cleaned.length; i++) {
    const c = cleaned[i];
    if (esc) { esc = false; continue; }
    if (c === "\\") { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return JSON.parse(cleaned.slice(start, i + 1));
  }
  throw new Error("Model returned truncated JSON");
}

async function groqJson(
  prompt: string,
  schema: Record<string, unknown>,
  opts: { model?: string; maxTokens?: number } = {},
): Promise<Record<string, any>> {
  const order = [opts.model || MODELS[0], ...MODELS].filter((v, i, a) => a.indexOf(v) === i);
  const full =
    `${prompt}\n\nRespond with a single JSON object and nothing else. Match this schema ` +
    `exactly — populate every field and keep enum values verbatim:\n${JSON.stringify(schema)}`;
  let lastErr: unknown;
  // Two passes: the first rotates models, the second waits out the rolling
  // token window so earlier work in the same minute cannot permanently fail this call.
  for (let pass = 0; pass < 2; pass++) {
    for (const model of order) {
      try {
        return extractJson(await groqChat(full, model, opts.maxTokens ?? 2600, true));
      } catch (err) {
        lastErr = err;
        const e429 = err as { rateLimited?: boolean; retryAfterMs?: number };
        if (e429?.rateLimited) await sleep(e429.retryAfterMs ?? 1500);
      }
    }
    if (pass === 0) await sleep(8000);
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

async function groqText(prompt: string, maxTokens = 2600, model?: string): Promise<string> {
  const order = [model || MODELS[0], ...MODELS].filter((v, i, a) => a.indexOf(v) === i);
  let lastErr: unknown;
  // Two passes: the first rotates models, the second waits out the rolling
  // token window so earlier work in the same minute cannot permanently fail this call.
  for (let pass = 0; pass < 2; pass++) {
    for (const m of order) {
      try {
        const out = await groqChat(prompt, m, maxTokens, false);
        if (out && out.trim()) return out;
      } catch (err) {
        lastErr = err;
        const e429 = err as { rateLimited?: boolean; retryAfterMs?: number };
        if (e429?.rateLimited) await sleep(e429.retryAfterMs ?? 1500);
      }
    }
    if (pass === 0) await sleep(8000);
  }
  throw lastErr instanceof Error ? lastErr : new Error("Groq returned no content");
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: { projectId?: string; evolutionId?: string } = {};
  try {
    body = await req.json();
  } catch {
    // fallthrough
  }
  const { projectId, evolutionId } = body;
  if (!projectId || !evolutionId) {
    return Response.json({ error: "projectId and evolutionId are required" }, { status: 400 });
  }

  const [project, evolution] = await Promise.all([
    base44.entities.Project.get(projectId).catch(() => null),
    base44.entities.Evolution.get(evolutionId).catch(() => null),
  ]);
  if (!project || !evolution) {
    return Response.json({ error: "Project or evolution not found" }, { status: 404 });
  }

  // Bounded so each half of the PRD stays inside the model's token window.
  const concept = JSON.stringify(evolution.data, null, 2).slice(0, 6000);
  const marketContext = JSON.stringify(
    {
      analyzed_product: project.product_name,
      category: project.category,
      overview: project.overview,
      layer_scores: project.layer_scores,
    },
    null,
    2,
  ).slice(0, 2000);

  const shared = `You are Prism AI's PRD engine writing a production-grade Product Requirements Document for "${evolution.title}" — an original product concept born from analyzing ${project.product_name}.

The PRD must be detailed enough that an AI coding agent could build the product from it alone. Write in clean markdown with ## section headers and ### subsections. Be specific: real field names, real flows, real priorities. No filler like "this section describes...".

PRODUCT CONCEPT:
${concept}

MARKET CONTEXT (from the analysis that inspired this concept):
${marketContext}`;

  const productPass = `${shared}

Write ONLY these sections, in this order:

## 1. Product Vision
## 2. Problem Statement
## 3. User Personas
(3 personas: name, role, context, pains, gains, quote)
## 4. User Journeys
(the 3 most important end-to-end journeys, step by step)
## 5. Features & Requirements
(every feature with: description, user stories, acceptance criteria)
## 6. Feature Prioritization
(MoSCoW table: Must / Should / Could / Won't for v1)

Start directly with "## 1. Product Vision".`;

  const engineeringPass = `${shared}

Write ONLY these sections, in this order (continue numbering from 7):

## 7. Database Structure
(every entity with fields, types, and relationships — use tables)
## 8. Backend Architecture
(services, background jobs, pipelines, rate limiting)
## 9. API Requirements
(each endpoint: method, path, payload, response, auth)
## 10. Authentication & Permissions
(auth flows, roles, row-level access rules)
## 11. AI Systems
(each AI feature: model role, prompt strategy, structured outputs, fallbacks)
## 12. Notifications
## 13. Analytics & Success Metrics
(events to track, KPIs, north star)
## 14. Edge Cases & Error Handling
## 15. Launch Plan
(pre-launch, launch week, post-launch)
## 16. Future Roadmap
(v1.1 through v2.0)

Start directly with "## 7. Database Structure".`;

  try {
    // Two halves in parallel on different models so they sit in separate
    // rate-limit buckets and the PRD comes back in one round trip.
    const [part1, part2] = await Promise.all([
      groqText(productPass, 4000, "llama-3.3-70b-versatile"),
      groqText(engineeringPass, 4000, "openai/gpt-oss-120b"),
    ]);
    const toText = (r: unknown) => (typeof r === "string" ? r : JSON.stringify(r));
    const content = `# ${evolution.title} — Product Requirements Document\n\n> Generated by Prism AI from the analysis of ${project.product_name}.\n\n${toText(part1).trim()}\n\n${toText(part2).trim()}\n`;

    // Entity string fields are size-capped (~16-24k chars), so a full PRD is
    // stored as an ordered group of chunk rows split at paragraph boundaries.
    const CHUNK = 14000;
    const chunks: string[] = [];
    let buf = "";
    for (const para of content.split("\n")) {
      if (buf.length + para.length + 1 > CHUNK && buf) {
        chunks.push(buf);
        buf = "";
      }
      buf += (buf ? "\n" : "") + para;
    }
    if (buf) chunks.push(buf);

    const groupId = crypto.randomUUID();
    let firstId = "";
    for (let i = 0; i < chunks.length; i++) {
      const row = await base44.entities.Prd.create({
        project_id: projectId,
        evolution_id: evolutionId,
        title: `${evolution.title} PRD`,
        content: chunks[i],
        group_id: groupId,
        part: i,
        parts_total: chunks.length,
      });
      if (i === 0) firstId = row.id;
    }
    return Response.json({ ok: true, prdId: firstId, parts: chunks.length });
  } catch (err) {
    return Response.json({ error: String(err?.message || err) }, { status: 500 });
  }
});
