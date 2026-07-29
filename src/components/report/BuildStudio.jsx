import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wand2,
  FileText,
  Terminal,
  Check,
  Copy,
  Download,
  RotateCcw,
  Sparkles,
  ChevronRight,
  Save,
  Trophy,
  Users,
  Workflow,
  CircleDollarSign,
  Bot,
  ShieldCheck,
  HardDrive,
} from "lucide-react";
import Deliverables from "@/components/report/Deliverables";
import { Evolution, GeneratedPrompt, Project, invokeFunction, track } from "@/api/base44Client";
import { fetchLatestPrd } from "@/lib/prdStore";
import Markdown from "@/components/ui/Markdown";
import Spinner from "@/components/ui/Spinner";
import ScoreBar from "@/components/ui/ScoreBar";
import PrismMark from "@/components/PrismMark";
import { cn, copyText, downloadText } from "@/lib/utils";

const PLATFORM_LABELS = {
  base44: "Base44",
  "claude-code": "Claude Code",
  cursor: "Cursor",
  lovable: "Lovable",
  v0: "v0",
  replit: "Replit",
  windsurf: "Windsurf",
  codex: "Codex",
};

export default function BuildStudio({ project }) {
  const [evolution, setEvolution] = useState(undefined); // undefined = loading
  const [prd, setPrd] = useState(undefined);
  const [prompts, setPrompts] = useState([]);
  const [recommendation, setRecommendation] = useState(project.builder_recommendation || null);
  const [working, setWorking] = useState(""); // "" | "evolve" | "prd" | "prompts"
  const [error, setError] = useState("");
  const [step, setStep] = useState(null);

  const load = async () => {
    const [evos, latestPrd, proj] = await Promise.all([
      Evolution.filter({ project_id: project.id }, "-created_date", 5).catch(() => []),
      fetchLatestPrd(project.id),
      Project.get(project.id).catch(() => null),
    ]);

    // Prompts belong to the PRD they were compiled from. Scoping the query to
    // the current PRD keeps prompts from a previously regenerated PRD out of
    // the platform tabs, where they would silently read as current.
    const gps = latestPrd
      ? await GeneratedPrompt.filter({ project_id: project.id, prd_id: latestPrd.id }).catch(() => [])
      : [];

    setEvolution(evos[0] || null);
    setPrd(latestPrd);
    setPrompts(gps);
    if (proj?.builder_recommendation) setRecommendation(proj.builder_recommendation);
    return { evo: evos[0] || null, prd: latestPrd, gps };
  };

  useEffect(() => {
    load().then(({ evo, prd: p, gps }) => {
      setStep(gps.length > 0 ? 3 : p ? 3 : evo ? 2 : 1);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  const run = async (kind, fn) => {
    setWorking(kind);
    setError("");
    try {
      const res = await fn();
      if (res?.data?.error) throw new Error(res.data.error);
      track(`${kind}_generated`, { project_id: project.id, product: project.product_name || "" });
      await load();
      return true;
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Generation failed — try again.");
      return false;
    } finally {
      setWorking("");
    }
  };

  const runEvolve = async () => {
    const ok = await run("evolve", () => invokeFunction("evolve", { projectId: project.id }));
    if (ok) setStep(2);
  };

  const runPrd = async () => {
    if (!evolution) return;
    const ok = await run("prd", () =>
      invokeFunction("generate-prd", { projectId: project.id, evolutionId: evolution.id }),
    );
    if (ok) setStep(3);
  };

  const runPrompts = async () => {
    if (!prd) return;
    await run("prompts", () =>
      invokeFunction("generate-prompts", { projectId: project.id, prdId: prd.id }),
    );
  };

  if (evolution === undefined || step === null) {
    return (
      <div className="flex items-center justify-center py-24 gap-2.5 text-muted text-sm">
        <Spinner /> Opening Build Studio…
      </div>
    );
  }

  const steps = [
    { n: 1, label: "Evolution Mode", icon: Wand2, done: !!evolution },
    { n: 2, label: "PRD", icon: FileText, done: !!prd },
    { n: 3, label: "Builder Prompts", icon: Terminal, done: prompts.length > 0 },
    { n: 4, label: "Deliverables", icon: HardDrive, done: false },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      {/* stepper */}
      <div className="flex items-center justify-center gap-2 md:gap-3 mb-8 flex-wrap">
        {steps.map((s, i) => (
          <div key={s.n} className="flex items-center gap-2 md:gap-3">
            <button
              onClick={() => setStep(s.n)}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-3.5 py-2 text-[13px] font-medium transition-colors",
                step === s.n
                  ? "border-violet/50 bg-violet/10 text-ink"
                  : s.done
                    ? "border-emerald/30 bg-emerald/[0.05] text-muted hover:text-ink"
                    : "border-edge bg-white/[0.02] text-faint hover:text-muted",
              )}
            >
              {s.done ? <Check size={13} className="text-emerald" /> : <s.icon size={13} />}
              {s.label}
            </button>
            {i < steps.length - 1 && <ChevronRight size={14} className="text-faint" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-rose/30 bg-rose/[0.06] px-4 py-3 text-[13px] text-rose">
          {error}
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
        >
          {step === 1 && (
            <EvolutionStep
              project={project}
              evolution={evolution}
              working={working === "evolve"}
              onGenerate={runEvolve}
              onNext={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <PrdStep
              evolution={evolution}
              prd={prd}
              working={working === "prd"}
              onGenerate={runPrd}
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
            />
          )}
          {step === 3 && (
            <PromptsStep
              prd={prd}
              prompts={prompts}
              recommendation={recommendation}
              working={working === "prompts"}
              onGenerate={runPrompts}
              onBack={() => setStep(2)}
              onSaved={load}
            />
          )}
          {step === 4 && <Deliverables project={project} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ---------- Step 1: Evolution ---------- */

function GeneratingCard({ icon: Icon, title, lines, note }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % lines.length), 2600);
    return () => clearInterval(t);
  }, [lines.length]);
  return (
    <div className="glass p-14 text-center">
      <div className="relative w-16 h-16 mx-auto mb-5">
        <PrismMark size={64} className="animate-pulse-soft" />
      </div>
      <h3 className="font-display text-lg font-semibold mb-2 flex items-center justify-center gap-2">
        <Icon size={16} className="text-violet-soft" />
        {title}
      </h3>
      <AnimatePresence mode="wait">
        <motion.p
          key={i}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="text-[13px] text-muted"
        >
          {lines[i]}
        </motion.p>
      </AnimatePresence>
      {note && <p className="text-[11.5px] text-faint mt-4">{note}</p>}
    </div>
  );
}

function EvolutionStep({ project, evolution, working, onGenerate, onNext }) {
  if (working) {
    return (
      <GeneratingCard
        icon={Wand2}
        title="Evolution Mode is thinking…"
        lines={[
          "Studying the untapped opportunities…",
          "Cross-referencing competitor weaknesses…",
          "Designing a sharper wedge…",
          "Weaving AI into the core workflow…",
          "Stress-testing the monetization…",
        ]}
      />
    );
  }

  if (!evolution) {
    return (
      <div className="glass p-12 text-center">
        <Wand2 size={30} className="mx-auto text-violet-soft mb-4" />
        <h3 className="font-display text-xl font-semibold mb-2">Evolution Mode</h3>
        <p className="text-[14px] text-muted max-w-md mx-auto leading-relaxed mb-7">
          Prism won't clone {project.product_name}. It will conceive an <em>original</em> product
          that wins where {project.product_name} is weak — built from the gaps, missed opportunities,
          and competitor blind spots in your report.
        </p>
        <button onClick={onGenerate} className="btn-primary mx-auto !px-7">
          <Sparkles size={15} />
          Generate evolution concept
        </button>
      </div>
    );
  }

  const d = evolution.data || {};
  return (
    <div className="space-y-5">
      {/* concept hero */}
      <div className="glass p-8 relative overflow-hidden">
        <div
          className="absolute -top-28 -right-28 w-80 h-80 rounded-full opacity-[0.16] blur-[90px]"
          style={{ background: "radial-gradient(circle, #22D3EE, #8B5CF6 60%, transparent 80%)" }}
        />
        <div className="relative">
          <span className="chip border-cyan/40 text-cyan-soft bg-cyan/10 mb-4">
            <Wand2 size={11} /> Evolution concept
          </span>
          <h2 className="font-display text-3xl font-bold tracking-tight">{d.name}</h2>
          <p className="spectrum-text font-medium mt-1.5">{d.tagline}</p>
          <p className="text-[14px] text-muted leading-relaxed mt-4 max-w-3xl">{d.elevator_pitch}</p>
          {d.inspired_by_gaps?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-5">
              {d.inspired_by_gaps.map((g, i) => (
                <span key={i} className="chip border-edge text-muted bg-white/[0.02]">exploits: {g}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <StudioCard title="Core features" icon={Sparkles} accent="#8B5CF6">
          <ul className="space-y-3.5">
            {(d.core_features || []).map((f, i) => (
              <li key={i} className="text-[13px]">
                <div className="font-medium text-ink">{f.name}</div>
                <p className="text-muted mt-0.5 leading-relaxed">{f.description}</p>
                {f.gap_addressed && (
                  <p className="text-[11px] text-faint mt-1">↳ addresses: {f.gap_addressed}</p>
                )}
              </li>
            ))}
          </ul>
        </StudioCard>

        <div className="space-y-5">
          <StudioCard title="Differentiators" icon={Trophy} accent="#FBBF24">
            <ul className="space-y-2">
              {(d.differentiators || []).map((x, i) => (
                <li key={i} className="text-[13px] text-muted flex gap-2.5 leading-relaxed">
                  <Trophy size={12} className="text-amber shrink-0 mt-0.5" />
                  {x}
                </li>
              ))}
            </ul>
          </StudioCard>
          <StudioCard title="AI integrations" icon={Bot} accent="#22D3EE">
            <ul className="space-y-3">
              {(d.ai_integrations || []).map((x, i) => (
                <li key={i} className="text-[13px]">
                  <span className="font-medium text-ink">{x.name}</span>
                  <p className="text-muted mt-0.5 leading-relaxed">{x.description}</p>
                </li>
              ))}
            </ul>
          </StudioCard>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <StudioCard title="Target users" icon={Users} accent="#34D399">
          <ul className="space-y-3.5">
            {(d.target_users || []).map((u, i) => (
              <li key={i} className="text-[13px]">
                <div className="font-medium text-ink">{u.persona}</div>
                <p className="text-muted mt-0.5">Pain: {u.pain}</p>
                {u.win && <p className="text-emerald/90 mt-0.5">Day-one win: {u.win}</p>}
              </li>
            ))}
          </ul>
        </StudioCard>
        <StudioCard title="Better workflows" icon={Workflow} accent="#FB7185">
          <ul className="space-y-3.5">
            {(d.improved_workflows || []).map((w, i) => (
              <li key={i} className="text-[13px]">
                <p className="text-faint line-through decoration-rose/50">{w.original_flaw}</p>
                <p className="text-muted mt-1 leading-relaxed">→ {w.better_approach}</p>
              </li>
            ))}
          </ul>
        </StudioCard>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <StudioCard title="Monetization" icon={CircleDollarSign} accent="#34D399" className="lg:col-span-2">
          <p className="text-[13px] text-muted mb-3">{d.monetization?.model}</p>
          <div className="grid sm:grid-cols-3 gap-3">
            {(d.monetization?.tiers || []).map((t, i) => (
              <div key={i} className="rounded-xl border border-edge bg-white/[0.02] p-3.5">
                <div className="text-[13px] font-semibold">{t.name}</div>
                <div className="font-display text-lg font-bold text-emerald mt-0.5">{t.price}</div>
                <p className="text-[11px] text-muted mt-1 leading-relaxed">{t.includes}</p>
              </div>
            ))}
          </div>
          {d.monetization?.rationale && (
            <p className="text-[12px] text-faint mt-3 leading-relaxed">{d.monetization.rationale}</p>
          )}
        </StudioCard>
        <StudioCard title="The moat" icon={ShieldCheck} accent="#A78BFA">
          <p className="text-[13px] text-muted leading-relaxed">{d.moat}</p>
          {d.north_star_metric && (
            <p className="text-[12px] mt-3 pt-3 border-t border-edge">
              <span className="text-faint">North star: </span>
              <span className="text-cyan-soft font-medium">{d.north_star_metric}</span>
            </p>
          )}
        </StudioCard>
      </div>

      {d.why_it_wins && (
        <div className="glass p-6 border-l-2 border-l-emerald">
          <p className="text-[14px] leading-relaxed">
            <span className="font-semibold text-emerald">Why it wins: </span>
            <span className="text-muted">{d.why_it_wins}</span>
          </p>
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <button onClick={onGenerate} className="btn-ghost">
          <RotateCcw size={14} />
          Regenerate concept
        </button>
        <button onClick={onNext} className="btn-primary">
          Write the PRD
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

function StudioCard({ title, icon: Icon, children, className, accent }) {
  return (
    <section className={cn("glass p-6", className)}>
      <h3 className="flex items-center gap-2 font-display text-[15px] font-semibold mb-4">
        {Icon && <Icon size={15} style={{ color: accent }} />}
        {title}
      </h3>
      {children}
    </section>
  );
}

/* ---------- Step 2: PRD ---------- */

function PrdStep({ evolution, prd, working, onGenerate, onBack, onNext }) {
  if (!evolution) {
    return (
      <div className="glass p-12 text-center">
        <FileText size={28} className="mx-auto text-muted mb-4" />
        <p className="text-[14px] text-muted mb-6">Generate an evolution concept first — the PRD is written from it.</p>
        <button onClick={onBack} className="btn-primary mx-auto">
          <Wand2 size={15} /> Go to Evolution Mode
        </button>
      </div>
    );
  }

  if (working) {
    return (
      <GeneratingCard
        icon={FileText}
        title={`Writing the ${evolution.title} PRD…`}
        lines={[
          "Drafting vision and problem statement…",
          "Building user personas and journeys…",
          "Specifying features and acceptance criteria…",
          "Designing the database structure…",
          "Mapping the API surface…",
          "Planning AI systems and edge cases…",
          "Writing the launch plan and roadmap…",
        ]}
      />
    );
  }

  if (!prd) {
    return (
      <div className="glass p-12 text-center">
        <FileText size={28} className="mx-auto text-violet-soft mb-4" />
        <h3 className="font-display text-xl font-semibold mb-2">PRD Generator</h3>
        <p className="text-[14px] text-muted max-w-md mx-auto leading-relaxed mb-7">
          A 16-section, production-grade Product Requirements Document for{" "}
          <span className="text-ink font-medium">{evolution.title}</span> — vision, personas,
          journeys, features, database structure, APIs, AI systems, edge cases, launch plan. Detailed
          enough for an AI agent to build from.
        </p>
        <button onClick={onGenerate} className="btn-primary mx-auto !px-7">
          <Sparkles size={15} />
          Generate the PRD
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="font-display text-lg font-semibold flex items-center gap-2">
          <FileText size={17} className="text-violet-soft" />
          {prd.title}
        </h3>
        <div className="flex items-center gap-2.5">
          <CopyButton text={prd.content} label="Copy PRD" />
          <button
            onClick={() => downloadText(`${prd.title.replace(/[^\w-]+/g, "-")}.md`.toLowerCase(), prd.content)}
            className="btn-ghost !py-2"
          >
            <Download size={14} /> Download
          </button>
          <button onClick={onGenerate} className="btn-ghost !py-2" title="Regenerate">
            <RotateCcw size={14} />
          </button>
          <button onClick={onNext} className="btn-primary !py-2">
            Generate prompts <ChevronRight size={14} />
          </button>
        </div>
      </div>
      <div className="glass p-7 md:p-9 max-h-[70vh] overflow-y-auto">
        <Markdown>{prd.content}</Markdown>
      </div>
    </div>
  );
}

/* ---------- Step 3: Prompts ---------- */

function PromptsStep({ prd, prompts, recommendation, working, onGenerate, onBack, onSaved }) {
  const [active, setActive] = useState("base44");
  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState(false);

  const byPlatform = useMemo(
    () => Object.fromEntries(prompts.map((p) => [p.platform, p])),
    [prompts],
  );

  if (!prd) {
    return (
      <div className="glass p-12 text-center">
        <Terminal size={28} className="mx-auto text-muted mb-4" />
        <p className="text-[14px] text-muted mb-6">Write the PRD first — prompts are compiled from it.</p>
        <button onClick={onBack} className="btn-primary mx-auto">
          <FileText size={15} /> Go to PRD
        </button>
      </div>
    );
  }

  if (working) {
    return (
      <GeneratingCard
        icon={Terminal}
        title="Compiling platform-native prompts…"
        lines={[
          "Scoring platform fit for this build…",
          "Writing the Base44 full-stack prompt…",
          "Structuring the Claude Code design doc…",
          "Breaking Cursor steps into files…",
          "Describing screens for Lovable…",
          "Speccing v0 components…",
          "8 platforms, 8 native prompts…",
        ]}
        note="Eight separate prompts, compiled in waves to stay inside model rate limits — this takes about a minute and a half."
      />
    );
  }

  if (prompts.length === 0) {
    return (
      <div className="glass p-12 text-center">
        <Terminal size={28} className="mx-auto text-violet-soft mb-4" />
        <h3 className="font-display text-xl font-semibold mb-2">AI Builder Prompts</h3>
        <p className="text-[14px] text-muted max-w-md mx-auto leading-relaxed mb-7">
          Prism analyzes the PRD, recommends the best AI development platform, then compiles{" "}
          <span className="text-ink font-medium">eight platform-native prompts</span> — each
          structured the way that tool works best. Editable, copyable, exportable.
        </p>
        <button onClick={onGenerate} className="btn-primary mx-auto !px-7">
          <Sparkles size={15} />
          Recommend builder & generate prompts
        </button>
      </div>
    );
  }

  const rec = recommendation?.recommended;
  const alt = recommendation?.alternative;
  const needs = recommendation?.project_needs;
  const activePrompt = byPlatform[active];
  const draft = drafts[active];
  const dirty = draft != null && draft !== activePrompt?.content;

  const savePrompt = async () => {
    if (!activePrompt || !dirty) return;
    setSaving(true);
    await GeneratedPrompt.update(activePrompt.id, { content: draft }).catch(() => {});
    setSaving(false);
    setDrafts((d) => ({ ...d, [active]: undefined }));
    onSaved();
  };

  return (
    <div className="space-y-5">
      {/* recommendation */}
      {rec && (
        <div className="glass p-7 relative overflow-hidden">
          <div
            className="absolute -top-24 -left-24 w-72 h-72 rounded-full opacity-[0.14] blur-[80px]"
            style={{ background: "radial-gradient(circle, #34D399, #22D3EE 60%, transparent 80%)" }}
          />
          <div className="relative grid md:grid-cols-[1fr_auto] gap-8 items-start">
            <div>
              <span className="chip border-emerald/40 text-emerald bg-emerald/10 mb-3">
                <Trophy size={11} /> Recommended builder
              </span>
              <h3 className="font-display text-2xl font-bold">
                {PLATFORM_LABELS[rec.platform] || rec.platform}
                {rec.fit_score != null && (
                  <span className="text-emerald text-lg font-semibold ml-3">{Math.round(rec.fit_score)}% fit</span>
                )}
              </h3>
              <ul className="mt-3.5 space-y-1.5">
                {(rec.reasons || []).map((r, i) => (
                  <li key={i} className="text-[13px] text-muted flex gap-2 leading-relaxed">
                    <Check size={13} className="text-emerald shrink-0 mt-0.5" />
                    {r}
                  </li>
                ))}
              </ul>
              {alt && (
                <p className="text-[12px] text-faint mt-4 pt-3 border-t border-edge">
                  <span className="text-muted font-medium">
                    Alternative — {PLATFORM_LABELS[alt.platform] || alt.platform}:{" "}
                  </span>
                  {alt.when_to_choose}
                </p>
              )}
            </div>
            {needs && (
              <div className="w-full md:w-60 space-y-3.5">
                <div className="text-[11px] text-faint uppercase tracking-wider">Project needs</div>
                {Object.entries({
                  Complexity: needs.complexity,
                  Backend: needs.backend_requirements,
                  "UI depth": needs.ui_complexity,
                  Database: needs.database_needs,
                  "Speed to MVP": needs.speed_to_mvp,
                }).map(([k, v]) => (
                  <ScoreBar key={k} label={k} score={v} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* platform tabs */}
      <div className="glass overflow-hidden">
        <div className="flex overflow-x-auto border-b border-edge">
          {Object.keys(PLATFORM_LABELS).map((p) => (
            <button
              key={p}
              onClick={() => setActive(p)}
              className={cn(
                "relative px-4 py-3 text-[13px] font-medium whitespace-nowrap transition-colors",
                active === p ? "text-ink bg-white/[0.04]" : "text-muted hover:text-ink",
                rec?.platform === p && "font-semibold",
              )}
            >
              {PLATFORM_LABELS[p]}
              {rec?.platform === p && <Trophy size={10} className="inline ml-1.5 -mt-0.5 text-emerald" />}
              {active === p && <span className="absolute bottom-0 left-0 right-0 h-[2px] spectrum-bar" />}
            </button>
          ))}
        </div>
        {activePrompt ? (
          <div className="p-5">
            <div className="flex items-center justify-between gap-3 mb-3.5 flex-wrap">
              <span className="text-[12px] text-faint">
                Optimized for how {PLATFORM_LABELS[active]} works — edit freely, then save.
              </span>
              <div className="flex items-center gap-2">
                {dirty && (
                  <button onClick={savePrompt} disabled={saving} className="btn-primary !py-1.5 !px-3.5 text-[12px]">
                    {saving ? <Spinner size={12} className="text-white" /> : <Save size={13} />}
                    Save
                  </button>
                )}
                <CopyButton text={draft ?? activePrompt.content} label="Copy" small />
                <button
                  onClick={() =>
                    downloadText(`${active}-prompt.md`, draft ?? activePrompt.content)
                  }
                  aria-label={`Download the ${PLATFORM_LABELS[active]} prompt`}
                  title="Download prompt"
                  className="btn-ghost !py-1.5 !px-3 text-[12px]"
                >
                  <Download size={13} />
                </button>
              </div>
            </div>
            <textarea
              value={draft ?? activePrompt.content}
              onChange={(e) => setDrafts((d) => ({ ...d, [active]: e.target.value }))}
              spellCheck={false}
              className="w-full h-[420px] rounded-xl border border-edge bg-black/30 p-4 font-mono text-[12.5px] leading-relaxed text-ink/90 outline-none focus:border-violet/50 resize-y"
            />
          </div>
        ) : (
          <div className="p-10 text-center text-[13px] text-muted">
            No prompt for {PLATFORM_LABELS[active]} yet — hit regenerate below.
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button onClick={onGenerate} className="btn-ghost">
          <RotateCcw size={14} />
          Regenerate all prompts
        </button>
      </div>
    </div>
  );
}

function CopyButton({ text, label = "Copy", small }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        if (await copyText(text)) {
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        }
      }}
      className={cn("btn-ghost", small ? "!py-1.5 !px-3 text-[12px]" : "!py-2")}
    >
      {copied ? <Check size={small ? 13 : 14} className="text-emerald" /> : <Copy size={small ? 13 : 14} />}
      {copied ? "Copied" : label}
    </button>
  );
}
