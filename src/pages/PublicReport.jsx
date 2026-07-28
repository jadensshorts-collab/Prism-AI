import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ExternalLink, Lock } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useEnterWorkspace } from "@/lib/useAuth";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import PrismMark from "@/components/PrismMark";
import Spinner from "@/components/ui/Spinner";
import ScoreRing from "@/components/ui/ScoreRing";
import ScoreBar from "@/components/ui/ScoreBar";
import { hostnameOf, scoreColor, SECTION_META } from "@/lib/utils";
import {
  BusinessSection,
  DesignSection,
  TechnologySection,
  PsychologySection,
  GrowthSection,
  CompetitorsSection,
  InnovationSection,
} from "@/components/report/sections";

const COMPONENTS = {
  business: BusinessSection,
  design: DesignSection,
  technology: TechnologySection,
  psychology: PsychologySection,
  growth: GrowthSection,
  competitors: CompetitorsSection,
  innovation: InnovationSection,
};

const ORDER = [
  "innovation",
  "business",
  "design",
  "technology",
  "psychology",
  "growth",
  "competitors",
];

// A shared report, readable with no account. Data comes from the
// `public-report` backend function, which only ever returns a project whose
// owner explicitly turned sharing on.
export default function PublicReport() {
  const { token } = useParams();
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    let alive = true;
    base44.functions
      .invoke("public-report", { token })
      .then((res) => {
        if (!alive) return;
        const d = res?.data;
        if (d?.error || !d?.project) setState({ loading: false, error: d?.error || "Not found" });
        else setState({ loading: false, ...d });
      })
      .catch((e) =>
        alive &&
        setState({
          loading: false,
          error: e?.response?.data?.error || "This report isn't available.",
        }),
      );
    return () => {
      alive = false;
    };
  }, [token]);

  if (state.loading) {
    return (
      <div className="min-h-screen bg-void flex flex-col items-center justify-center gap-4">
        <PrismMark size={46} className="animate-pulse-soft" />
        <span className="text-sm text-muted flex items-center gap-2">
          <Spinner size={14} /> Loading shared report…
        </span>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="min-h-screen bg-void flex flex-col items-center justify-center gap-4 px-6 text-center">
        <Lock size={30} className="text-muted" />
        <h1 className="font-display text-xl font-semibold">This report isn't shared</h1>
        <p className="text-[13px] text-muted max-w-sm">
          The link may have been revoked, or the report was never made public.
        </p>
        <Link to="/" className="btn-primary mt-3">
          Go to Prism AI <ArrowRight size={15} />
        </Link>
      </div>
    );
  }

  return <PublicReportView project={state.project} sections={state.sections} />;
}

// Presentation only, so the layout can be rendered from either the live share
// endpoint or the dev fixture harness.
export function PublicReportView({ project, sections }) {
  const enterWorkspace = useEnterWorkspace();
  useDocumentTitle(
    `${project.product_name || hostnameOf(project.input_url)} — Prism AI report`,
    project.tagline ||
      `Prism AI's eight-layer intelligence report on ${project.product_name || "this product"}.`,
  );
  const byKey = Object.fromEntries((sections || []).map((s) => [s.section_key, s]));
  const o = project.overview || {};
  const productUrl = /^https?:\/\//.test(project.input_url) ? project.input_url : null;

  return (
    <div className="min-h-screen bg-void relative overflow-x-clip">
      <div className="absolute inset-0 bg-grid mask-fade-b h-[700px]" />
      <div
        className="absolute -top-40 left-1/2 -translate-x-1/2 w-[820px] h-[420px] rounded-full opacity-20 blur-[120px]"
        style={{ background: "radial-gradient(ellipse, #8B5CF6, #22D3EE 55%, transparent 75%)" }}
      />

      <header className="relative z-10 max-w-5xl mx-auto flex items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2.5">
          <PrismMark size={24} />
          <span className="font-display font-semibold tracking-tight">Prism AI</span>
        </Link>
        <button onClick={enterWorkspace} className="btn-ghost !py-2">
          Analyze a product <ArrowRight size={14} />
        </button>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-6 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center pt-6 pb-10"
        >
          <span className="chip border-violet/40 text-violet-soft bg-violet/10 mb-5">
            Shared intelligence report
          </span>
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
            {project.product_name || hostnameOf(project.input_url)}
          </h1>
          {project.tagline && (
            <p className="text-muted mt-3 max-w-2xl mx-auto leading-relaxed">{project.tagline}</p>
          )}
          <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
            {project.category && (
              <span className="chip border-edge text-muted bg-white/[0.03]">{project.category}</span>
            )}
            {productUrl && (
              <a
                href={productUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[12px] text-faint hover:text-cyan-soft transition-colors flex items-center gap-1"
              >
                <ExternalLink size={11} />
                {hostnameOf(project.input_url)}
              </a>
            )}
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-8 mt-10">
            <ScoreRing score={project.innovation_score} size={150} strokeWidth={9} spectrum label="INNOVATION" />
            {project.layer_scores && (
              <div className="w-full max-w-sm grid sm:grid-cols-2 gap-x-8 gap-y-3.5">
                {Object.entries(project.layer_scores).map(([k, v], i) => (
                  <ScoreBar
                    key={k}
                    label={SECTION_META[k]?.label || k}
                    score={v}
                    delay={i * 0.06}
                  />
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {o.what_it_does && (
          <section className="glass p-6 md:p-7 mb-5">
            <h2 className="font-display text-[15px] font-semibold mb-3">What it does</h2>
            <p className="text-[14px] text-muted leading-relaxed">{o.what_it_does}</p>
            {o.value_proposition && (
              <p className="text-[13px] text-muted leading-relaxed mt-3 pt-3 border-t border-edge">
                <span className="text-ink font-medium">Value proposition: </span>
                {o.value_proposition}
              </p>
            )}
          </section>
        )}

        <div className="space-y-10">
          {ORDER.filter((k) => byKey[k]?.data).map((k) => {
            const Cmp = COMPONENTS[k];
            return (
              <section key={k}>
                <div className="flex items-center gap-2.5 mb-4">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: scoreColor(project.layer_scores?.[k] ?? project.innovation_score) }}
                  />
                  <h2 className="font-display text-xl font-semibold">
                    {SECTION_META[k]?.label} {k === "innovation" ? "Meter" : "Layer"}
                  </h2>
                </div>
                <Cmp data={byKey[k].data} project={project} />
              </section>
            );
          })}
        </div>

        <div className="glass p-8 mt-12 text-center relative overflow-hidden">
          <div
            className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-56 rounded-full opacity-20 blur-[80px]"
            style={{ background: "radial-gradient(ellipse, #22D3EE, transparent 70%)" }}
          />
          <div className="relative">
            <PrismMark size={34} className="mx-auto mb-4" />
            <h2 className="font-display text-2xl font-bold tracking-tight">
              Reveal <span className="spectrum-text">your own</span> product
            </h2>
            <p className="text-[13px] text-muted mt-2 max-w-md mx-auto leading-relaxed">
              This report was generated by Prism AI in under a minute — eight layers of product
              intelligence, then a build-ready plan.
            </p>
            <button onClick={enterWorkspace} className="btn-primary mt-6 mx-auto">
              Analyze a product free <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
