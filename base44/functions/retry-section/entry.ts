// Prism AI — re-runs a single failed (or stale) report section for a project.
// Section definitions mirror analyze/entry.ts; keep the two in sync.
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

const score = (desc: string) => ({
  type: "number",
  minimum: 0,
  maximum: 100,
  description: desc,
});

const SECTIONS: Record<
  string,
  { title: string; internet: boolean; prompt: (ctx: string) => string; schema: Record<string, unknown> }
> = {
  business: {
    title: "Business Layer",
    internet: true,
    prompt: (ctx) =>
      `You are Prism AI, an elite product intelligence analyst. Analyze the BUSINESS LAYER of the product described below. Research how it actually makes money today. Be specific and concrete — name real pricing tiers, real segments, real numbers where known. Avoid generic filler.\n\nPRODUCT CONTEXT:\n${ctx}`,
    schema: {
      type: "object",
      properties: {
        business_model: { type: "string" },
        revenue_streams: {
          type: "array",
          items: {
            type: "object",
            properties: { name: { type: "string" }, description: { type: "string" } },
          },
        },
        pricing_strategy: {
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
                  for_whom: { type: "string" },
                },
              },
            },
            assessment: { type: "string" },
          },
        },
        customer_segments: {
          type: "array",
          items: {
            type: "object",
            properties: {
              segment: { type: "string" },
              needs: { type: "string" },
              value: { type: "string" },
            },
          },
        },
        monetization_opportunities: { type: "array", items: { type: "string" } },
        growth_potential: { type: "string" },
        score: score("Business layer strength 0-100"),
        score_rationale: { type: "string" },
      },
      required: ["business_model", "score"],
    },
  },
  design: {
    title: "Design Layer",
    internet: true,
    prompt: (ctx) =>
      `You are Prism AI, a world-class product design critic (ex-Apple, ex-Linear). Analyze the DESIGN LAYER of the product described below: UI quality, UX decisions, visual hierarchy, accessibility, mobile experience, and branding. Judge like a demanding design director — praise what is genuinely strong, call out what is weak with specifics.\n\nPRODUCT CONTEXT:\n${ctx}`,
    schema: {
      type: "object",
      properties: {
        overall_assessment: { type: "string" },
        dimensions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: {
                type: "string",
                enum: [
                  "UI Quality",
                  "UX Decisions",
                  "Visual Hierarchy",
                  "Accessibility",
                  "Mobile Experience",
                  "Branding",
                ],
              },
              score: score("0-100"),
              notes: { type: "string" },
            },
          },
        },
        strengths: { type: "array", items: { type: "string" } },
        weaknesses: { type: "array", items: { type: "string" } },
        score: score("Overall design score 0-100"),
      },
      required: ["overall_assessment", "dimensions", "score"],
    },
  },
  technology: {
    title: "Technology Layer",
    internet: true,
    prompt: (ctx) =>
      `You are Prism AI, a principal engineer doing technical due diligence. Detect the TECHNOLOGY LAYER of the product described below: frameworks, libraries, hosting, databases, authentication, payments, analytics, and AI usage. Use public evidence. Mark confidence honestly — 'confirmed' only when publicly documented, 'likely' for strong inference, 'possible' for educated guesses.\n\nPRODUCT CONTEXT:\n${ctx}`,
    schema: {
      type: "object",
      properties: {
        stack_summary: { type: "string" },
        detected: {
          type: "array",
          items: {
            type: "object",
            properties: {
              category: {
                type: "string",
                enum: [
                  "Frontend",
                  "Backend",
                  "Hosting",
                  "Database",
                  "Authentication",
                  "Payments",
                  "Analytics",
                  "AI",
                ],
              },
              name: { type: "string" },
              confidence: { type: "string", enum: ["confirmed", "likely", "possible"] },
              evidence: { type: "string" },
            },
          },
        },
        architecture_notes: { type: "string" },
        score: score("Stack modernity and fit 0-100"),
      },
      required: ["stack_summary", "detected", "score"],
    },
  },
  psychology: {
    title: "Psychology Layer",
    internet: true,
    prompt: (ctx) =>
      `You are Prism AI, a behavioral psychologist specialized in product design (think Nir Eyal meets BJ Fogg). Decode the PSYCHOLOGY LAYER of the product described below: trust signals, social proof, gamification, habit loops, scarcity, urgency, and persuasion techniques. For each technique found, explain the psychological mechanism that makes it work. Also identify powerful techniques the product is NOT using.\n\nPRODUCT CONTEXT:\n${ctx}`,
    schema: {
      type: "object",
      properties: {
        summary: { type: "string" },
        techniques: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              category: {
                type: "string",
                enum: [
                  "Trust Signals",
                  "Social Proof",
                  "Gamification",
                  "Habit Loops",
                  "Scarcity",
                  "Urgency",
                  "Persuasion",
                ],
              },
              where_used: { type: "string" },
              why_it_works: { type: "string" },
              effectiveness: score("0-100"),
            },
          },
        },
        missing_techniques: {
          type: "array",
          items: {
            type: "object",
            properties: { name: { type: "string" }, opportunity: { type: "string" } },
          },
        },
        score: score("Psychological sophistication 0-100"),
      },
      required: ["summary", "techniques", "score"],
    },
  },
  growth: {
    title: "Growth Layer",
    internet: true,
    prompt: (ctx) =>
      `You are Prism AI, a growth advisor who has scaled multiple products past 10M users. Analyze the GROWTH LAYER of the product described below: SEO posture, acquisition channels, retention mechanics, referral loops, community, and marketing strategy. Be concrete about what they actually do, then give sharp recommendations.\n\nPRODUCT CONTEXT:\n${ctx}`,
    schema: {
      type: "object",
      properties: {
        summary: { type: "string" },
        seo: {
          type: "object",
          properties: { assessment: { type: "string" }, score: score("0-100") },
        },
        acquisition_channels: {
          type: "array",
          items: {
            type: "object",
            properties: {
              channel: { type: "string" },
              effectiveness: { type: "string", enum: ["primary", "strong", "moderate", "weak"] },
              notes: { type: "string" },
            },
          },
        },
        retention_mechanics: { type: "array", items: { type: "string" } },
        referral_and_community: { type: "string" },
        recommendations: { type: "array", items: { type: "string" } },
        score: score("Growth machine strength 0-100"),
      },
      required: ["summary", "score"],
    },
  },
  competitors: {
    title: "Competitor Intelligence",
    internet: true,
    prompt: (ctx) =>
      `You are Prism AI, a competitive intelligence analyst. Map the COMPETITIVE FIELD of the product described below. Find its 4-6 most relevant real competitors. Compare features, pricing, and positioning honestly — include at least one competitor that is genuinely threatening.\n\nPRODUCT CONTEXT:\n${ctx}`,
    schema: {
      type: "object",
      properties: {
        market_position: { type: "string" },
        competitors: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              url: { type: "string" },
              positioning: { type: "string" },
              pricing: { type: "string" },
              strengths: { type: "array", items: { type: "string" } },
              weaknesses: { type: "array", items: { type: "string" } },
              threat_level: { type: "string", enum: ["high", "medium", "low"] },
            },
          },
        },
        differentiation_summary: { type: "string" },
        white_space: { type: "string" },
      },
      required: ["market_position", "competitors"],
    },
  },
  innovation: {
    title: "Innovation Meter",
    internet: false,
    prompt: (ctx) =>
      `You are Prism AI's Innovation Meter — the signature scoring engine of a product intelligence platform. Using the product analysis below, score this product's innovation and find its untapped opportunities.\n\nBe a tough grader: 90+ means genuinely category-defining, 70-89 strong, 50-69 solid but conventional, below 50 undifferentiated.\n\nFor opportunities: do NOT suggest copying competitors. Find genuinely untapped openings — missing features, better workflows, AI leverage, new audiences, automation, monetization, accessibility, enterprise. Each must be specific enough to act on.\n\nFULL ANALYSIS:\n${ctx}`,
    schema: {
      type: "object",
      properties: {
        overall_score: score("Overall innovation score 0-100"),
        verdict: { type: "string" },
        facets: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: {
                type: "string",
                enum: [
                  "Originality",
                  "Differentiation",
                  "User Value",
                  "Execution Quality",
                  "Market Opportunity",
                  "Future Potential",
                ],
              },
              score: score("0-100"),
              rationale: { type: "string" },
            },
          },
        },
        opportunities: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              category: {
                type: "string",
                enum: [
                  "Missing Feature",
                  "Better Workflow",
                  "AI Opportunity",
                  "New Audience",
                  "Automation",
                  "Monetization",
                  "Accessibility",
                  "Enterprise",
                ],
              },
              description: { type: "string" },
              impact: { type: "string", enum: ["high", "medium", "low"] },
              effort: { type: "string", enum: ["low", "medium", "high"] },
            },
          },
        },
      },
      required: ["overall_score", "verdict", "facets", "opportunities"],
    },
  },
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: { projectId?: string; sectionKey?: string } = {};
  try {
    body = await req.json();
  } catch {
    // fallthrough
  }
  const { projectId, sectionKey } = body;
  if (!projectId || !sectionKey || !SECTIONS[sectionKey]) {
    return Response.json({ error: "projectId and a valid sectionKey are required" }, { status: 400 });
  }

  const project = await base44.entities.Project.get(projectId).catch(() => null);
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  const def = SECTIONS[sectionKey];
  const ctx = JSON.stringify(
    {
      input_url: project.input_url,
      product_name: project.product_name,
      tagline: project.tagline,
      category: project.category,
      overview: project.overview,
    },
    null,
    2,
  );

  // Innovation synthesis reads the other completed layers too.
  let fullCtx = ctx;
  if (sectionKey === "innovation") {
    const sections = await base44.entities.ReportSection.filter({
      project_id: projectId,
      status: "complete",
    });
    // Condensed: raw layer JSON would exceed the model's per-minute token
    // ceiling, and the synthesis only reasons over the findings.
    const summarize = (d: Record<string, any> | null) => {
      if (!d) return "(unavailable)";
      const out: string[] = [];
      const take = (a: unknown, n: number, f: (x: any) => string) =>
        Array.isArray(a) ? a.slice(0, n).map(f) : [];
      if (typeof d.score === "number") out.push(`score ${Math.round(d.score)}/100`);
      for (const k of ["business_model", "overall_assessment", "stack_summary", "summary", "market_position"]) {
        if (typeof d[k] === "string" && d[k]) out.push(String(d[k]).slice(0, 300));
      }
      out.push(...take(d.weaknesses, 3, (x) => `weakness: ${String(x).slice(0, 130)}`));
      out.push(...take(d.strengths, 2, (x) => `strength: ${String(x).slice(0, 130)}`));
      out.push(...take(d.monetization_opportunities, 3, (x) => `money gap: ${String(x).slice(0, 130)}`));
      out.push(...take(d.detected, 6, (t) => `tech: ${t?.name} (${t?.category})`));
      out.push(...take(d.missing_techniques, 3, (t) => `missing: ${t?.name}`));
      out.push(...take(d.competitors, 5, (c) => `rival ${c?.name} (${c?.threat_level})`));
      if (d.white_space) out.push(`white space: ${String(d.white_space).slice(0, 220)}`);
      return out.join("\n").slice(0, 1300);
    };
    const digest = sections
      .filter((s: { section_key: string }) => s.section_key !== "innovation")
      .map((s: { section_key: string; data: Record<string, any> }) => `## ${s.section_key}\n${summarize(s.data)}`)
      .join("\n\n");
    fullCtx = `${ctx.slice(0, 2500)}\n\nLAYER FINDINGS:\n${digest}`.slice(0, 7000);
  }

  const existing = await base44.entities.ReportSection.filter({
    project_id: projectId,
    section_key: sectionKey,
  });
  let rowId = existing[0]?.id;
  if (rowId) {
    await base44.entities.ReportSection.update(rowId, { status: "running", error: "" });
  } else {
    const row = await base44.entities.ReportSection.create({
      project_id: projectId,
      section_key: sectionKey,
      title: def.title,
      status: "running",
    });
    rowId = row.id;
  }

  try {
    const data = await groqJson(def.prompt(fullCtx), def.schema, {
      maxTokens: sectionKey === "innovation" ? 3000 : 2600,
    });
    await base44.entities.ReportSection.update(rowId, { status: "complete", data, error: "" });

    if (sectionKey === "innovation" && typeof data.overall_score === "number") {
      await base44.entities.Project.update(projectId, { innovation_score: data.overall_score });
    } else if (typeof data.score === "number") {
      const scores = { ...(project.layer_scores || {}), [sectionKey]: data.score };
      await base44.entities.Project.update(projectId, { layer_scores: scores });
    }

    return Response.json({ ok: true, sectionKey });
  } catch (err) {
    await base44.entities.ReportSection.update(rowId, {
      status: "failed",
      error: String(err?.message || err),
    });
    return Response.json({ error: String(err?.message || err) }, { status: 500 });
  }
});
