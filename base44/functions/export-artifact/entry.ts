// Prism AI — server-side artifact pipeline.
// Assembles a deliverable from the stored analysis, renders it to markdown on
// the backend, uploads it to Base44 file storage, and records an Artifact row
// so every export is persistent, re-downloadable, and shareable by URL.
import { createClientFromRequest } from "npm:@base44/sdk";

type Section = { section_key: string; status: string; data: Record<string, any> | null };

const list = (items: unknown[] | undefined, fn: (x: any) => string) =>
  (items || []).map(fn).join("\n");

function renderReport(project: Record<string, any>, sections: Section[]): string {
  const byKey: Record<string, Section> = {};
  for (const s of sections) byKey[s.section_key] = s;
  const o = project.overview || {};
  const p: string[] = [];

  p.push(`# Prism AI Intelligence Report — ${project.product_name || project.input_url}`);
  if (project.tagline) p.push(`\n> ${project.tagline}`);
  p.push(`\n- **Category:** ${project.category || "—"}`);
  p.push(`- **Source:** ${project.input_url}`);
  // Stored timestamps have no timezone marker but are UTC — pin them explicitly.
  const utc = (s: string) =>
    new Date(/[Zz]$|[+-]\d{2}:?\d{2}$/.test(s) ? s : `${s}Z`);
  p.push(`- **Analyzed:** ${utc(project.created_date).toUTCString()}`);
  if (project.innovation_score != null) {
    p.push(`- **Innovation Score:** ${Math.round(project.innovation_score)}/100`);
  }

  p.push(`\n## Product Overview\n`);
  p.push(`**What it does:** ${o.what_it_does || "—"}\n`);
  p.push(`**Problem solved:** ${o.problem_solved || "—"}\n`);
  p.push(`**Value proposition:** ${o.value_proposition || "—"}\n`);
  if (o.target_users?.length) p.push(`**Target users:**\n${list(o.target_users, (u) => `- ${u}`)}\n`);
  if (o.key_features?.length) p.push(`**Key features:**\n${list(o.key_features, (f) => `- ${f}`)}\n`);
  if (o.notable_facts?.length) p.push(`**Notable facts:**\n${list(o.notable_facts, (f) => `- ${f}`)}\n`);

  const d = (k: string) => byKey[k]?.data;

  const biz = d("business");
  if (biz) {
    p.push(`\n## Business Layer — ${Math.round(biz.score)}/100\n`);
    p.push(`${biz.business_model || ""}\n`);
    if (biz.pricing_strategy?.tiers?.length) {
      p.push(`### Pricing (${biz.pricing_strategy.model || "—"})\n`);
      p.push(`| Tier | Price | For |\n|---|---|---|`);
      p.push(list(biz.pricing_strategy.tiers, (t) => `| ${t.name} | ${t.price} | ${t.for_whom} |`));
      if (biz.pricing_strategy.assessment) p.push(`\n${biz.pricing_strategy.assessment}\n`);
    }
    if (biz.customer_segments?.length) {
      p.push(`\n### Customer segments\n${list(biz.customer_segments, (s) => `- **${s.segment}** — ${s.needs}`)}\n`);
    }
    if (biz.monetization_opportunities?.length) {
      p.push(`### Untapped monetization\n${list(biz.monetization_opportunities, (m) => `- ${m}`)}\n`);
    }
    if (biz.growth_potential) p.push(`**Growth outlook:** ${biz.growth_potential}\n`);
  }

  const des = d("design");
  if (des) {
    p.push(`\n## Design Layer — ${Math.round(des.score)}/100\n`);
    p.push(`${des.overall_assessment || ""}\n`);
    if (des.dimensions?.length) {
      p.push(`| Dimension | Score | Notes |\n|---|---|---|`);
      p.push(list(des.dimensions, (x) => `| ${x.name} | ${Math.round(x.score)} | ${(x.notes || "").replace(/\|/g, "/")} |`));
      p.push("");
    }
    if (des.strengths?.length) p.push(`**Strengths:**\n${list(des.strengths, (s) => `- ${s}`)}\n`);
    if (des.weaknesses?.length) p.push(`**Weaknesses:**\n${list(des.weaknesses, (s) => `- ${s}`)}\n`);
  }

  const tech = d("technology");
  if (tech) {
    p.push(`\n## Technology Layer — ${Math.round(tech.score)}/100\n`);
    p.push(`${tech.stack_summary || ""}\n`);
    if (tech.detected?.length) {
      p.push(`| Category | Technology | Confidence | Evidence |\n|---|---|---|---|`);
      p.push(
        list(
          tech.detected,
          (t) => `| ${t.category} | ${t.name} | ${t.confidence} | ${(t.evidence || "").replace(/\|/g, "/")} |`,
        ),
      );
      p.push("");
    }
    if (tech.architecture_notes) p.push(`**Architecture notes:** ${tech.architecture_notes}\n`);
  }

  const psy = d("psychology");
  if (psy) {
    p.push(`\n## Psychology Layer — ${Math.round(psy.score)}/100\n`);
    p.push(`${psy.summary || ""}\n`);
    if (psy.techniques?.length) {
      p.push(
        list(
          psy.techniques,
          (t) => `### ${t.name} (${t.category})\n- **Where:** ${t.where_used || "—"}\n- **Why it works:** ${t.why_it_works}`,
        ),
      );
      p.push("");
    }
    if (psy.missing_techniques?.length) {
      p.push(`### Levers not being pulled\n${list(psy.missing_techniques, (m) => `- **${m.name}** — ${m.opportunity}`)}\n`);
    }
  }

  const gro = d("growth");
  if (gro) {
    p.push(`\n## Growth Layer — ${Math.round(gro.score)}/100\n`);
    p.push(`${gro.summary || ""}\n`);
    if (gro.acquisition_channels?.length) {
      p.push(`### Acquisition\n${list(gro.acquisition_channels, (c) => `- **${c.channel}** (${c.effectiveness}) — ${c.notes || ""}`)}\n`);
    }
    if (gro.retention_mechanics?.length) {
      p.push(`### Retention\n${list(gro.retention_mechanics, (r) => `- ${r}`)}\n`);
    }
    if (gro.recommendations?.length) {
      p.push(`### Recommendations\n${list(gro.recommendations, (r) => `- ${r}`)}\n`);
    }
  }

  const comp = d("competitors");
  if (comp) {
    p.push(`\n## Competitor Intelligence\n`);
    p.push(`${comp.market_position || ""}\n`);
    if (comp.competitors?.length) {
      p.push(
        list(
          comp.competitors,
          (c) =>
            `### ${c.name} — ${c.threat_level} threat\n${c.positioning || ""}\n\n- **Pricing:** ${c.pricing || "—"}\n- **Strengths:** ${(c.strengths || []).join("; ")}\n- **Weaknesses:** ${(c.weaknesses || []).join("; ")}`,
        ),
      );
      p.push("");
    }
    if (comp.differentiation_summary) p.push(`**Differentiation:** ${comp.differentiation_summary}\n`);
    if (comp.white_space) p.push(`**White space:** ${comp.white_space}\n`);
  }

  const inn = d("innovation");
  if (inn) {
    p.push(`\n## Innovation Meter — ${Math.round(inn.overall_score)}/100\n`);
    p.push(`> ${inn.verdict || ""}\n`);
    if (inn.facets?.length) {
      p.push(`| Facet | Score | Rationale |\n|---|---|---|`);
      p.push(
        list(inn.facets, (f) => `| ${f.name} | ${Math.round(f.score)} | ${(f.rationale || "").replace(/\|/g, "/")} |`),
      );
      p.push("");
    }
    if (inn.opportunities?.length) {
      p.push(`### Untapped Opportunities\n`);
      p.push(
        list(
          inn.opportunities,
          (op) =>
            `#### ${op.title}\n*${op.category} · impact: ${op.impact} · effort: ${op.effort}*\n\n${op.description}`,
        ),
      );
    }
  }

  p.push(`\n---\n*Generated by Prism AI — product intelligence, refracted.*`);
  return p.join("\n");
}

