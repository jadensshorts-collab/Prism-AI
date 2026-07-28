// Prism AI — Evolution Mode. Generates an ORIGINAL product concept inspired by
// the analysis: not a clone, a leap. Consumes innovation opportunities,
// competitor weaknesses, and psychology/growth gaps.
import { createClientFromRequest } from "npm:@base44/sdk";

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
  const digest = sections
    .map((s: { section_key: string; data: unknown }) => `### ${s.section_key}\n${JSON.stringify(s.data)}`)
    .join("\n\n")
    .slice(0, 55000);

  const prompt = `You are Prism AI's Evolution Engine. You just analyzed "${project.product_name}" (${project.category}). Your job is NOT to clone it. Your job is to conceive an ORIGINAL new product that wins where the analyzed product is weak — powered by the untapped opportunities, competitor weaknesses, and psychology/growth gaps in the analysis below.

Rules:
- The concept must be original and differentiated, not "${project.product_name} but better".
- It should feel like a fundable startup: sharp wedge, clear target user, obvious first win.
- AI should be woven into the core workflow, not bolted on.
- Every feature must map to a real gap found in the analysis.
- Give it a memorable name that is NOT derivative of "${project.product_name}".

ANALYSIS OF ${project.product_name}:
Overview: ${JSON.stringify(project.overview || {})}

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
    const data = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: schema,
    });
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
