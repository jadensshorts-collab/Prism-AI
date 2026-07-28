// Prism AI — public report access.
// Reports are creator-private by row-level security. Sharing is opt-in: the
// owner mints a random token, and this function is the ONLY path that reads a
// report without a session. It runs as service role but will only ever return
// a project whose stored token matches exactly and whose is_public flag is set.
import { createClientFromRequest } from "npm:@base44/sdk";

const PUBLIC_SECTIONS = [
  "business",
  "design",
  "technology",
  "psychology",
  "growth",
  "competitors",
  "innovation",
];

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  let body: { token?: string } = {};
  try {
    body = await req.json();
  } catch {
    // fallthrough
  }
  const token = (body.token || "").trim();
  // Tokens are 32 hex chars; reject anything else before touching the database.
  if (!token || !/^[a-f0-9]{32}$/i.test(token)) {
    return Response.json({ error: "Invalid share link" }, { status: 400 });
  }

  try {
    const matches = await base44.asServiceRole.entities.Project.filter({ share_token: token });
    const project = matches[0];
    if (!project || !project.is_public || project.share_token !== token) {
      return Response.json({ error: "This report is not shared" }, { status: 404 });
    }

    const sections = await base44.asServiceRole.entities.ReportSection.filter({
      project_id: project.id,
      status: "complete",
    });

    // Return only what a public reader should see — never the owner's identity
    // or internal pipeline fields.
    return Response.json({
      project: {
        id: project.id,
        product_name: project.product_name,
        tagline: project.tagline,
        category: project.category,
        input_url: project.input_url,
        overview: project.overview,
        innovation_score: project.innovation_score,
        layer_scores: project.layer_scores,
        created_date: project.created_date,
      },
      sections: sections
        .filter((s: { section_key: string }) => PUBLIC_SECTIONS.includes(s.section_key))
        .map((s: { section_key: string; title: string; data: unknown }) => ({
          section_key: s.section_key,
          title: s.title,
          status: "complete",
          data: s.data,
        })),
    });
  } catch (err) {
    return Response.json({ error: String(err?.message || err) }, { status: 500 });
  }
});
