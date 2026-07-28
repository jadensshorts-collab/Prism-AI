// Prism AI — analysis pipeline orchestrator.
// Runs a multi-stage AI analysis of a product: recon first, then all report
// layers in parallel, then the innovation synthesis which consumes the layers.
// Progress is written to the Project + ReportSection entities so the client
// can render a live, truthful pipeline view by polling.
import { createClientFromRequest } from "npm:@base44/sdk";

const RATE_LIMIT_PER_HOUR = 10;

type SectionDef = {
  key: string;
  title: string;
  stage: string;
  internet: boolean;
  prompt: (ctx: string) => string;
  schema: Record<string, unknown>;
};

const score = (desc: string) => ({
  type: "number",
  minimum: 0,
  maximum: 100,
  description: desc,
});

const SECTION_DEFS: SectionDef[] = [
  {
    key: "business",
    title: "Business Layer",
    stage: "Mapping the business engine",
    internet: true,
    prompt: (ctx) =>
      `You are Prism AI, an elite product intelligence analyst. Analyze the BUSINESS LAYER of the product described below. Research how it actually makes money today. Be specific and concrete — name real pricing tiers, real segments, real numbers where known. Avoid generic filler.\n\nPRODUCT CONTEXT:\n${ctx}`,
    schema: {
      type: "object",
      properties: {
        business_model: { type: "string", description: "How the product makes money, 2-3 sentences" },
        revenue_streams: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
            },
          },
        },
        pricing_strategy: {
          type: "object",
          properties: {
            model: { type: "string", description: "e.g. freemium, usage-based, flat subscription" },
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
            assessment: { type: "string", description: "Critical assessment of the pricing strategy" },
          },
        },
        customer_segments: {
          type: "array",
          items: {
            type: "object",
            properties: {
              segment: { type: "string" },
              needs: { type: "string" },
              value: { type: "string", description: "Why this segment is valuable" },
            },
          },
        },
        monetization_opportunities: {
          type: "array",
          items: { type: "string" },
          description: "Untapped ways this product could make more money",
        },
        growth_potential: { type: "string", description: "Honest growth outlook, 2-3 sentences" },
        score: score("Business layer strength 0-100"),
        score_rationale: { type: "string" },
      },
      required: ["business_model", "score"],
    },
  },
  {
    key: "design",
    title: "Design Layer",
    stage: "Deconstructing the design system",
    internet: true,
    prompt: (ctx) =>
      `You are Prism AI, a world-class product design critic (ex-Apple, ex-Linear). Analyze the DESIGN LAYER of the product described below: UI quality, UX decisions, visual hierarchy, accessibility, mobile experience, and branding. Judge like a demanding design director — praise what is genuinely strong, call out what is weak with specifics.\n\nPRODUCT CONTEXT:\n${ctx}`,
    schema: {
      type: "object",
      properties: {
        overall_assessment: { type: "string", description: "3-4 sentence design verdict" },
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
              notes: { type: "string", description: "Specific observations, 1-2 sentences" },
            },
          },
          description: "Exactly six dimensions: UI Quality, UX Decisions, Visual Hierarchy, Accessibility, Mobile Experience, Branding",
        },
        strengths: { type: "array", items: { type: "string" } },
        weaknesses: { type: "array", items: { type: "string" } },
        score: score("Overall design score 0-100"),
      },
      required: ["overall_assessment", "dimensions", "score"],
    },
  },
  {
    key: "technology",
    title: "Technology Layer",
    stage: "Detecting the technology stack",
    internet: true,
    prompt: (ctx) =>
      `You are Prism AI, a principal engineer doing technical due diligence. Detect the TECHNOLOGY LAYER of the product described below: frameworks, libraries, hosting, databases, authentication, payments, analytics, and AI usage. Use public evidence (job postings, docs, engineering blogs, page source patterns, common knowledge about the company). Mark confidence honestly — 'confirmed' only when publicly documented, 'likely' for strong inference, 'possible' for educated guesses.\n\nPRODUCT CONTEXT:\n${ctx}`,
    schema: {
      type: "object",
      properties: {
        stack_summary: { type: "string", description: "2-3 sentence architecture overview" },
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
              name: { type: "string", description: "Technology name, e.g. React, AWS, Stripe" },
              confidence: { type: "string", enum: ["confirmed", "likely", "possible"] },
              evidence: { type: "string", description: "Why you believe this" },
            },
          },
        },
        architecture_notes: { type: "string", description: "Notable engineering decisions and tradeoffs" },
        score: score("Stack modernity and fit 0-100"),
      },
      required: ["stack_summary", "detected", "score"],
    },
  },
  {
    key: "psychology",
    title: "Psychology Layer",
    stage: "Decoding user psychology",
    internet: true,
    prompt: (ctx) =>
      `You are Prism AI, a behavioral psychologist specialized in product design (think Nir Eyal meets BJ Fogg). Decode the PSYCHOLOGY LAYER of the product described below: trust signals, social proof, gamification, habit loops, scarcity, urgency, and persuasion techniques. For each technique found, explain the psychological mechanism that makes it work. Also identify powerful techniques the product is NOT using.\n\nPRODUCT CONTEXT:\n${ctx}`,
    schema: {
      type: "object",
      properties: {
        summary: { type: "string", description: "2-3 sentence read of the product's psychological playbook" },
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
              where_used: { type: "string", description: "Where in the product this appears" },
              why_it_works: { type: "string", description: "The psychological mechanism behind it" },
              effectiveness: score("How effectively it is executed 0-100"),
            },
          },
        },
        missing_techniques: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              opportunity: { type: "string", description: "How the product could use it" },
            },
          },
        },
        score: score("Psychological sophistication 0-100"),
      },
      required: ["summary", "techniques", "score"],
    },
  },
  {
    key: "growth",
    title: "Growth Layer",
    stage: "Tracing the growth machine",
    internet: true,
    prompt: (ctx) =>
      `You are Prism AI, a growth advisor who has scaled multiple products past 10M users. Analyze the GROWTH LAYER of the product described below: SEO posture, acquisition channels, retention mechanics, referral loops, community, and marketing strategy. Be concrete about what they actually do, then give sharp recommendations.\n\nPRODUCT CONTEXT:\n${ctx}`,
    schema: {
      type: "object",
      properties: {
        summary: { type: "string", description: "2-3 sentence growth strategy read" },
        seo: {
          type: "object",
          properties: {
            assessment: { type: "string" },
            score: score("SEO strength 0-100"),
          },
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
        recommendations: {
          type: "array",
          items: { type: "string" },
          description: "Sharp, specific growth recommendations",
        },
        score: score("Growth machine strength 0-100"),
      },
      required: ["summary", "score"],
    },
  },
  {
    key: "competitors",
    title: "Competitor Intelligence",
    stage: "Mapping the competitive field",
    internet: true,
    prompt: (ctx) =>
      `You are Prism AI, a competitive intelligence analyst. Map the COMPETITIVE FIELD of the product described below. Find its 4-6 most relevant real competitors. Compare features, pricing, and positioning honestly — include at least one competitor that is genuinely threatening.\n\nPRODUCT CONTEXT:\n${ctx}`,
    schema: {
      type: "object",
      properties: {
        market_position: { type: "string", description: "Where this product sits in the market, 2-3 sentences" },
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
        differentiation_summary: { type: "string", description: "What genuinely sets the analyzed product apart" },
        white_space: { type: "string", description: "Gaps in the market no competitor covers well" },
      },
      required: ["market_position", "competitors"],
    },
  },
];

