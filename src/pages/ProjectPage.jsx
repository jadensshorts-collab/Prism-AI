import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowLeft, RotateCcw } from "lucide-react";
import { Project, ReportSection, fireAnalyze } from "@/api/base44Client";
import { useLiveProject } from "@/lib/useLiveProject";
import Spinner from "@/components/ui/Spinner";
import AnalysisExperience from "@/components/report/AnalysisExperience";
import ReportView from "@/components/report/ReportView";

export default function ProjectPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { project, sections, notFound, live, refresh } = useLiveProject(id);
  const [restarting, setRestarting] = useState(false);

  const retryAnalysis = async () => {
    setRestarting(true);
    try {
      await Project.update(id, {
        status: "analyzing",
        progress: 0,
        stage: "Restarting",
        error: "",
        sections_done: 0,
      });
      const old = await ReportSection.filter({ project_id: id });
      await Promise.all(old.map((s) => ReportSection.delete(s.id).catch(() => {})));
      fireAnalyze(id);
      await refresh();
    } finally {
      setRestarting(false);
    }
  };

  if (notFound) {
    return (
      <div className="py-24 text-center">
        <AlertTriangle size={32} className="mx-auto text-rose mb-4" />
        <p className="text-muted">This analysis doesn't exist or isn't yours.</p>
        <button onClick={() => navigate("/app")} className="btn-ghost mt-6 mx-auto">
          <ArrowLeft size={15} /> Back to workspace
        </button>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center py-32 gap-2.5 text-muted text-sm">
        <Spinner /> Loading analysis…
      </div>
    );
  }

  if (project.status === "failed") {
    return (
      <div className="py-24 text-center max-w-md mx-auto">
        <AlertTriangle size={32} className="mx-auto text-rose mb-4" />
        <h2 className="font-display text-xl font-semibold mb-2">Analysis failed</h2>
        <p className="text-[13px] text-muted leading-relaxed">
          {project.error || "Something went wrong during the analysis."}
        </p>
        <div className="flex items-center justify-center gap-3 mt-7">
          <button onClick={() => navigate("/app")} className="btn-ghost">
            <ArrowLeft size={15} /> Workspace
          </button>
          <button onClick={retryAnalysis} disabled={restarting} className="btn-primary">
            {restarting ? <Spinner size={15} className="text-white" /> : <RotateCcw size={15} />}
            Retry analysis
          </button>
        </div>
      </div>
    );
  }

  if (project.status === "analyzing") {
    return (
      <AnalysisExperience
        project={project}
        sections={sections}
        live={live}
        onRetry={restarting ? undefined : retryAnalysis}
      />
    );
  }

  return <ReportView project={project} sections={sections} onRefresh={refresh} />;
}