function renderPromptPack(project: Record<string, any>, prompts: Record<string, any>[]): string {
  const p: string[] = [];
  p.push(`# AI Builder Prompt Pack — ${project.product_name || project.input_url}`);
  p.push(`\n> Platform-native build prompts generated by Prism AI.\n`);
  const rec = project.builder_recommendation?.recommended;
  if (rec) {
    p.push(`## Recommended builder: ${rec.platform}\n`);
    if (rec.reasons?.length) p.push(list(rec.reasons, (r) => `- ${r}`));
    p.push("");
  }
  for (const row of prompts) {
    p.push(`\n---\n\n## ${row.title || row.platform}\n`);
    p.push(row.content);
  }
  return p.join("\n");
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: { projectId?: string; kind?: string } = {};
  try {
    body = await req.json();
  } catch {
    // fallthrough
  }
  const { projectId, kind } = body;
  if (!projectId || !["report", "prd", "prompt-pack"].includes(kind || "")) {
    return Response.json(
      { error: "projectId and kind (report | prd | prompt-pack) are required" },
      { status: 400 },
    );
  }

  const project = await base44.entities.Project.get(projectId).catch(() => null);
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  const slug = (project.product_name || project.input_url)
    .toLowerCase()
    .replace(/[^\w]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

  try {
    let content = "";
    let filename = "";
    let title = "";
    let summary = "";

    if (kind === "report") {
      const sections = await base44.entities.ReportSection.filter({
        project_id: projectId,
        status: "complete",
      });
      if (!sections.length) {
        return Response.json({ error: "No completed sections to export yet." }, { status: 400 });
      }
      content = renderReport(project, sections as Section[]);
      filename = `prism-report-${slug}.md`;
      title = `${project.product_name} — Intelligence Report`;
      summary = `${sections.length} analyzed layers, innovation score ${
        project.innovation_score != null ? Math.round(project.innovation_score) : "—"
      }.`;
    } else if (kind === "prd") {
      const parts = await base44.entities.Prd.filter({ project_id: projectId });
      if (!parts.length) return Response.json({ error: "No PRD generated yet." }, { status: 400 });
      // Newest group wins; chunks are reassembled in order.
      const groups: Record<string, Record<string, any>[]> = {};
      for (const row of parts) {
        const key = row.group_id || row.id;
        (groups[key] ||= []).push(row);
      }
      const newest = Object.values(groups).sort(
        (a, b) =>
          new Date(b[0].created_date).getTime() - new Date(a[0].created_date).getTime(),
      )[0];
      newest.sort((a, b) => (a.part || 0) - (b.part || 0));
      content = newest.map((r) => r.content).join("\n");
      filename = `prism-prd-${slug}.md`;
      title = newest[0].title || `${project.product_name} PRD`;
      summary = `Full product requirements document (${newest.length} part${newest.length > 1 ? "s" : ""}).`;
    } else {
      const prompts = await base44.entities.GeneratedPrompt.filter({ project_id: projectId });
      if (!prompts.length) {
        return Response.json({ error: "No builder prompts generated yet." }, { status: 400 });
      }
      content = renderPromptPack(project, prompts as Record<string, any>[]);
      filename = `prism-prompts-${slug}.md`;
      title = `${project.product_name} — Builder Prompt Pack`;
      summary = `${prompts.length} platform-native build prompts.`;
    }

    const file = new File([content], filename, { type: "text/markdown" });
    const uploaded = await base44.integrations.Core.UploadFile({ file });
    const fileUrl = uploaded?.file_url || uploaded?.url;
    if (!fileUrl) throw new Error("Upload did not return a file URL");

    // One current artifact per kind per project — replace any previous file row.
    const existing = await base44.entities.Artifact.filter({ project_id: projectId, kind });
    const payload = {
      project_id: projectId,
      kind,
      title,
      file_url: fileUrl,
      filename,
      size_bytes: content.length,
      summary,
    };
    let row;
    if (existing[0]) {
      row = await base44.entities.Artifact.update(existing[0].id, payload);
    } else {
      row = await base44.entities.Artifact.create(payload);
    }

    return Response.json({
      ok: true,
      artifactId: row?.id || existing[0]?.id,
      file_url: fileUrl,
      filename,
      size_bytes: content.length,
    });
  } catch (err) {
    return Response.json({ error: String(err?.message || err) }, { status: 500 });
  }
});
