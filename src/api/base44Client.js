import { createClient } from "@base44/sdk";

// In local dev, `base44 dev` injects VITE_BASE44_APP_ID and
// VITE_BASE44_APP_BASE_URL (pointing at the local backend proxy).
// In production the deployed site uses SDK defaults.
export const base44 = createClient({
  appId: import.meta.env.VITE_BASE44_APP_ID ?? "6a67a71379a7f66c76d06220",
  ...(import.meta.env.VITE_BASE44_APP_BASE_URL
    ? {
        serverUrl: import.meta.env.VITE_BASE44_APP_BASE_URL,
        appBaseUrl: import.meta.env.VITE_BASE44_APP_BASE_URL,
      }
    : {}),
});

export const Project = base44.entities.Project;
export const ReportSection = base44.entities.ReportSection;
export const ChatMessage = base44.entities.ChatMessage;
export const Evolution = base44.entities.Evolution;
export const Prd = base44.entities.Prd;
export const GeneratedPrompt = base44.entities.GeneratedPrompt;
export const Artifact = base44.entities.Artifact;
export const UserProfile = base44.entities.UserProfile;

export const invokeFunction = (name, params) => base44.functions.invoke(name, params);

// Product analytics: every meaningful workflow milestone lands in the Base44
// analytics dashboard. Fire-and-forget — never let telemetry break a flow.
export function track(eventName, properties) {
  try {
    base44.analytics.track({ eventName, properties });
  } catch {
    // analytics is best-effort
  }
}

// Kicks off the analysis pipeline without awaiting it — realtime streams the
// progress. The request itself is long-lived, so a client-side network error
// does NOT imply the backend failed: the pipeline may still be running happily.
// Only mark the project failed when it has genuinely never started (progress
// still 0 after a grace period), otherwise a dropped connection would kill a
// perfectly good analysis mid-flight.
export function fireAnalyze(projectId) {
  base44.functions.invoke("analyze", { projectId }).catch(async (e) => {
    await new Promise((r) => setTimeout(r, 4000));
    try {
      const p = await Project.get(projectId);
      if (p.status === "analyzing" && (p.progress || 0) === 0) {
        await Project.update(projectId, {
          status: "failed",
          error: e?.response?.data?.error || e?.message || "The analysis could not start.",
        });
      }
    } catch {
      // project may have been deleted — nothing to surface
    }
  });
}
