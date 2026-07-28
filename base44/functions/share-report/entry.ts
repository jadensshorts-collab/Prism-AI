// Prism AI — toggles public sharing for a report and mints its share token.
// Only the owner can call this; RLS on Project.get ensures that.
import { createClientFromRequest } from "npm:@base44/sdk";

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: { projectId?: string; share?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    // fallthrough
  }
  const { projectId, share } = body;
  if (!projectId || typeof share !== "boolean") {
    return Response.json({ error: "projectId and share (boolean) are required" }, { status: 400 });
  }

  // Reading through the user-scoped client enforces ownership.
  const project = await base44.entities.Project.get(projectId).catch(() => null);
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  try {
    if (!share) {
      // Revoke: clearing the token permanently invalidates any link already out there.
      await base44.entities.Project.update(projectId, { is_public: false, share_token: "" });
      return Response.json({ ok: true, is_public: false, share_token: null });
    }

    const token =
      project.share_token && /^[a-f0-9]{32}$/i.test(project.share_token)
        ? project.share_token
        : Array.from(crypto.getRandomValues(new Uint8Array(16)))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");

    await base44.entities.Project.update(projectId, { is_public: true, share_token: token });
    return Response.json({ ok: true, is_public: true, share_token: token });
  } catch (err) {
    return Response.json({ error: String(err?.message || err) }, { status: 500 });
  }
});