const INNOVATION_DEF: SectionDef = {
  key: "innovation",
  title: "Innovation Meter",
  stage: "Computing innovation score",
  internet: false,
  prompt: (ctx) =>
    `You are Prism AI's Innovation Meter — the signature scoring engine of a product intelligence platform. Using the full multi-layer analysis below, score this product's innovation and find its untapped opportunities.\n\nBe a tough grader: 90+ means genuinely category-defining, 70-89 strong, 50-69 solid but conventional, below 50 undifferentiated. Scores must be consistent with the evidence in the layers.\n\nFor opportunities: do NOT suggest copying competitors. Find genuinely untapped openings — missing features, better workflows, AI leverage, new audiences, automation, monetization, accessibility, enterprise. Each must be specific enough to act on.\n\nFULL ANALYSIS:\n${ctx}`,
  schema: {
    type: "object",
    properties: {
      overall_score: score("Overall innovation score 0-100"),
      verdict: { type: "string", description: "One punchy sentence summarizing the innovation verdict" },
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
            rationale: { type: "string", description: "1-2 sentences justifying the score" },
          },
        },
        description: "Exactly six facets: Originality, Differentiation, User Value, Execution Quality, Market Opportunity, Future Potential",
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
            description: { type: "string", description: "What to build and why it wins, 2-3 sentences" },
            impact: { type: "string", enum: ["high", "medium", "low"] },
            effort: { type: "string", enum: ["low", "medium", "high"] },
          },
        },
        description: "8-10 specific untapped opportunities",
      },
    },
    required: ["overall_score", "verdict", "facets", "opportunities"],
  },
};

