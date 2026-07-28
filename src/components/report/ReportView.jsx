import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Download,
  Layers,
  TrendingUp,
  Palette,
  Cpu,
  Brain,
  Rocket,
  Swords,
  Gauge,
  MessageSquareText,
  Hammer,
  RotateCcw,
  ExternalLink,
} from "lucide-react";
import { invokeFunction, Artifact } from "@/api/base44Client";
import ScoreRing from "@/components/ui/ScoreRing";
import Spinner from "@/components/ui/Spinner";
import { cn, hostnameOf, downloadText, SECTION_META } from "@/lib/utils";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { buildReportMarkdown } from "@/lib/exportReport";
import {
  OverviewSection,
  BusinessSection,
  DesignSection,
  TechnologySection,
  PsychologySection,
  GrowthSection,
  CompetitorsSection,
  InnovationSection,
} from "@/components/report/sections";
import Strategist from "@/components/report/Strategist";
import BuildStudio from "@/components/report/BuildStudio";
import ShareButton from "@/components/report/ShareButton";

const TABS = [
  { key: "overview", label: "Overview", icon: Layers },
  { key: "business", label: "Business", icon: TrendingUp },
  { key: "design", label: "Design", icon: Palette },
  { key: "technology", label: "Technology", icon: Cpu },
  { key: "psychology", label: "Psychology", icon: Brain },
  { key: "growth", label: "Growth", icon: Rocket },
  { key: "competitors", label: "Competitors", icon: Swords },
  { key: "innovation", label: "Innovation", icon: Gauge },
  { key: "strategist", label: "Strategist", icon: MessageSquareText },
  { key: "build", label: "Build Studio", icon: Hammer },
];

const SECTION_COMPONENTS = {
  business: BusinessSection,
  design: DesignSection,
  technology: TechnologySection,
  psychology: PsychologySection,
  growth: GrowthSection,
  competitors: CompetitorsSection,
  innovation: InnovationSection,
};

