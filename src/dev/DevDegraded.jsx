// DEV-ONLY: renders the report against deliberately hostile data — empty
// objects, missing arrays, nulls, absurd values, and hostile strings — to prove
// the section renderers degrade instead of crashing.
import ReportView from "@/components/report/ReportView";

const project = {
  id: "degraded",
  input_url: "not-a-real-url",
  product_name: "",
  tagline: null,
  category: undefined,
  status: "complete",
  innovation_score: null,
  layer_scores: null,
  overview: null,
  created_date: new Date().toISOString(),
};

const sections = [
  { id: "1", section_key: "business", title: "Business", status: "complete", data: {} },
  { id: "2", section_key: "design", title: "Design", status: "complete", data: { score: 0, dimensions: null, strengths: null } },
  {
    id: "3",
    section_key: "technology",
    title: "Technology",
    status: "complete",
    data: { stack_summary: "x".repeat(1200), detected: [], score: 250 },
  },
  { id: "4", section_key: "psychology", title: "Psychology", status: "complete", data: { techniques: null } },
  { id: "5", section_key: "growth", title: "Growth", status: "complete", data: { seo: null, score: -40 } },
  { id: "6", section_key: "competitors", title: "Competitors", status: "complete", data: { competitors: null } },
  {
    id: "7",
    section_key: "innovation",
    title: "Innovation",
    status: "complete",
    data: { overall_score: undefined, facets: [], opportunities: null, verdict: "" },
  },
];

export default function DevDegraded() {
  const tab = new URLSearchParams(window.location.search).get("tab") || "overview";
  return (
    <div className="max-w-7xl mx-auto px-5 py-8">
      <ReportView project={project} sections={sections} onRefresh={() => {}} initialTab={tab} />
    </div>
  );
}
