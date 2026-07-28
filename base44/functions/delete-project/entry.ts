// Prism AI — cascading project delete.
// A project owns rows in six other entities. Deleting only the Project row
// would orphan every report section, concept, PRD chunk, prompt, and artifact
// tied to it, so removal is done as one server-side sweep.
import { createClientFromRequest } from "npm:@base44/sdk";

const CHILD_ENTITIES = [
  "ReportSection",
  "ChatMessage",
  "Evolution",
  "Prd",
  "GeneratedPrompt",
  "Artifact",
] as const;

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

  // Reading through the user-scoped client enforces ownership before anything
  // is destroyed — a non-owner simply cannot resolve the project.
  const project = await base44.entities.Project.get(projectId).catch(() => null);
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  const removed: Record<string, number> = {};
  try {
    for (const name of CHILD_ENTITIES) {
      const rows = await base44.entities[name].filter({ project_id: projectId }).catch(() => []);
      const results = await Promise.allSettled(
        rows.map((r: { id: string }) => base44.entities[name].delete(r.id)),
      );
      removed[name] = results.filter((r) => r.status === "fulfilled").length;
    }

    await base44.entities.Project.delete(projectId);
    return Response.json({ ok: true, removed });
  } catch (err) {
    return Response.json({ error: String(err?.message || err) }, { status: 500 });
  }
});