export default function ReportView({ project, sections, onRefresh, initialTab }) {
  const [tab, setTab] = useState(initialTab || "overview");
  const [exporting, setExporting] = useState(false);
  useDocumentTitle(
    `${project.product_name || hostnameOf(project.input_url)} — Prism AI`,
  );
  const byKey = useMemo(
    () => Object.fromEntries(sections.map((s) => [s.section_key, s])),
    [sections],
  );

  // Export runs through the backend: the report is rendered server-side,
  // uploaded to Base44 file storage, and kept as a durable Artifact row.
  // If that round-trip fails we still hand the user a file, built locally.
  const exportReport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const res = await invokeFunction("export-artifact", { projectId: project.id, kind: "report" });
      if (res?.data?.error) throw new Error(res.data.error);
      // The backend renders and stores the document; pull the stored copy back
      // so the file the user gets is exactly what was persisted.
      const rows = await Artifact.filter({ project_id: project.id, kind: "report" });
      if (!rows.length) throw new Error("Export produced no document");
      const md = rows
        .sort((a, b) => (a.part || 0) - (b.part || 0))
        .map((r) => r.content || "")
        .join("\n");
      downloadText(rows[0].filename || "prism-report.md", md);
    } catch {
      const md = buildReportMarkdown(project, sections);
      const name = (project.product_name || hostnameOf(project.input_url)).replace(/[^\w-]+/g, "-");
      downloadText(`prism-report-${name}.md`.toLowerCase(), md);
    } finally {
      setExporting(false);
    }
  };

  const productUrl = /^https?:\/\//.test(project.input_url) ? project.input_url : null;

  return (
    <div>
      {/* header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 mb-7">
        <div className="flex items-center gap-5 min-w-0">
          <Link to="/app" className="btn-ghost !p-2.5 shrink-0" title="Back to workspace">
            <ArrowLeft size={16} />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight truncate">
                {project.product_name || hostnameOf(project.input_url)}
              </h1>
              {project.category && (
                <span className="chip border-violet/40 text-violet-soft bg-violet/10">{project.category}</span>
              )}
            </div>
            <p className="text-sm text-muted mt-1 truncate">
              {project.tagline || project.input_url}
              {productUrl && (
                <a
                  href={productUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 ml-2 text-faint hover:text-cyan-soft transition-colors"
                >
                  <ExternalLink size={11} />
                  {hostnameOf(project.input_url)}
                </a>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-5 shrink-0">
          <ShareButton project={project} />
          <button onClick={exportReport} disabled={exporting} className="btn-ghost">
            {exporting ? <Spinner size={15} /> : <Download size={15} />}
            {exporting ? "Rendering…" : "Export"}
          </button>
          <div className="flex items-center gap-3">
            <ScoreRing score={project.innovation_score} size={62} strokeWidth={5} spectrum />
            <div>
              <div className="text-[11px] text-faint leading-tight">Innovation</div>
              <div className="text-[11px] text-faint leading-tight">Score</div>
            </div>
          </div>
        </div>
      </div>

      {/* tab nav */}
      <div className="sticky top-14 z-30 -mx-5 px-5 bg-void/85 backdrop-blur-xl border-b border-edge mb-7">
        <div className="flex gap-1 overflow-x-auto pb-0 scrollbar-none">
          {TABS.map((t) => {
            const sec = byKey[t.key];
            const failed = sec?.status === "failed";
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "relative flex items-center gap-1.5 px-3.5 py-3 text-[13px] font-medium whitespace-nowrap transition-colors",
                  active ? "text-ink" : failed ? "text-rose/80 hover:text-rose" : "text-muted hover:text-ink",
                )}
              >
                <t.icon size={14} />
                {t.label}
                {sec?.status === "running" && <Spinner size={11} />}
                {active && (
                  <motion.div layoutId="tab-underline" className="absolute bottom-0 left-2 right-2 h-[2px] spectrum-bar rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
        >
          {tab === "overview" ? (
            <OverviewSection project={project} sections={sections} onNavigate={setTab} />
          ) : tab === "strategist" ? (
            <Strategist project={project} />
          ) : tab === "build" ? (
            <BuildStudio project={project} />
          ) : (
            <SectionGate
              project={project}
              section={byKey[tab]}
              sectionKey={tab}
              onRefresh={onRefresh}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// Renders a layer section, or its running/failed states with a real retry.
function SectionGate({ project, section, sectionKey, onRefresh }) {
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState("");

  const retry = async () => {
    setRetrying(true);
    setRetryError("");
    try {
      const res = await invokeFunction("retry-section", { projectId: project.id, sectionKey });
      if (res?.data?.error) throw new Error(res.data.error);
    } catch (e) {
      // Without this the button just spins and resets, leaving the user unsure
      // whether anything happened.
      setRetryError(
        e?.response?.data?.error || e?.message || "That layer didn't come back. Try again in a moment.",
      );
    } finally {
      setRetrying(false);
      onRefresh();
    }
  };

  if (!section || section.status === "failed") {
    return (
      <div className="glass p-12 text-center max-w-lg mx-auto">
        <RotateCcw size={26} className="mx-auto text-muted mb-4" />
        <h3 className="font-semibold mb-1.5">
          {SECTION_META[sectionKey]?.label} layer {section ? "failed" : "wasn't generated"}
        </h3>
        <p className="text-[13px] text-muted mb-6">
          {section?.error || "This layer hit a snag during the pipeline."} Run it again — it takes
          about a minute.
        </p>
        <button onClick={retry} disabled={retrying} className="btn-primary mx-auto">
          {retrying ? <Spinner size={15} className="text-white" /> : <RotateCcw size={15} />}
          {retrying ? "Re-analyzing…" : "Run this layer"}
        </button>
        {retryError && (
          <p className="text-[12px] text-rose mt-4 leading-relaxed">{retryError}</p>
        )}
      </div>
    );
  }

  if (section.status === "running") {
    return (
      <div className="glass p-12 text-center max-w-lg mx-auto">
        <Spinner size={26} className="mx-auto mb-4" />
        <p className="text-[13px] text-muted">
          {SECTION_META[sectionKey]?.stage}… this refreshes automatically.
        </p>
      </div>
    );
  }

  const Cmp = SECTION_COMPONENTS[sectionKey];
  return <Cmp data={section.data || {}} project={project} />;
}
