import { Prd } from "@/api/base44Client";
import { parseDate } from "@/lib/utils";

// PRDs are stored as ordered chunk-row groups (entity string fields are
// size-capped). Returns the newest fully-assembled PRD for a project, shaped
// like a single document: { id, title, content, evolution_id, created_date }.
export async function fetchLatestPrd(projectId) {
  const rows = await Prd.filter({ project_id: projectId }, "-created_date", 50).catch(() => []);
  if (!rows.length) return null;

  const groups = new Map();
  for (const r of rows) {
    const key = r.group_id || r.id;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }

  let latest = null;
  for (const parts of groups.values()) {
    const newest = Math.max(...parts.map((p) => parseDate(p.created_date)?.getTime() || 0));
    if (!latest || newest > latest.newest) latest = { parts, newest };
  }

  const parts = latest.parts.sort((a, b) => (a.part || 0) - (b.part || 0));
  const first = parts[0];
  return {
    id: first.id,
    title: first.title,
    evolution_id: first.evolution_id,
    created_date: first.created_date,
    content: parts.map((p) => p.content).join("\n"),
  };
}
