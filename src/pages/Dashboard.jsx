import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Star,
  ArrowRight,
  Trash2,
  Globe,
  Gauge,
  FolderOpen,
  Wand2,
  AlertTriangle,
} from "lucide-react";
import { Project, fireAnalyze, track, invokeFunction } from "@/api/base44Client";
import { useAuth } from "@/lib/useAuth";
import PrismMark from "@/components/PrismMark";
import ScoreRing from "@/components/ui/ScoreRing";
import Spinner from "@/components/ui/Spinner";
import StarterGallery from "@/components/dashboard/StarterGallery";
import LayerStrip from "@/components/dashboard/LayerStrip";
import { cn, timeAgo, hostnameOf, normalizeUrl, scoreColor } from "@/lib/utils";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState(null);
  const [query, setQuery] = useState("");
  const [url, setUrl] = useState("");
  const [starting, setStarting] = useState(false);
  const [pendingUrl, setPendingUrl] = useState("");
  const [error, setError] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const load = () => Project.list("-created_date", 100).then(setProjects).catch(() => setProjects([]));

  useEffect(() => {
    load();
  }, []);

  // Realtime: the analyze pipeline's writes stream straight into the workspace,
  // so in-flight cards advance without polling.
  useEffect(() => {
    let unsub;
    try {
      unsub = Project.subscribe(() => load());
    } catch {
      // realtime unavailable — the heartbeat below still keeps things fresh
    }
    return () => {
      try {
        unsub?.();
      } catch {
        // socket already closed
      }
    };
  }, []);

  // Safety net only while something is actually running.
  useEffect(() => {
    if (!projects?.some((p) => p.status === "analyzing")) return;
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [projects]);

  const startAnalysis = async (rawInput) => {
    const input = normalizeUrl(rawInput ?? url);
    if (!input || starting) return;
    setStarting(true);
    setPendingUrl(rawInput ?? "");
    setError("");
    try {
      const project = await Project.create({ input_url: input, status: "analyzing", progress: 0, stage: "Queued" });
      track("analysis_started", { input: input.slice(0, 120), from_starter: Boolean(rawInput) });
      // Fire the pipeline; don't await — realtime streams progress to the page.
      fireAnalyze(project.id);
      navigate(`/app/project/${project.id}`);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Could not start the analysis. Please try again.");
      setStarting(false);
      setPendingUrl("");
    }
  };

  const toggleFavorite = async (p, e) => {
    e.stopPropagation();
    setProjects((prev) => prev.map((x) => (x.id === p.id ? { ...x, is_favorite: !p.is_favorite } : x)));
    await Project.update(p.id, { is_favorite: !p.is_favorite }).catch(() => load());
  };

  const deleteProject = async (p, e) => {
    e.stopPropagation();
    if (!confirm(`Delete the analysis of ${p.product_name || hostnameOf(p.input_url)}? This cannot be undone.`)) return;
    setProjects((prev) => prev.filter((x) => x.id !== p.id));
    try {
      // Cascades to report sections, concepts, PRDs, prompts, and stored files.
      const res = await invokeFunction("delete-project", { projectId: p.id });
      if (res?.data?.error) throw new Error(res.data.error);
      track("analysis_deleted", { project_id: p.id });
    } catch {
      // Fall back to removing just the project so the action never dead-ends.
      await Project.delete(p.id).catch(() => {});
      load();
    }
  };

  const filtered = useMemo(() => {
    if (!projects) return null;
    const q = query.trim().toLowerCase();
    return projects.filter((p) => {
      if (favoritesOnly && !p.is_favorite) return false;
      if (!q) return true;
      return [p.product_name, p.input_url, p.category, p.tagline]
        .filter(Boolean)
        .some((f) => f.toLowerCase().includes(q));
    });
  }, [projects, query, favoritesOnly]);

  const stats = useMemo(() => {
    if (!projects) return null;
    const complete = projects.filter((p) => p.status === "complete");
    const scores = complete.map((p) => p.innovation_score).filter((s) => s != null);
    return {
      total: projects.length,
      complete: complete.length,
      avg: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
      best: scores.length ? Math.max(...scores) : null,
    };
  }, [projects]);

  const firstName = (user?.full_name || user?.email || "").split(/[\s@]/)[0];

  return (
    <div className="space-y-8">
      {/* Reveal hero */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="glass relative overflow-hidden p-8 md:p-10"
      >
        <div
          className="absolute -top-40 right-0 w-[560px] h-[380px] rounded-full opacity-[0.17] blur-[110px]"
          style={{ background: "radial-gradient(ellipse, #8B5CF6, #22D3EE 60%, transparent 80%)" }}
        />
        <div className="relative max-w-2xl">
          <p className="text-sm text-muted mb-1.5">
            {firstName ? `Welcome back, ${firstName}.` : "Welcome back."}
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">
            What should we <span className="spectrum-text">reveal</span> today?
          </h1>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              startAnalysis();
            }}
            className="mt-6 flex flex-col sm:flex-row gap-3"
          >
            <div className="relative flex-1">
              <Globe size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-faint" />
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste a website, App Store, or SaaS URL…"
                className="input-dark !pl-11 !py-3.5 text-[15px]"
                disabled={starting}
              />
            </div>
            <button type="submit" disabled={starting || !url.trim()} className="btn-primary !py-3.5 !px-6">
              {starting ? <Spinner size={16} className="text-white" /> : <PrismMark size={16} />}
              Reveal Product
            </button>
          </form>
          {error && (
            <p className="mt-3 text-[13px] text-rose flex items-center gap-1.5">
              <AlertTriangle size={13} /> {error}
            </p>
          )}
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11.5px] text-faint">
            {[
              "8 layers analyzed in parallel",
              "Live internet research",
              "Usually under a minute",
            ].map((f) => (
              <span key={f} className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full spectrum-bar" />
                {f}
              </span>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Stats */}
      {stats && stats.total > 0 && (
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Products analyzed", value: stats.total, icon: FolderOpen },
            { label: "Reports complete", value: stats.complete, icon: Gauge },
            { label: "Avg. innovation score", value: stats.avg ?? "—", prism: true },
            { label: "Highest score", value: stats.best ?? "—", icon: Star },
          ].map((s) => (
            <div key={s.label} className="glass p-4 flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-edge flex items-center justify-center text-violet-soft">
                {s.prism ? <PrismMark size={16} /> : <s.icon size={16} />}
              </div>
              <div>
                <div className="font-display text-xl font-bold tabular-nums leading-none">{s.value}</div>
                <div className="text-[11px] text-faint mt-1">{s.label}</div>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Projects — only once the workspace has something in it */}
      <section className={projects?.length ? "" : "hidden"}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <h2 className="font-display text-xl font-semibold">Your analyses</h2>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setFavoritesOnly((v) => !v)}
              className={cn(
                "btn-ghost !py-2 !px-3 text-[13px]",
                favoritesOnly && "!text-amber !border-amber/40 !bg-amber/10",
              )}
            >
              <Star size={14} className={favoritesOnly ? "fill-amber" : ""} />
              Favorites
            </button>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products…"
                className="input-dark !pl-9 !py-2 w-56 text-[13px]"
              />
            </div>
          </div>
        </div>

        {filtered == null ? (
          <div className="flex items-center justify-center py-20 text-muted gap-2.5 text-sm">
            <Spinner /> Loading your workspace…
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass p-14 text-center">
            <PrismMark size={40} className="mx-auto mb-4 opacity-60" />
            <p className="text-muted text-[15px]">
              {favoritesOnly && !query.trim()
                ? "No favorites yet — star an analysis to pin it here."
                : "Nothing matches your search."}
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filtered.map((p, i) => (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.4, delay: Math.min(i * 0.04, 0.3) }}
                  onClick={() => navigate(`/app/project/${p.id}`)}
                  className="glass glass-hover p-5 cursor-pointer group relative"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-[15px] truncate">
                        {p.product_name || hostnameOf(p.input_url)}
                      </h3>
                      <p className="text-xs text-faint truncate mt-0.5">{hostnameOf(p.input_url)}</p>
                    </div>
                    {p.status === "complete" ? (
                      <ScoreRing score={p.innovation_score} size={46} strokeWidth={4} />
                    ) : p.status === "analyzing" ? (
                      <div className="flex flex-col items-end shrink-0">
                        <Spinner size={18} />
                        <span className="text-[10px] text-violet-soft mt-1 tabular-nums">{p.progress || 0}%</span>
                      </div>
                    ) : (
                      <span className="chip border-rose/40 text-rose bg-rose/10 shrink-0">failed</span>
                    )}
                  </div>

                  {p.category && (
                    <span className="chip border-edge text-muted bg-white/[0.03] mt-3">{p.category}</span>
                  )}
                  {p.tagline && (
                    <p className="text-[13px] text-muted mt-2.5 line-clamp-2 leading-relaxed">{p.tagline}</p>
                  )}

                  {p.status === "analyzing" && (
                    <div className="mt-3.5">
                      <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className="h-full spectrum-bar rounded-full transition-all duration-700"
                          style={{ width: `${p.progress || 2}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-faint mt-1.5">{p.stage || "Starting…"}</p>
                    </div>
                  )}

                  {p.status === "complete" && p.layer_scores && (
                    <div className="flex gap-1 mt-3.5">
                      {Object.entries(p.layer_scores).map(([k, v]) => (
                        <div
                          key={k}
                          title={`${k}: ${Math.round(v)}`}
                          className="h-1.5 flex-1 rounded-full"
                          style={{ background: scoreColor(v), opacity: 0.85 }}
                        />
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-4 pt-3.5 border-t border-edge">
                    <span className="text-[11px] text-faint">{timeAgo(p.created_date)}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => toggleFavorite(p, e)}
                        aria-label={p.is_favorite ? "Remove from favorites" : "Add to favorites"}
                        title={p.is_favorite ? "Remove from favorites" : "Add to favorites"}
                        className={cn("p-1.5 rounded-lg hover:bg-white/[0.06]", p.is_favorite ? "text-amber" : "text-faint")}
                      >
                        <Star size={14} className={p.is_favorite ? "fill-amber" : ""} />
                      </button>
                      <button
                        onClick={(e) => deleteProject(p, e)}
                        aria-label={`Delete analysis of ${p.product_name || hostnameOf(p.input_url)}`}
                        title="Delete analysis"
                        className="p-1.5 rounded-lg text-faint hover:text-rose hover:bg-white/[0.06]"
                      >
                        <Trash2 size={14} />
                      </button>
                      <ArrowRight size={14} className="text-faint ml-1" />
                    </div>
                    {p.is_favorite && (
                      <Star size={14} className="fill-amber text-amber absolute top-4 right-4 group-hover:opacity-0 transition-opacity" />
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* Starter gallery — always available, and the first thing a new user sees */}
      {projects != null && (
        <section>
          <div className="flex items-baseline justify-between gap-4 mb-5 flex-wrap">
            <div>
              <h2 className="font-display text-xl font-semibold">
                {projects.length === 0 ? "Start with a landmark product" : "Reveal something new"}
              </h2>
              <p className="text-[13px] text-muted mt-1">
                Every card runs a full eight-layer analysis — the same pipeline as pasting a URL.
              </p>
            </div>
          </div>
          <StarterGallery onPick={startAnalysis} busy={starting} pending={pendingUrl} />
        </section>
      )}

      {/* What every analysis produces */}
      {projects != null && (
        <section>
          <div className="mb-5">
            <h2 className="font-display text-xl font-semibold">What Prism reveals</h2>
            <p className="text-[13px] text-muted mt-1">
              Eight research passes run in parallel, then an innovation synthesis reads all of them.
            </p>
          </div>
          <LayerStrip />
        </section>
      )}

      {/* Compare CTA */}
      {stats && stats.complete >= 2 && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => navigate("/app/compare")}
          className="glass glass-hover w-full p-5 flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-cyan/10 border border-cyan/30 flex items-center justify-center">
              <Wand2 size={18} className="text-cyan-soft" />
            </div>
            <div>
              <h3 className="font-semibold text-[15px]">Compare products head-to-head</h3>
              <p className="text-[13px] text-muted">
                Put two analyses side by side — innovation facets, layer scores, and positioning.
              </p>
            </div>
          </div>
          <ArrowRight size={17} className="text-muted" />
        </motion.button>
      )}
    </div>
  );
}
