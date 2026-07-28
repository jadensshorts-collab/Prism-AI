// Builds a shareable markdown version of a full Prism report.
import { SECTION_ORDER, SECTION_META, scoreLabel, parseDate } from "@/lib/utils";

function line(items, fn) {
  return (items || []).map(fn).join("\n");
}

export function buildReportMarkdown(project, sections) {
  const byKey = Object.fromEntries(sections.map((s) => [s.section_key, s]));
  const o = project.overview || {};
  const parts = [];

  parts.push(`# Prism AI Report — ${project.product_name || project.input_url}`);
  parts.push(`> ${project.tagline || ""}\n`);
  parts.push(`- **Category:** ${project.category || "—"}`);
  parts.push(`- **Analyzed:** ${parseDate(project.created_date)?.toLocaleString() || "—"}`);
  if (project.innovation_score != null) {
    parts.push(`- **Innovation Score:** ${Math.round(project.innovation_score)}/100 (${scoreLabel(project.innovation_score)})`);
  }

  parts.push(`\n## Product Overview`);
  parts.push(`**What it does:** ${o.what_it_does || "—"}\n`);
  parts.push(`**Problem solved:** ${o.problem_solved || "—"}\n`);
  parts.push(`**Value proposition:** ${o.value_proposition || "—"}\n`);
  if (o.target_users?.length) parts.push(`**Target users:**\n${line(o.target_users, (u) => `- ${u}`)}\n`);
  if (o.key_features?.length) parts.push(`**Key features:**\n${line(o.key_features, (f) => `- ${f}`)}\n`);

  for (const key of SECTION_ORDER) {
    const sec = byKey[key];
    if (!sec || sec.status !== "complete" || !sec.data) continue;
    const d = sec.data;
    parts.push(`\n## ${SECTION_META[key].label} Layer`);

    if (key === "business") {
      parts.push(`${d.business_model || ""}\n`);
      if (d.pricing_strategy?.model) parts.push(`**Pricing model:** ${d.pricing_strategy.model}\n`);
      if (d.pricing_strategy?.tiers?.length)
        parts.push(line(d.pricing_strategy.tiers, (t) => `- **${t.name}** (${t.price}) — ${t.for_whom}`) + "\n");
      if (d.customer_segments?.length)
        parts.push(`**Segments:**\n${line(d.customer_segments, (s) => `- **${s.segment}** — ${s.needs}`)}\n`);
      if (d.monetization_opportunities?.length)
        parts.push(`**Monetization opportunities:**\n${line(d.monetization_opportunities, (m) => `- ${m}`)}\n`);
      parts.push(`**Score:** ${Math.round(d.score)}/100`);
    } else if (key === "design") {
      parts.push(`${d.overall_assessment || ""}\n`);
      if (d.dimensions?.length)
        parts.push(line(d.dimensions, (x) => `- **${x.name}:** ${Math.round(x.score)}/100 — ${x.notes || ""}`) + "\n");
      if (d.strengths?.length) parts.push(`**Strengths:**\n${line(d.strengths, (s) => `- ${s}`)}\n`);
      if (d.weaknesses?.length) parts.push(`**Weaknesses:**\n${line(d.weaknesses, (s) => `- ${s}`)}\n`);
      parts.push(`**Score:** ${Math.round(d.score)}/100`);
    } else if (key === "technology") {
      parts.push(`${d.stack_summary || ""}\n`);
      if (d.detected?.length)
        parts.push(line(d.detected, (t) => `- **${t.category}:** ${t.name} (${t.confidence}) — ${t.evidence || ""}`) + "\n");
      if (d.architecture_notes) parts.push(`**Architecture notes:** ${d.architecture_notes}\n`);
    } else if (key === "psychology") {
      parts.push(`${d.summary || ""}\n`);
      if (d.techniques?.length)
        parts.push(line(d.techniques, (t) => `- **${t.name}** (${t.category}) — ${t.why_it_works || ""}`) + "\n");
      if (d.missing_techniques?.length)
        parts.push(`**Missing techniques:**\n${line(d.missing_techniques, (t) => `- **${t.name}** — ${t.opportunity}`)}\n`);
    } else if (key === "growth") {
      parts.push(`${d.summary || ""}\n`);
      if (d.acquisition_channels?.length)
        parts.push(`**Acquisition:**\n${line(d.acquisition_channels, (c) => `- **${c.channel}** (${c.effectiveness}) — ${c.notes || ""}`)}\n`);
      if (d.retention_mechanics?.length)
        parts.push(`**Retention:**\n${line(d.retention_mechanics, (r) => `- ${r}`)}\n`);
      if (d.recommendations?.length)
        parts.push(`**Recommendations:**\n${line(d.recommendations, (r) => `- ${r}`)}\n`);
    } else if (key === "competitors") {
      parts.push(`${d.market_position || ""}\n`);
      if (d.competitors?.length)
        parts.push(
          line(
            d.competitors,
            (c) =>
              `### ${c.name} (threat: ${c.threat_level})\n${c.positioning || ""}\n- Pricing: ${c.pricing || "—"}\n- Strengths: ${(c.strengths || []).join("; ")}\n- Weaknesses: ${(c.weaknesses || []).join("; ")}`,
          ) + "\n",
        );
      if (d.white_space) parts.push(`**White space:** ${d.white_space}`);
    } else if (key === "innovation") {
      parts.push(`**Innovation Score: ${Math.round(d.overall_score)}/100** — ${d.verdict || ""}\n`);
      if (d.facets?.length)
        parts.push(line(d.facets, (f) => `- **${f.name}:** ${Math.round(f.score)}/100 — ${f.rationale || ""}`) + "\n");
      if (d.opportunities?.length)
        parts.push(
          `### Untapped Opportunities\n` +
            line(d.opportunities, (op) => `- **${op.title}** [${op.category}, impact: ${op.impact}] — ${op.description}`),
        );
    }
  }

  parts.push(`\n---\n*Generated by Prism AI — product intelligence, refracted.*`);
  return parts.join("\n");
}