// --- Groq LLM client -------------------------------------------------------
// Groq meters tokens-per-minute PER MODEL, so the parallel pipeline spreads its
// calls across several models to multiply the available budget rather than
// serialising and making the user wait. Structured output uses `json_object`
// mode with the schema inlined in the prompt: strict `json_schema` mode is only
// supported by part of the model line-up and rejects otherwise-usable responses
// over minor omissions, while json_object yields parseable JSON on every model
// and the report renderers already treat each field as optional.
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODELS = [
  "llama-3.3-70b-versatile",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3.6-27b",
  "llama-3.1-8b-instant",
];

// Each layer is pinned to a different model so seven concurrent calls sit in
// seven separate rate-limit buckets instead of one.
// Balanced so no model carries more than two concurrent layers: three on the
// 12k bucket was hitting the ceiling and forcing retries that doubled runtime.
const SECTION_MODEL: Record<string, string> = {
  business: "llama-3.3-70b-versatile",
  competitors: "llama-3.3-70b-versatile",
  design: "openai/gpt-oss-120b",
  technology: "openai/gpt-oss-20b",
  psychology: "qwen/qwen3.6-27b",
  growth: "qwen/qwen3.6-27b",
  innovation: "openai/gpt-oss-120b",
};

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
    const err = new Error(e?.error?.message || `Groq HTTP ${res.status}`) as Error & {
      rateLimited?: boolean;
    };
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

