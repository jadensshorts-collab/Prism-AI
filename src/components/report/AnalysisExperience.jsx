import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, X, Sparkles, RotateCcw, AlertTriangle } from "lucide-react";
import PrismMark from "@/components/PrismMark";
import Spinner from "@/components/ui/Spinner";
import { hostnameOf, parseDate, SECTION_ORDER, SECTION_META } from "@/lib/utils";

// The immersive live pipeline view. Entirely truthful: every stage's state is
// driven by the real Project + ReportSection rows written by the backend.
// A backend function is capped at five minutes. If the pipeline is killed
// mid-run, nothing is left to move the project out of "analyzing" — so watch
// for a stalled run and give the user an honest way out instead of an
// indefinite spinner.
const STALL_AFTER_MS = 3 * 60 * 1000;

function useStalled(project) {
  const [stalled, setStalled] = useState(false);
  useEffect(() => {
    setStalled(false);
    const check = () => {
      const last = parseDate(project.updated_date || project.created_date);
      if (last) setStalled(Date.now() - last.getTime() > STALL_AFTER_MS);
    };
    check();
    const t = setInterval(check, 15000);
    return () => clearInterval(t);
  }, [project.updated_date, project.created_date]);
  return stalled;
}

export default function AnalysisExperience({ project, sections, live, onRetry }) {
  const stalled = useStalled(project);
  const byKey = Object.fromEntries(sections.map((s) => [s.section_key, s]));

  const reconDone = Boolean(project.product_name);
  const stages = [
    {
      key: "recon",
      label: "Discovering product structure",
      status: reconDone ? "complete" : "running",
    },
    ...SECTION_ORDER.map((key) => {
      const row = byKey[key];
      return {
        key,
        label: SECTION_META[key].stage,
        status: row ? row.status : reconDone ? "queued" : "waiting",
      };
    }),
  ];

  return (
    <div className="max-w-xl mx-auto py-8 md:py-14">
      {/* Prism refracting while we work */}
      <div className="relative flex justify-center mb-10">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full opacity-25 blur-[90px] animate-pulse-soft"
          style={{ background: "radial-gradient(circle, #8B5CF6, #22D3EE 60%, transparent 75%)" }}
        />
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <PrismMark size={92} className="drop-shadow-[0_0_36px_rgba(139,92,246,0.5)]" />
        </motion.div>
      </div>

      <div className="text-center mb-8">
        <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">
          Refracting{" "}
          <span className="spectrum-text">
            {project.product_name || hostnameOf(project.input_url)}
          </span>
        </h1>
        <p className="text-sm text-muted mt-2 flex items-center justify-center gap-2">
          <Sparkles size={13} className="text-violet-soft" />
          {project.stage || "Starting the analysis pipeline"}
        </p>
      </div>

      {/* progress */}
      <div className="mb-8">
        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <motion.div
            className="h-full spectrum-bar rounded-full"
            animate={{ width: `${Math.max(project.progress || 0, 3)}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
        <div className="flex justify-between mt-2 text-[11px] text-faint tabular-nums">
          <span className="flex items-center gap-1.5">
            {live && (
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald" />
              </span>
            )}
            {live ? "Streaming live from Base44" : "Live analysis pipeline"}
          </span>
          <span>{project.progress || 0}%</span>
        </div>
      </div>

      {/* stages — driven by real section rows */}
      <div className="glass divide-y divide-edge overflow-hidden">
        {stages.map((s) => (
          <motion.div
            key={s.key}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3.5 px-5 py-3"
          >
            <StageIcon status={s.status} />
            <span
              className={
                s.status === "complete"
                  ? "text-[13px] text-ink"
                  : s.status === "running"
                    ? "text-[13px] text-ink font-medium"
                    : s.status === "failed"
                      ? "text-[13px] text-rose"
                      : "text-[13px] text-faint"
              }
            >
              {s.label}
            </span>
            {s.status === "running" && (
              <span className="ml-auto text-[11px] text-violet-soft animate-pulse-soft">
                analyzing…
              </span>
            )}
            {s.status === "failed" && (
              <span className="ml-auto text-[11px] text-rose">will offer retry</span>
            )}
          </motion.div>
        ))}
      </div>

      {stalled ? (
        <div className="mt-6 rounded-xl border border-amber/30 bg-amber/[0.06] px-5 py-4 text-center">
          <p className="text-[13px] text-amber flex items-center justify-center gap-2 font-medium">
            <AlertTriangle size={14} />
            This run has gone quiet
          </p>
          <p className="text-[12px] text-muted mt-1.5 leading-relaxed">
            No progress for a few minutes, so the pipeline was probably interrupted. Starting over
            is safe — nothing is charged for a failed run.
          </p>
          {onRetry && (
            <button onClick={onRetry} className="btn-primary mx-auto mt-4 !py-2">
              <RotateCcw size={14} />
              Restart analysis
            </button>
          )}
        </div>
      ) : (
        <p className="text-center text-[12px] text-faint mt-6 leading-relaxed">
          Prism is running {SECTION_ORDER.length + 1} AI analysis passes across parallel models.
          <br />
          Typically 15–60 seconds — you can safely leave and come back.
        </p>
      )}
    </div>
  );
}

function StageIcon({ status }) {
  if (status === "complete")
    return (
      <span className="w-5 h-5 rounded-full bg-emerald/15 border border-emerald/40 flex items-center justify-center">
        <Check size={11} className="text-emerald" />
      </span>
    );
  if (status === "running") return <Spinner size={18} />;
  if (status === "failed")
    return (
      <span className="w-5 h-5 rounded-full bg-rose/15 border border-rose/40 flex items-center justify-center">
        <X size={11} className="text-rose" />
      </span>
    );
  return <span className="w-5 h-5 rounded-full border border-edge" />;
}
