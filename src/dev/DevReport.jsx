// DEV-ONLY visual QA harness. Renders the report UI with real captured data so
// the design can be verified without an authenticated session. This route is
// only registered when import.meta.env.DEV is true — it never ships to prod.
import fixture from "./fixture.json";
import ReportView from "@/components/report/ReportView";
import AnalysisExperience from "@/components/report/AnalysisExperience";
import { PublicReportView } from "@/pages/PublicReport";

export function DevReport() {
  const tab = new URLSearchParams(window.location.search).get("tab") || "overview";
  return (
    <div className="max-w-7xl mx-auto px-5 py-8">
      <ReportView
        project={fixture.project}
        sections={fixture.sections}
        onRefresh={() => {}}
        initialTab={tab}
      />
    </div>
  );
}

export function DevPublic() {
  return <PublicReportView project={fixture.project} sections={fixture.sections} />;
}

export function DevAnalysis() {
  // Fresh timestamp so this represents a healthy in-flight run, not a stalled one.
  const now = new Date().toISOString().replace("Z", "");
  const project = {
    ...fixture.project,
    status: "analyzing",
    progress: 44,
    stage: "Decoding user psychology",
    created_date: now,
    updated_date: now,
  };
  const sections = fixture.sections
    .filter((s) => ["business", "design"].includes(s.section_key))
    .concat([
      { ...fixture.sections.find((s) => s.section_key === "technology"), status: "running" },
      { ...fixture.sections.find((s) => s.section_key === "psychology"), status: "running" },
    ]);
  return <AnalysisExperience project={project} sections={sections} />;
}
