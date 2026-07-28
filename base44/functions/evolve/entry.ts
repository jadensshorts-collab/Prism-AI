// Prism AI â€” Evolution Mode. Generates an ORIGINAL product concept inspired by
// the analysis: not a clone, a leap. Consumes innovation opportunities,
// competitor weaknesses, and psychology/growth gaps.
import { createClientFromRequest } from "npm:@base44/sdk";

// --- Groq LLM client -------------------------------------------------------
// Groq meters tokens-per-minute per model, so calls fail over across the
// line-up. Structured output uses json_object mode with the schema inlined in
// the prompt (strict json_schema is only supported by part of the line-up).
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
// A single call may spend at most this long retrying across models. Beyond
// it we fail fast so the surrounding function finishes well inside the
// platform's request timeout and the caller can retry just that piece.
const RETRY_BUDGET_MS = 110000;

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
    if (Number.isFinite(ra) && ra > 0) (err as { retryAfterMs?: number }).retryAfterMs = Math.min(ra * 1000, 8000);
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
    `exactly â€” populate every field and keep enum values verbatim:\n${JSON.stringify(schema)}`;
  let lastErr: unknown;
  const deadline = Date.now() + RETRY_BUDGET_MS;
  // Two passes: the first rotates models, the second waits out the rolling
  // token window so earlier work in the same minute cannot permanently fail this call.
  for (let pass = 0; pass < 2; pass++) {
    for (const model of order) {
      if (Date.now() > deadline) break;
      try {
        return extractJson(await groqChat(full, model, opts.maxTokens ?? 2600, true));
      } catch (err) {
        lastErr = err;
        const e429 = err as { rateLimited?: boolean; retryAfterMs?: number };
        if (e429?.rateLimited) await sleep(Math.min(e429.retryAfterMs ?? 1200, 8000));
      }
    }
    if (pass === 0 && Date.now() < deadline) await sleep(4000);
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

async function groqText(prompt: string, maxTokens = 2600, model?: string): Promise<string> {
  const order = [model || MODELS[0], ...MODELS].filter((v, i, a) => a.indexOf(v) === i);
  let lastErr: unknown;
  const deadline = Date.now() + RETRY_BUDGET_MS;
  // Two passes: the first rotates models, the second waits out the rolling
  // token window so earlier work in the same minute cannot permanently fail this call.
  for (let pass = 0; pass < 2; pass++) {
    for (const m of order) {
      if (Date.now() > deadline) break;
      try {
        const out = await groqChat(prompt, m, maxTokens, false);
        if (out && out.trim()) return out;
      } catch (err) {
        lastErr = err;
        const e429 = err as { rateLimited?: boolean; retryAfterMs?: number };
        if (e429?.rateLimited) await sleep(Math.min(e429.retryAfterMs ?? 1200, 8000));
      }
    }
    if (pass === 0 && Date.now() < deadline) await sleep(4000);
  }
  throw lastErr instanceof Error ? lastErr : new Error("Groq returned no content");
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: { projectId?: string } = {};
  try {
    body = await req.json();
  } catch {
    // fallthrough
  }
  const { projectId } = body;
  if (!projectId) return Response.json({ error: "projectId is required" }, { status: 400 });

  const project = await base44.entities.Project.get(projectId).catch(() => null);
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  const sections = await base44.entities.ReportSection.filter({
    project_id: projectId,
    status: "complete",
  });
  // Condensed rather than raw: the full layer JSON would exceed the model's
  // per-minute token ceiling, and the concept only needs the findings.
  const summarize = (d: Record<string, any> | null) => {
    if (!d) return "(unavailable)";
    const out: string[] = [];
    const take = (a: unknown, n: number, f: (x: any) => string) =>
      Array.isArray(a) ? a.slice(0, n).map(f) : [];
    if (typeof d.score === "number") out.push(`score ${Math.round(d.score)}/100`);
    for (const k of ["business_model", "overall_assessment", "stack_summary", "summary", "market_position"]) {
      if (typeof d[k] === "string" && d[k]) out.push(String(d[k]).slice(0, 260));
    }
    out.push(...take(d.weaknesses, 3, (x) => `weakness: ${String(x).slice(0, 130)}`));
    out.push(...take(d.monetization_opportunities, 3, (x) => `money gap: ${String(x).slice(0, 130)}`));
    out.push(...take(d.missing_techniques, 3, (t) => `missing: ${t?.name} â€” ${String(t?.opportunity || "").slice(0, 100)}`));
    out.push(...take(d.opportunities, 6, (o) => `opportunity: ${o?.title} â€” ${String(o?.description || "").slice(0, 120)}`));
    out.push(...take(d.competitors, 4, (c) => `rival ${c?.name}: weak at ${(c?.weaknesses || []).slice(0, 2).join("; ").slice(0, 100)}`));
    if (d.white_space) out.push(`white space: ${String(d.white_space).slice(0, 220)}`);
    return out.join("\n").slice(0, 1200);
  };

  const digest = sections
    .map((s: { section_key: string; data: Record<string, any> }) => `### ${s.section_key}\n${summarize(s.data)}`)
    .join("\n\n")
    .slice(0, 7000);

  const prompt = `You are Prism AI's Evolution Engine. You just analyzed "${project.product_name}" (${project.category}). Your job is NOT to clone it. Your job is to conceive an ORIGINAL new product that wins where the analyzed product is weak â€” powered by the untapped opportunities, competitor weaknesses, and psychology/growth gaps in the analysis below.

Rules:
- The concept must be original and differentiated, not "${project.product_name} but better".
- It should feel like a fundable startup: sharp wedge, clear target user, obvious first win.
- AI should be woven into the core workflow, not bolted on.
- Every feature must map to a real gap found in the analysis.
- Give it a memorable name that is NOT derivative of "${project.product_name}".

ANALYSIS OF ${project.product_name}:
Overview: ${JSON.stringify(project.overview || {}).slice(0, 1800)}

${digest}`;

  const schema = {
    type: "object",
    properties: {
      name: { type: "string", description: "Memorable product name" },
      tagline: { type: "string" },
      elevator_pitch: { type: "string", description: "3-4 sentence pitch" },
      inspired_by_gaps: {
        type: "array",
        items: { type: "string" },
        description: "The specific gaps in the analyzed product this concept exploits",
      },
      target_users: {
        type: "array",
        items: {
          type: "object",
          properties: {
            persona: { type: "string" },
            pain: { type: "string" },
            win: { type: "string", description: "What this persona gets on day one" },
          },
        },
      },
      differentiators: { type: "array", items: { type: "string" } },
      core_features: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            description: { type: "string" },
            gap_addressed: { type: "string" },
          },
        },
        description: "5-7 core features",
      },
      ai_integrations: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            description: { type: "string" },
          },
        },
      },
      improved_workflows: {
        type: "array",
        items: {
          type: "object",
          properties: {
            original_flaw: { type: "string" },
            better_approach: { type: "string" },
          },
        },
      },
      monetization: {
        type: "object",
        properties: {
          model: { type: "string" },
          tiers: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                price: { type: "string" },
                includes: { type: "string" },
              },
            },
          },
          rationale: { type: "string" },
        },
      },
      moat: { type: "string", description: "Why this stays defensible" },
      north_star_metric: { type: "string" },
      why_it_wins: { type: "string", description: "The closing argument, 2-3 sentences" },
    },
    required: ["name", "tagline", "elevator_pitch", "core_features", "differentiators"],
  };

  try {
    const data = await groqJson(prompt, schema, { maxTokens: 3200 });
    const row = await base44.entities.Evolution.create({
      project_id: projectId,
      title: data.name || "Evolution Concept",
      data,
    });
    return Response.json({ ok: true, evolutionId: row.id, data });
  } catch (err) {
    return Response.json({ error: String(err?.message || err) }, { status: 500 });
  }
});
