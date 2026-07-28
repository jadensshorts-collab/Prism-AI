// Prism AI — re-runs a single failed (or stale) report section for a project.
// Section definitions mirror analyze/entry.ts; keep the two in sync.
import { createClientFromRequest } from "npm:@base44/sdk";

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
    const digest = sections
      .filter((s: { section_key: string }) => s.section_key !== "innovation")
      .map((s: { section_key: string; data: unknown }) => `## ${s.section_key}\n${JSON.stringify(s.data)}`)
      .join("\n\n");
    fullCtx = `${ctx}\n\nLAYER ANALYSES:\n${digest}`.slice(0, 60000);
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
    const data = await base44.integrations.Core.InvokeLLM({
      prompt: def.prompt(fullCtx),
      response_json_schema: def.schema,
      add_context_from_internet: def.internet,
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