// Pulls the first balanced JSON object out of a response, tolerating fences or
// stray prose some models emit despite json_object mode.
function extractJson(text: string): Record<string, any> {
  const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
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

// Structured call with cross-model failover, so one model being rate-limited or
// returning malformed JSON never sinks a section.
async function invokeJson(
  _base44: unknown,
  opts: { prompt: string; schema: Record<string, unknown>; model?: string; maxTokens?: number },
) {
  const order = [opts.model || MODELS[0], ...MODELS].filter((v, i, a) => a.indexOf(v) === i);
  const prompt =
    `${opts.prompt}\n\nRespond with a single JSON object and nothing else. Match this schema ` +
    `exactly — populate every field and keep enum values verbatim:\n${JSON.stringify(opts.schema)}`;
  let lastErr: unknown;
  // Two passes: the first rotates models, the second waits out the rolling
  // token window so earlier work in the same minute cannot permanently fail this call.
  for (let pass = 0; pass < 2; pass++) {
    for (const model of order) {
      try {
        return extractJson(await groqChat(prompt, model, opts.maxTokens ?? 2600, true));
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

// Condenses a completed layer into the handful of findings later stages need.
// Groq's per-minute token budget is far smaller than the raw JSON payloads, so
// this keeps synthesis prompts inside the window without losing the substance.
function summarizeLayer(key: string, d: Record<string, any> | null): string {
  if (!d) return "(unavailable)";
  const lines: string[] = [];
  const take = (arr: unknown, n: number, fn: (x: any) => string) =>
    Array.isArray(arr) ? arr.slice(0, n).map(fn).filter(Boolean) : [];

  if (typeof d.score === "number") lines.push(`score: ${Math.round(d.score)}/100`);
  for (const field of ["business_model", "overall_assessment", "stack_summary", "summary", "market_position"]) {
    if (typeof d[field] === "string" && d[field]) lines.push(String(d[field]).slice(0, 320));
  }
  lines.push(...take(d.monetization_opportunities, 3, (x) => `- opportunity: ${String(x).slice(0, 140)}`));
  lines.push(...take(d.weaknesses, 3, (x) => `- weakness: ${String(x).slice(0, 140)}`));
  lines.push(...take(d.strengths, 2, (x) => `- strength: ${String(x).slice(0, 140)}`));
  lines.push(...take(d.detected, 6, (t) => `- tech: ${t?.name} (${t?.category})`));
  lines.push(...take(d.techniques, 4, (t) => `- psych: ${t?.name} — ${String(t?.why_it_works || "").slice(0, 110)}`));
  lines.push(...take(d.missing_techniques, 3, (t) => `- missing: ${t?.name} — ${String(t?.opportunity || "").slice(0, 110)}`));
  lines.push(...take(d.recommendations, 3, (x) => `- growth play: ${String(x).slice(0, 140)}`));
  lines.push(
    ...take(d.competitors, 5, (c) =>
      `- competitor: ${c?.name} (${c?.threat_level} threat) weak: ${(c?.weaknesses || []).slice(0, 2).join("; ").slice(0, 120)}`,
    ),
  );
  if (typeof d.white_space === "string" && d.white_space) lines.push(`white space: ${d.white_space.slice(0, 260)}`);
  return lines.join("\n").slice(0, 1400) || JSON.stringify(d).slice(0, 800);
}

function reconContext(project: Record<string, unknown>): string {
  return JSON.stringify(
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
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let projectId: string | undefined;
  try {
    ({ projectId } = await req.json());
  } catch {
    // fallthrough
  }
  if (!projectId) {
    return Response.json({ error: "projectId is required" }, { status: 400 });
  }

  const project = await base44.entities.Project.get(projectId).catch(() => null);
  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  // Rate limit: cap analyses per user per hour.
  // Stored timestamps carry no timezone marker, so pin them to UTC before
  // comparing against now — otherwise the window is off by the host's offset.
  const asUtc = (s: string) =>
    new Date(/[Zz]$|[+-]\d{2}:?\d{2}$/.test(s) ? s : `${s}Z`).getTime();
  const recent = await base44.entities.Project.list("-created_date", RATE_LIMIT_PER_HOUR);
  if (recent.length >= RATE_LIMIT_PER_HOUR) {
    const oldest = asUtc(recent[recent.length - 1].created_date);
    if (Date.now() - oldest < 60 * 60 * 1000) {
      await base44.entities.Project.update(projectId, {
        status: "failed",
        error: "Rate limit reached — please wait a bit before analyzing more products.",
      });
      return Response.json({ error: "Rate limit reached" }, { status: 429 });
    }
  }

  const update = (data: Record<string, unknown>) =>
    base44.entities.Project.update(projectId!, data);

  try {
    // ---- Stage 1: recon — identify the product before the layers fan out.
    await update({ status: "analyzing", stage: "Discovering product structure", progress: 4 });

    const recon = await invokeJson(base44, {
      // Runs before the fan-out on a model only one layer uses, so it leaves the
      // busiest buckets untouched.
      model: "openai/gpt-oss-20b",
      maxTokens: 2200,
      prompt:
        `You are Prism AI, a product intelligence engine. Identify and profile the digital product at or named: "${project.input_url}". If it is an app store URL, profile that app. Be factual and specific — only state things you actually know about this product, and omit anything you are unsure of rather than inventing it.`,
      schema: {
        type: "object",
        properties: {
          product_name: { type: "string" },
          tagline: { type: "string", description: "The product in one crisp line (your words, not their slogan)" },
          category: { type: "string", description: "Market category, e.g. 'Project Management SaaS'" },
          what_it_does: { type: "string", description: "3-4 sentences on what the product actually does" },
          target_users: { type: "array", items: { type: "string" } },
          problem_solved: { type: "string", description: "The core problem it solves" },
          value_proposition: { type: "string" },
          key_features: { type: "array", items: { type: "string" }, description: "6-10 headline features" },
          notable_facts: { type: "array", items: { type: "string" }, description: "Funding, scale, launch year, notable customers — only if publicly known" },
        },
        required: ["product_name", "what_it_does", "value_proposition"],
      },
    });

    await update({
      product_name: recon.product_name,
      tagline: recon.tagline || "",
      category: recon.category || "",
      overview: {
        what_it_does: recon.what_it_does,
        target_users: recon.target_users || [],
        problem_solved: recon.problem_solved || "",
        value_proposition: recon.value_proposition,
        key_features: recon.key_features || [],
        notable_facts: recon.notable_facts || [],
        market_category: recon.category || "",
      },
      stage: "Analyzing layers in parallel",
      progress: 18,
    });

    const freshProject = await base44.entities.Project.get(projectId);
    const ctx = reconContext(freshProject);

    // ---- Stage 2: all analysis layers in parallel.
    let done = 0;
    const totalUnits = SECTION_DEFS.length + 1; // + innovation

    const runSection = async (def: SectionDef, context: string) => {
      const row = await base44.entities.ReportSection.create({
        project_id: projectId!,
        section_key: def.key,
        title: def.title,
        status: "running",
      });
      try {
        // invokeJson already fails over across every model, so a single call
        // here covers both rate limits and malformed responses.
        const data = await invokeJson(base44, {
          prompt: def.prompt(context),
          schema: def.schema,
          model: SECTION_MODEL[def.key],
          maxTokens: def.key === "innovation" ? 3000 : 2600,
        });
        await base44.entities.ReportSection.update(row.id, { status: "complete", data });
        done += 1;
        await update({
          sections_done: done,
          stage: def.stage,
          progress: Math.min(96, 18 + Math.round((done / totalUnits) * 78)),
        });
        return { key: def.key, data };
      } catch (err) {
        await base44.entities.ReportSection.update(row.id, {
          status: "failed",
          error: String(err?.message || err),
        });
        done += 1;
        await update({ sections_done: done });
        return { key: def.key, data: null };
      }
    };

    const results = await Promise.all(SECTION_DEFS.map((def) => runSection(def, ctx)));

    // ---- Stage 3: innovation synthesis over everything we learned.
    // Feeding the raw layer JSON here would push the request past the model's
    // per-minute token ceiling, so each layer is condensed to the findings the
    // synthesis actually reasons over.
    const layerDigest = results
      .filter((r) => r.data)
      .map((r) => `## ${r.key}\n${summarizeLayer(r.key, r.data)}`)
      .join("\n\n");
    const innovationCtx = `${ctx.slice(0, 2500)}\n\nLAYER FINDINGS:\n${layerDigest}`.slice(0, 7000);

    const innovation = await runSection(INNOVATION_DEF, innovationCtx);

    // ---- Finish: roll scores up to the project for dashboards and compare.
    const layerScores: Record<string, number> = {};
    for (const r of results) {
      if (r.data && typeof r.data.score === "number") layerScores[r.key] = r.data.score;
    }
    const failedCount = results.filter((r) => !r.data).length + (innovation.data ? 0 : 1);

    await update({
      status: "complete",
      progress: 100,
      stage: "Analysis complete",
      layer_scores: layerScores,
      innovation_score: innovation.data?.overall_score ?? null,
      error: failedCount > 0 ? `${failedCount} section(s) failed — retry them from the report.` : "",
    });

    return Response.json({ ok: true, projectId, failedSections: failedCount });
  } catch (err) {
    await update({
      status: "failed",
      stage: "Analysis failed",
      error: String(err?.message || err),
    }).catch(() => null);
    return Response.json({ error: String(err?.message || err) }, { status: 500 });
  }
});
