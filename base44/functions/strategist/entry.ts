// Prism AI — the AI Product Strategist. Grounded, report-aware consulting chat.
import { createClientFromRequest } from "npm:@base44/sdk";

const MAX_HISTORY = 12;

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
  const reportDigest = sections
    .map((s: { section_key: string; data: unknown }) => `### ${s.section_key}\n${JSON.stringify(s.data)}`)
    .join("\n\n")
    .slice(0, 50000);

  const history = await base44.entities.ChatMessage.filter({ project_id: projectId }, "-created_date", MAX_HISTORY);
  const historyText = history
    .reverse()
    .map((m: { role: string; content: string }) => `${m.role === "user" ? "User" : "Strategist"}: ${m.content}`)
    .join("\n\n");

  await base44.entities.ChatMessage.create({ project_id: projectId, role: "user", content: message.trim() });

  const prompt = `You are the Prism AI Product Strategist — a senior product advisor who has taken multiple companies from seed to scale. You are consulting on the product "${project.product_name || project.input_url}".

You have Prism's full multi-layer intelligence report on this product. Ground every answer in this data — cite specific findings (scores, competitors, psychological techniques, opportunities) when relevant. Give sharp, opinionated, actionable advice like a $1,000/hour consultant, not generic tips. Use markdown: short paragraphs, bold key points, bullet lists where they help. Keep answers focused — under 350 words unless the question truly demands more.

PRODUCT OVERVIEW:
${JSON.stringify(project.overview || {})}

INTELLIGENCE REPORT:
${reportDigest}

CONVERSATION SO FAR:
${historyText || "(none)"}

User: ${message.trim()}

Respond as the Strategist.`;

  try {
    const reply = await base44.integrations.Core.InvokeLLM({ prompt });
    const text = typeof reply === "string" ? reply : JSON.stringify(reply);
    await base44.entities.ChatMessage.create({ project_id: projectId, role: "assistant", content: text });
    return Response.json({ reply: text });
  } catch (err) {
    return Response.json({ error: String(err?.message || err) }, { status: 500 });
  }
});
