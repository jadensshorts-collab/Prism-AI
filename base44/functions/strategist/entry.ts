// Prism AI — the AI Product Strategist. Grounded, report-aware consulting chat.
import { createClientFromRequest } from "npm:@base44/sdk";

const MAX_HISTORY = 12;

// --- Groq LLM client (free-text) -------------------------------------------
// Rate limits are metered per model, so failing over across the line-up keeps
// the strategist answering even when one model is saturated.
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// Some models emit chain-of-thought in <think> blocks. None of that belongs
// in user-facing output, so strip it before the text is stored or shown.
function stripReasoning(text: string): string {
  const THINK_BLOCK = new RegExp('<think>[\\s\\S]*?</think>', 'gi');
  const THINK_TAG = new RegExp('</?think>', 'gi');
  return text.replace(THINK_BLOCK, '').replace(THINK_TAG, '').trim();
}

// The untagged form is the dangerous one: a model narrates the work instead of
// doing it and returns a plan — "Thinking Process:", a numbered deconstruction,
// notes about drafting. Nothing strips that, because it isn't marked as
// anything; it has to be recognised by shape and the turn handed to another model.
function looksLikeReasoning(text: string): boolean {
  const head = text.slice(0, 700);
  return (
    /^\s*(?:#{1,6}\s*)?(?:\*\*|__)?\s*(?:thinking|thought|reasoning|analysis|planning)(?:\s+process|\s+steps?)?(?:\*\*|__)?\s*:/i.test(
      head,
    ) ||
    /\b(?:mental draft|rough text assembly|drafting the prompt|deconstruct the prd|map to \w+ structure)\b/i.test(
      head,
    ) ||
    /^\s*(?:okay|alright)[,!]?\s+(?:so\b|let(?:'s| me)\b|i\b)/i.test(head)
  );
}

// Reasoning-tuned models return their scratchpad alongside (or instead of) the
// answer. Groq withholds it when asked; the guard above covers models that
// ignore the flag.
const REASONING_MODELS = new Set([
  "qwen/qwen3.6-27b",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
]);
const MODELS = [
  "llama-3.3-70b-versatile",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3.6-27b",
  "llama-3.1-8b-instant",
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function groqText(prompt: string, maxTokens = 1800): Promise<string> {
  const key = Deno.env.get("GROQ_API_KEY");
  if (!key) throw new Error("GROQ_API_KEY is not configured");
  let lastErr: unknown;
  for (const model of MODELS) {
    try {
      const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_completion_tokens: maxTokens,
          ...(REASONING_MODELS.has(model) ? { reasoning_format: "hidden" } : {}),
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        const err = new Error(e?.error?.message || `Groq HTTP ${res.status}`);
        if (res.status === 429) {
          const ra = Number(res.headers.get("retry-after"));
          await sleep(Number.isFinite(ra) && ra > 0 ? Math.min(ra * 1000, 20000) : 1500);
        }
        throw err;
      }
      const data = await res.json();
      const out = stripReasoning(data?.choices?.[0]?.message?.content ?? "");
      // A leaked scratchpad is worse than no answer — it would be shown to the
      // user as the strategist's reply. Treat it as a miss and move on.
      if (out && out.trim() && !looksLikeReasoning(out)) return out;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Groq returned no content");
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: { projectId?: string; message?: string } = {};
  try {
    body = await req.json();
  } catch {
    // fallthrough
  }
  const { projectId, message } = body;
  if (!projectId || !message?.trim()) {
    return Response.json({ error: "projectId and message are required" }, { status: 400 });
  }
  if (message.length > 2000) {
    return Response.json({ error: "Message too long (2000 char max)" }, { status: 400 });
  }

  const project = await base44.entities.Project.get(projectId).catch(() => null);
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  // Ground the strategist in the full report.
  const sections = await base44.entities.ReportSection.filter({
    project_id: projectId,
    status: "complete",
  });
  // Condensed to fit the model's per-minute token budget while keeping the
  // concrete findings the answer should cite.
  const summarize = (d: Record<string, any> | null) => {
    if (!d) return "(unavailable)";
    const out: string[] = [];
    const take = (a: unknown, n: number, f: (x: any) => string) =>
      Array.isArray(a) ? a.slice(0, n).map(f) : [];
    if (typeof d.score === "number") out.push(`score ${Math.round(d.score)}/100`);
    if (typeof d.overall_score === "number") out.push(`innovation ${Math.round(d.overall_score)}/100`);
    for (const k of ["business_model", "overall_assessment", "stack_summary", "summary", "market_position", "verdict"]) {
      if (typeof d[k] === "string" && d[k]) out.push(String(d[k]).slice(0, 260));
    }
    out.push(...take(d.weaknesses, 3, (x) => `weakness: ${String(x).slice(0, 120)}`));
    out.push(...take(d.strengths, 2, (x) => `strength: ${String(x).slice(0, 120)}`));
    out.push(...take(d.detected, 5, (t) => `tech: ${t?.name}`));
    out.push(...take(d.techniques, 3, (t) => `psych: ${t?.name}`));
    out.push(...take(d.competitors, 4, (c) => `rival ${c?.name} (${c?.threat_level})`));
    out.push(...take(d.opportunities, 5, (o) => `opportunity: ${o?.title}`));
    out.push(...take(d.recommendations, 3, (x) => `growth: ${String(x).slice(0, 110)}`));
    return out.join("\n").slice(0, 1100);
  };

  const reportDigest = sections
    .map((s: { section_key: string; data: Record<string, any> }) => `### ${s.section_key}\n${summarize(s.data)}`)
    .join("\n\n")
    .slice(0, 7000);

  const history = await base44.entities.ChatMessage.filter({ project_id: projectId }, "-created_date", MAX_HISTORY);
  const historyText = history
    .reverse()
    .map((m: { role: string; content: string }) => `${m.role === "user" ? "User" : "Strategist"}: ${m.content}`)
    .join("\n\n");

  await base44.entities.ChatMessage.create({ project_id: projectId, role: "user", content: message.trim() });

  const prompt = `You are the Prism AI Product Strategist — a senior product advisor who has taken multiple companies from seed to scale. You are consulting on the product "${project.product_name || project.input_url}".

You have Prism's full multi-layer intelligence report on this product. Ground every answer in this data — cite specific findings (scores, competitors, psychological techniques, opportunities) when relevant. Give sharp, opinionated, actionable advice like a $1,000/hour consultant, not generic tips. Use markdown: short paragraphs, bold key points, bullet lists where they help. Keep answers focused — under 350 words unless the question truly demands more.

PRODUCT OVERVIEW:
${JSON.stringify(project.overview || {}).slice(0, 1600)}

INTELLIGENCE REPORT:
${reportDigest}

CONVERSATION SO FAR:
${historyText || "(none)"}

User: ${message.trim()}

Respond as the Strategist.`;

  try {
    const text = await groqText(prompt, 1800);
    await base44.entities.ChatMessage.create({ project_id: projectId, role: "assistant", content: text });
    return Response.json({ reply: text });
  } catch (err) {
    return Response.json({ error: String(err?.message || err) }, { status: 500 });
  }
});
