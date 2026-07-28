// DEV-ONLY: an analysis whose last update is well past the stall threshold, to
// verify the recovery affordance appears instead of an endless spinner.
import AnalysisExperience from "@/components/report/AnalysisExperience";
import fixture from "./fixture.json";

const stale = new Date(Date.now() - 9 * 60 * 1000).toISOString().replace("Z", "");

const project = {
  ...fixture.project,
  status: "analyzing",
  progress: 41,
  stage: "Decoding user psychology",
  created_date: stale,
  updated_date: stale,
};

export default function DevStalled() {
  return (
    <AnalysisExperience
      project={project}
      sections={fixture.sections.slice(0, 2)}
      live
      onRetry={() => alert("retry invoked")}
    />
  );
}
