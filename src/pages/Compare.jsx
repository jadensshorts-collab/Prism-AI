import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { GitCompareArrows, Trophy, ArrowRight } from "lucide-react";
import { Project, ReportSection } from "@/api/base44Client";
import ScoreRing from "@/components/ui/ScoreRing";
import Spinner from "@/components/ui/Spinner";
import PrismMark from "@/components/PrismMark";
import { cn, hostnameOf, scoreColor, SECTION_META } from "@/lib/utils";

const LAYER_KEYS = ["business", "design", "technology", "psychology", "growth"];
const FACETS = [
  "Originality",
  "Differentiation",
  "User Value",
  "Execution Quality",
  "Market Opportunity",
  "Future Potential",
];

export default function Compare() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState(null);
  const [leftId, setLeftId] = useState("");
  const [rightId, setRightId] = useState("");
  const [facets, setFacets] = useState({}); // projectId -> {facetName: score}

  useEffect(() => {
    Project.filter({ status: "complete" }, "-created_date", 100)
      .then((ps) => {
        setProjects(ps);
        if (ps.length >= 2) {
          setLeftId(ps[0].id);
          setRightId(ps[1].id);
        }
      })
      .catch(() => setProjects([]));
  }, []);

  // Pull innovation facets for the two selected reports.
  // `requested` tracks ids we've already fetched so this effect never depends on
  // the state it writes — otherwise each successful fetch retriggers the effect
  // and re-requests the other side (and a failed fetch retries indefinitely).
  const requested = useRef(new Set());
  useEffect(() => {
    for (const id of [leftId, rightId]) {
      if (!id || requested.current.has(id)) continue;
      requested.current.add(id);
      ReportSection.filter({ project_id: id, section_key: "innovation" })
        .then(([sec]) => {
          const map = {};
          for (const f of sec?.data?.facets || []) map[f.name] = f.score;
          setFacets((prev) => ({ ...prev, [id]: map }));
        })
        .catch(() => {
          // Allow a later selection of this project to try again.
          requested.current.delete(id);
          setFacets((prev) => ({ ...prev, [id]: {} }));
        });
    }
  }, [leftId, rightId]);

  const left = useMemo(() => projects?.find((p) => p.id === leftId), [projects, leftId]);
  const right = useMemo(() => projects?.find((p) => p.id === rightId), [projects, rightId]);

  if (projects == null) {
    return (
      <div className="flex items-center justify-center py-32 gap-2.5 text-muted text-sm">
        <Spinner /> Loading completed analyses…
      </div>
    );
  }

  if (projects.length < 2) {
    return (
      <div className="max-w-3xl mx-auto mt-6">
        <div className="text-center mb-8">
          <GitCompareArrows size={30} className="mx-auto text-violet-soft mb-4" />
          <h2 className="font-display text-2xl font-semibold mb-2">
            Compare needs <span className="spectrum-text">two reports</span>
          </h2>
          <p className="text-[13px] text-muted leading-relaxed max-w-md mx-auto">
            You have {projects.length === 1 ? "one completed report" : "no completed reports"} so
            far. Analyze {projects.length === 1 ? "one more product" : "two products"} and this view
            unlocks — here's what you'll get.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          {[
            { title: "Innovation duel", desc: "Both innovation scores side by side, with a clear leader." },
            { title: "Facet-by-facet", desc: "Originality, differentiation, execution and more, head to head." },
            { title: "Layer scores", desc: "Business, design, technology, psychology and growth compared." },
          ].map((f) => (
            <div key={f.title} className="glass p-5">
              <h3 className="text-[14px] font-semibold mb-1.5">{f.title}</h3>
              <p className="text-[12.5px] text-muted leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <button onClick={() => navigate("/app")} className="btn-primary mx-auto">
            Analyze a product
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Head-to-<span className="spectrum-text">head</span>
        </h1>
        <p className="text-sm text-muted mt-2">Two products through the same prism.</p>
      </div>

      {/* pickers */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 md:gap-6 mb-8">
        <ProjectSelect projects={projects} value={leftId} onChange={setLeftId} exclude={rightId} />
        <div className="w-10 h-10 rounded-full glass flex items-center justify-center">
          <span className="font-display font-bold text-faint text-sm">VS</span>
        </div>
        <ProjectSelect projects={projects} value={rightId} onChange={setRightId} exclude={leftId} />
      </div>

      <CompareBody left={left} right={right} facets={facets} />
    </div>
  );
}

// Presentation only, so the head-to-head can be rendered from either live
// workspace data or the dev fixture harness.
export function CompareBody({ left, right, facets }) {
  const winner =
    left && right && left.innovation_score != null && right.innovation_score != null
      ? left.innovation_score === right.innovation_score
        ? null
        : left.innovation_score > right.innovation_score
          ? left
          : right
      : null;

  if (!left || !right) return null;

  return (
    <>
      {left && right && (
        <motion.div
          key={left.id + right.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-5"
        >
          {/* innovation heads */}
          <div className="grid grid-cols-2 gap-5">
            {[left, right].map((p) => (
              <div
                key={p.id}
                className={cn(
                  "glass p-6 text-center relative",
                  winner?.id === p.id && "border-emerald/40",
                )}
              >
                {winner?.id === p.id && (
                  <span className="chip border-emerald/40 text-emerald bg-emerald/10 absolute top-3 right-3">
                    <Trophy size={11} /> ahead
                  </span>
                )}
                <h3 className="font-display font-semibold text-lg truncate px-2">
                  {p.product_name || hostnameOf(p.input_url)}
                </h3>
                <p className="text-[11px] text-faint mb-4 truncate">{p.category}</p>
                <ScoreRing score={p.innovation_score} size={110} strokeWidth={8} spectrum label="INNOVATION" />
              </div>
            ))}
          </div>

          {/* facet comparison */}
          <div className="glass p-6 md:p-8">
            <h3 className="font-display text-[15px] font-semibold mb-6 flex items-center gap-2">
              <PrismMark size={15} />
              Innovation facets
            </h3>
            <div className="space-y-5">
              {FACETS.map((f) => (
                <DuelBar
                  key={f}
                  label={f}
                  a={facets[left.id]?.[f]}
                  b={facets[right.id]?.[f]}
                />
              ))}
            </div>
          </div>

          {/* layer scores */}
          <div className="glass p-6 md:p-8">
            <h3 className="font-display text-[15px] font-semibold mb-6">Layer scores</h3>
            <div className="space-y-5">
              {LAYER_KEYS.map((k) => (
                <DuelBar
                  key={k}
                  label={SECTION_META[k].label}
                  a={left.layer_scores?.[k]}
                  b={right.layer_scores?.[k]}
                />
              ))}
            </div>
          </div>

          {/* value props */}
          <div className="grid grid-cols-2 gap-5">
            {[left, right].map((p) => (
              <div key={p.id} className="glass p-5">
                <div className="text-[11px] text-faint uppercase tracking-wider mb-2">Value proposition</div>
                <p className="text-[13px] text-muted leading-relaxed">
                  {p.overview?.value_proposition || "—"}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </>
  );
}

export function ProjectSelect({ projects, value, onChange, exclude }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="input-dark !py-3 appearance-none cursor-pointer"
    >
      {projects
        .filter((p) => p.id !== exclude || p.id === value)
        .map((p) => (
          <option key={p.id} value={p.id} className="bg-raised">
            {p.product_name || hostnameOf(p.input_url)}
          </option>
        ))}
    </select>
  );
}

function DuelBar({ label, a, b }) {
  const aWins = a != null && b != null && a > b;
  const bWins = a != null && b != null && b > a;
  return (
    <div>
      <div className="text-center text-[12px] font-medium text-muted mb-1.5">{label}</div>
      <div className="grid grid-cols-[1fr_auto_auto_auto_1fr] items-center gap-3">
        <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden rotate-180">
          <motion.div
            className="h-full rounded-full"
            style={{ background: scoreColor(a), opacity: aWins ? 1 : 0.55 }}
            initial={{ width: 0 }}
            animate={{ width: `${a ?? 0}%` }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
        <span className={cn("text-[13px] font-semibold tabular-nums w-8 text-right", aWins ? "text-ink" : "text-faint")}>
          {a != null ? Math.round(a) : "—"}
        </span>
        <span className="w-1 h-1 rounded-full bg-edge-strong" />
        <span className={cn("text-[13px] font-semibold tabular-nums w-8", bWins ? "text-ink" : "text-faint")}>
          {b != null ? Math.round(b) : "—"}
        </span>
        <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: scoreColor(b), opacity: bWins ? 1 : 0.55 }}
            initial={{ width: 0 }}
            animate={{ width: `${b ?? 0}%` }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>
    </div>
  );
}
