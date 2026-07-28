// Prism AI — AI Builder Recommendation + platform-optimized prompt generation.
// Recommends the best AI development platform for the concept, then generates
// a distinct, platform-native build prompt for each of the 8 supported tools.
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

const PLATFORM_GUIDES: Record<string, { label: string; guide: string }> = {
  base44: {
    label: "Base44",
    guide: `Base44 builds full-stack apps from a single rich prompt, with built-in database (entities), auth, backend functions, and integrations (including LLM calls) — no external services needed.
Structure the prompt as: app summary → every page and what's on it → every entity with its fields and types → user permissions/roles → backend workflows and automations → integrations to use (LLM, email) → design direction.
Be explicit about entity fields and relationships; Base44 provisions the database from the description. Mention auth requirements (who can see what).`,
  },
  "claude-code": {
    label: "Claude Code",
    guide: `Claude Code is an agentic CLI engineer working in a real repo. It excels with clear architecture, explicit file structure, and engineering constraints.
Structure the prompt as: mission → tech stack decision (name exact frameworks/libs) → repository layout (directory tree) → data layer (schemas/migrations) → API design (routes with payloads) → key engineering decisions and tradeoffs → build order (phases) → definition of done (what must work, tests).
Write like a senior engineer's design doc: precise, no fluff, explicit about edge cases and error handling.`,
  },
  cursor: {
    label: "Cursor",
    guide: `Cursor is an AI-first IDE working incrementally in an existing codebase. It works best with step-by-step implementation plans it can execute file by file.
Structure the prompt as: goal → stack → ordered implementation steps (each step = concrete files to create/modify with what goes in them) → conventions to follow (naming, state management, styling) → what NOT to touch.
Number every step. Keep each step small enough to verify before moving on.`,
  },
  lovable: {
    label: "Lovable",
    guide: `Lovable generates beautiful React + Supabase apps and shines on UI/UX quality.
Structure the prompt as: product vibe and visual direction (colors, typography, mood, reference apps) → every screen with its layout described visually (hero, cards, navigation) → components list → responsive behavior → user flows between screens → data needs (kept simple) → micro-interactions and animation notes.
Lead with design language; be vivid about how things should look and feel.`,
  },
  v0: {
    label: "v0",
    guide: `v0 (by Vercel) generates React/Next.js components with shadcn/ui and Tailwind. It is component-first, not app-first.
Structure the prompt as: design system (palette, typography, spacing, dark/light) → the key screens as a list of components, each described precisely (props, states, variants) → layout composition per page → interactive behavior per component → responsive rules.
Ask for clean composition with shadcn/ui primitives; specify Tailwind-friendly design tokens.`,
  },
  replit: {
    label: "Replit Agent",
    guide: `Replit Agent builds and deploys full-stack apps in one cloud workspace, handling hosting and databases automatically.
Structure the prompt as: what the app does (one paragraph) → core user flows → pages → data to persist (simple schema) → external APIs/AI features → what "working" means (checklist the agent can self-verify) → deployment note (should run on Replit hosting out of the box).
Keep it outcome-oriented; Replit Agent decides implementation details itself.`,
  },
  windsurf: {
    label: "Windsurf",
    guide: `Windsurf (Codeium's agentic IDE) uses Cascade flows for multi-file changes with deep repo awareness.
Structure the prompt as: mission → stack → milestone plan (each milestone = shippable slice with the files involved) → shared conventions (state, errors, styling) → integration points between milestones → verification per milestone.
Emphasize incremental, verifiable slices so each Cascade run has a clear finish line.`,
  },
  codex: {
    label: "Codex",
    guide: `Codex (OpenAI's software engineering agent) runs autonomously against a repo and excels with unambiguous specs and testable outcomes.
Structure the prompt as: objective → constraints (stack, versions, no extra deps) → precise functional spec (inputs/outputs, routes, schemas) → acceptance tests it should make pass (describe them concretely) → code quality bar (lint, types, structure) → deliverables list.
Make everything falsifiable: if a requirement can't be verified, rewrite it so it can.`,
  },
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: { projectId?: string; prdId?: string } = {};
  try {
    body = await req.json();
  } catch {
    // fallthrough
  }
  const { projectId, prdId } = body;
  if (!projectId || !prdId) {
    return Response.json({ error: "projectId and prdId are required" }, { status: 400 });
  }

  const [project, prd] = await Promise.all([
    base44.entities.Project.get(projectId).catch(() => null),
    base44.entities.Prd.get(prdId).catch(() => null),
  ]);
  if (!project || !prd) return Response.json({ error: "Project or PRD not found" }, { status: 404 });

  // Large PRDs are stored as an ordered group of chunk rows — reassemble.
  let prdContent = prd.content;
  if (prd.group_id && (prd.parts_total || 1) > 1) {
    const parts = await base44.entities.Prd.filter({ group_id: prd.group_id });
    prdContent = parts
      .sort((a: { part: number }, b: { part: number }) => (a.part || 0) - (b.part || 0))
      .map((p: { content: string }) => p.content)
      .join("\n");
  }
  // Bounded for the model's per-minute token window — the recommendation only
  // needs the PRD's shape, not every word of it.
  const prdText = prdContent.slice(0, 3000);

  try {
    // ---- 1. Builder recommendation, driven by the PRD's actual requirements.
    const recommendation = await groqJson(
      `You are Prism AI's Builder Recommendation engine. Based on the PRD below, recommend the best AI development platform to build this product's MVP.

Platforms: Base44 (full-stack app platform with built-in database, auth, backend functions, LLM integrations — fastest path to a working full-stack MVP), Claude Code (agentic CLI for complex custom engineering), Cursor (AI IDE for incremental work in a codebase), Lovable (beautiful React+Supabase UIs), v0 (React/Next.js component generation), Replit Agent (build+deploy in one workspace), Windsurf (agentic IDE with Cascade flows), Codex (autonomous engineering agent).

For an MVP with database, auth, backend logic, and AI features, Base44 is typically the strongest primary recommendation because it removes the most infrastructure work — recommend it as primary unless the PRD clearly demands deep custom engineering, and score the fit honestly.

Rate the project needs (0-100) on: complexity, backend_requirements, ui_complexity, database_needs, speed_to_mvp.

PRD:
${prdText}`,
      {
        type: "object",
        properties: {
          recommended: {
            type: "object",
            properties: {
              platform: {
                type: "string",
                enum: ["base44", "claude-code", "cursor", "lovable", "v0", "replit", "windsurf", "codex"],
              },
              reasons: { type: "array", items: { type: "string" }, description: "3-4 sharp reasons" },
              fit_score: { type: "number", minimum: 0, maximum: 100 },
            },
          },
          alternative: {
            type: "object",
            properties: {
              platform: {
                type: "string",
                enum: ["base44", "claude-code", "cursor", "lovable", "v0", "replit", "windsurf", "codex"],
              },
              when_to_choose: { type: "string" },
            },
          },
          project_needs: {
            type: "object",
            properties: {
              complexity: { type: "number", minimum: 0, maximum: 100 },
              backend_requirements: { type: "number", minimum: 0, maximum: 100 },
              ui_complexity: { type: "number", minimum: 0, maximum: 100 },
              database_needs: { type: "number", minimum: 0, maximum: 100 },
              speed_to_mvp: { type: "number", minimum: 0, maximum: 100 },
            },
          },
        },
        required: ["recommended", "alternative", "project_needs"],
      },
      // gpt-oss-20b is the most reliable of the line-up at schema-shaped JSON,
      // and the prompt waves lean on it least.
      { model: "openai/gpt-oss-20b", maxTokens: 1400 },
    );

    await base44.entities.Project.update(projectId, { builder_recommendation: recommendation });

    // ---- 2. One platform-native prompt per builder, in parallel.
    const platforms = Object.keys(PLATFORM_GUIDES);

    // Eight prompts at once would exhaust a single model's per-minute budget,
    // so each platform is pinned to a different model and therefore a different
    // rate-limit bucket. A condensed PRD keeps every request comfortably inside
    // its window while preserving the specifics the prompts need.
    const PROMPT_MODEL: Record<string, string> = {
      base44: "llama-3.3-70b-versatile",
      "claude-code": "openai/gpt-oss-120b",
      cursor: "openai/gpt-oss-20b",
      lovable: "llama-3.3-70b-versatile",
      v0: "qwen/qwen3.6-27b",
      replit: "openai/gpt-oss-20b",
      windsurf: "openai/gpt-oss-120b",
      codex: "llama-3.3-70b-versatile",
    };
    const prdBrief = prdContent.slice(0, 3500);

    const compileOne = async (platform: string) => {
      {
        const { label, guide } = PLATFORM_GUIDES[platform];
        const content = await groqText(
          `You are Prism AI's prompt engineer. Convert the PRD below into ONE build prompt optimized specifically for ${label}.

HOW ${label.toUpperCase()} WORKS BEST:
${guide}

Rules:
- Output ONLY the prompt text itself — no preamble, no "Here is", no surrounding quotes or code fences.
- It must read as a single message a user would paste into ${label}.
- Follow the structure guidance above — this prompt must feel NATIVE to ${label}, not generic.
- Carry over the PRD's specifics (entities, features, flows); compress smartly, don't dumb down.
- Length: comprehensive but focused (roughly 500-900 words).

PRD:
${prdBrief}`,
          1600,
          PROMPT_MODEL[platform],
        );
        const text = (typeof content === "string" ? content : JSON.stringify(content)).trim();
        // Replace any previous prompt for this platform+PRD.
        const existing = await base44.entities.GeneratedPrompt.filter({
          project_id: projectId,
          prd_id: prdId,
          platform,
        });
        if (existing[0]) {
          await base44.entities.GeneratedPrompt.update(existing[0].id, { content: text });
          return existing[0].id;
        }
        const row = await base44.entities.GeneratedPrompt.create({
          project_id: projectId,
          prd_id: prdId,
          platform,
          title: `${label} build prompt`,
          content: text,
        });
        return row.id;
      }
    };

    // Even spread across models, eight simultaneous requests overrun the
    // per-minute budget. Compiling in small waves keeps every call inside its
    // window and still finishes in seconds.
    const WAVE = 2;
    const results: PromiseSettledResult<string>[] = [];
    for (let i = 0; i < platforms.length; i += WAVE) {
      const batch = platforms.slice(i, i + WAVE);
      results.push(...(await Promise.allSettled(batch.map(compileOne))));
      if (i + WAVE < platforms.length) await sleep(3000);
    }

    const failed = results.filter((r) => r.status === "rejected").length;
    return Response.json({ ok: true, generated: platforms.length - failed, failed, recommendation });
  } catch (err) {
    return Response.json({ error: String(err?.message || err) }, { status: 500 });
  }
});
