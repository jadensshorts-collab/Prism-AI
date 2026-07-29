// DEV-ONLY: the authenticated workspace rendered from captured project data.
// The real Dashboard needs a session, so this is the only way to inspect the
// populated state — the first screen a signed-in user actually sees.
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, Star, ArrowRight, Trash2, Globe, Gauge, FolderOpen } from "lucide-react";
import fixture from "./fixture-dashboard.json";
import PrismMark from "@/components/PrismMark";
import ScoreRing from "@/components/ui/ScoreRing";
import StarterGallery from "@/components/dashboard/StarterGallery";
import LayerStrip from "@/components/dashboard/LayerStrip";
import { cn, timeAgo, hostnameOf, scoreColor } from "@/lib/utils";

export default function DevDashboard() {
  const [query, setQuery] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [projects, setProjects] = useState(fixture.projects);

  const filtered = useMemo(() => {
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
    const complete = projects.filter((p) => p.status === "complete");
    const scores = complete.map((p) => p.innovation_score).filter((s) => s != null);
    return {
      total: projects.length,
      complete: complete.length,
      avg: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
      best: scores.length ? Math.max(...scores) : null,
    };
  }, [projects]);

  return (
    <div className="max-w-7xl mx-auto px-5 py-8 space-y-8">
      <section className="glass relative overflow-hidden p-8 md:p-10">
        <div
          className="absolute -top-40 right-0 w-[560px] h-[380px] rounded-full opacity-[0.17] blur-[110px]"
          style={{ background: "radial-gradient(ellipse, #8B5CF6, #22D3EE 60%, transparent 80%)" }}
        />
        <div className="relative max-w-2xl">
          <p className="text-sm text-muted mb-1.5">Welcome back, {fixture.user.full_name}.</p>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">
            What should we <span className="spectrum-text">reveal</span> today?
          </h1>
          <form onSubmit={(e) => e.preventDefault()} className="mt-6 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Globe size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-faint" />
              <input placeholder="Paste a website, App Store, or SaaS URL…" className="input-dark !pl-11 !py-3.5 text-[15px]" />
            </div>
            <button type="submit" className="btn-primary !py-3.5 !px-6">
              <PrismMark size={16} />
              Reveal Product
            </button>
          </form>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11.5px] text-faint">
            {["8 layers analyzed in parallel", "Six models running in parallel", "Typically 15–60 seconds"].map((f) => (
              <span key={f} className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full spectrum-bar" />
                {f}
              </span>
            ))}
          </div>
        </div>
      </section>

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

      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <h2 className="font-display text-xl font-semibold">Your analyses</h2>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setFavoritesOnly((v) => !v)}
              className={cn("btn-ghost !py-2 !px-3 text-[13px]", favoritesOnly && "!text-amber !border-amber/40 !bg-amber/10")}
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

        {filtered.length === 0 ? (
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
            {filtered.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: Math.min(i * 0.04, 0.3) }}
                role="link"
                tabIndex={0}
                aria-label={`Open the ${p.product_name || hostnameOf(p.input_url)} report`}
                className="glass glass-hover p-5 cursor-pointer group relative"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-[15px] truncate">{p.product_name || hostnameOf(p.input_url)}</h3>
                    {p.product_name && <p className="text-xs text-faint truncate mt-0.5">{hostnameOf(p.input_url)}</p>}
                  </div>
                  <ScoreRing score={p.innovation_score} size={46} strokeWidth={4} />
                </div>
                {p.category && <span className="chip border-edge text-muted bg-white/[0.03] mt-3">{p.category}</span>}
                {p.tagline && <p className="text-[13px] text-muted mt-2.5 line-clamp-2 leading-relaxed">{p.tagline}</p>}
                {p.layer_scores && (
                  <div className="flex gap-1 mt-3.5">
                    {Object.entries(p.layer_scores).map(([k, v]) => (
                      <div key={k} title={`${k}: ${Math.round(v)}`} className="h-1.5 flex-1 rounded-full" style={{ background: scoreColor(v), opacity: 0.85 }} />
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between mt-4 pt-3.5 border-t border-edge">
                  <span className="text-[11px] text-faint flex items-center gap-1.5">
                    {p.is_favorite && <Star size={12} className="fill-amber text-amber" aria-label="Favorite" />}
                    {timeAgo(p.created_date)}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity">
                    <button
                      onClick={() => setProjects((prev) => prev.map((x) => (x.id === p.id ? { ...x, is_favorite: !x.is_favorite } : x)))}
                      aria-label={p.is_favorite ? "Remove from favorites" : "Add to favorites"}
                      className={cn("p-1.5 rounded-lg hover:bg-white/[0.06]", p.is_favorite ? "text-amber" : "text-faint")}
                    >
                      <Star size={14} className={p.is_favorite ? "fill-amber" : ""} />
                    </button>
                    <button aria-label="Delete analysis" className="p-1.5 rounded-lg text-faint hover:text-rose hover:bg-white/[0.06]">
                      <Trash2 size={14} />
                    </button>
                    <ArrowRight size={14} className="text-faint ml-1" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display text-xl font-semibold">Reveal something new</h2>
        <p className="text-[13px] text-muted mt-1 mb-5">
          Every card runs a full eight-layer analysis — the same pipeline as pasting a URL.
        </p>
        <StarterGallery onPick={() => {}} busy={false} pending="" />
      </section>

      <section>
        <h2 className="font-display text-xl font-semibold">What Prism reveals</h2>
        <p className="text-[13px] text-muted mt-1 mb-5">
          Eight research passes run in parallel, then an innovation synthesis reads all of them.
        </p>
        <LayerStrip />
      </section>
    </div>
  );
}
