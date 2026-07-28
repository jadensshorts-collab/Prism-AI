import { motion } from "framer-motion";
import {
  ArrowRight,
  Layers,
  Sparkles,
  Brain,
  TrendingUp,
  Swords,
  Cpu,
  Palette,
  Gauge,
  FileText,
  Wand2,
  Rocket,
} from "lucide-react";
import PrismMark from "@/components/PrismMark";
import ScoreRing from "@/components/ui/ScoreRing";
import ScoreBar from "@/components/ui/ScoreBar";
import { useEnterWorkspace } from "@/lib/useAuth";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
};

const LAYERS = [
  { icon: Layers, color: "#8B5CF6", title: "Product Overview", desc: "What it does, who it serves, the problem it solves, and where it sits in the market." },
  { icon: TrendingUp, color: "#60A5FA", title: "Business Layer", desc: "Business model, pricing strategy, customer segments, and untapped monetization." },
  { icon: Palette, color: "#22D3EE", title: "Design Layer", desc: "UI quality, UX decisions, hierarchy, accessibility, and branding — scored like a design director." },
  { icon: Cpu, color: "#34D399", title: "Technology Layer", desc: "Frameworks, hosting, databases, auth, payments, and AI — with confidence-rated evidence." },
  { icon: Brain, color: "#FBBF24", title: "Psychology Layer", desc: "Trust signals, habit loops, social proof, and persuasion — and why each one works." },
  { icon: Rocket, color: "#FB7185", title: "Growth Layer", desc: "SEO, acquisition channels, retention mechanics, referrals, and community." },
  { icon: Swords, color: "#A78BFA", title: "Competitor Intel", desc: "The real competitive field: features, pricing, positioning, strengths, and threats." },
  { icon: Gauge, color: "#67E8F9", title: "Innovation Meter", desc: "A six-facet innovation score plus the untapped opportunities the product is missing." },
];

const STEPS = [
  { n: "01", icon: Sparkles, title: "Reveal", desc: "Drop in any product URL. Prism runs a live multi-layer AI analysis — every layer researched in parallel." },
  { n: "02", icon: Gauge, title: "Understand", desc: "Explore an interactive intelligence report: eight layers, scores, competitors, psychology, and opportunity maps." },
  { n: "03", icon: Wand2, title: "Evolve", desc: "Evolution Mode conceives an original product that wins where theirs is weak — not a clone, a leap." },
  { n: "04", icon: FileText, title: "Build", desc: "Generate a production-grade PRD and platform-native prompts for Base44, Claude Code, Cursor, and more." },
];

// Geometry for the hero graphic, in one SVG coordinate system so the beam,
// the prism, and the refracted rays stay exactly aligned at every size.
// The beam enters the left face at y=160 and exits the right face at the same
// height, where the spectrum fans out.
const BEAM_START = 55;
const ENTRY_X = 355.5; // left face at y=160
const EXIT_X = 444.5; // right face at y=160
const AXIS_Y = 160;
const RAY_END_X = 772;

const RAYS = [
  { color: "#8B5CF6", y: 90.4 },
  { color: "#60A5FA", y: 118.6 },
  { color: "#22D3EE", y: 146.3 },
  { color: "#34D399", y: 173.7 },
  { color: "#FBBF24", y: 201.4 },
  { color: "#FB7185", y: 229.6 },
];

function SpectrumBeam() {
  // A beam of white light entering the prism and refracting into a spectrum.
  // Everything is drawn in a single viewBox — no percentage/pixel mixing — and
  // animated with pathLength so no animation competes for the transform.
  return (
    <motion.div
      className="w-full max-w-3xl mx-auto pointer-events-none select-none"
      animate={{ y: [0, -7, 0] }}
      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      aria-hidden
    >
      <svg viewBox="0 0 800 320" className="w-full h-auto overflow-visible">
        <defs>
          <linearGradient id="beam-in" gradientUnits="userSpaceOnUse" x1={BEAM_START} y1={AXIS_Y} x2={ENTRY_X} y2={AXIS_Y}>
            <stop offset="0%" stopColor="#fff" stopOpacity="0" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0.85" />
          </linearGradient>
          <linearGradient id="prism-edge" gradientUnits="userSpaceOnUse" x1="311" y1="235" x2="489" y2="85">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="50%" stopColor="#22D3EE" />
            <stop offset="100%" stopColor="#34D399" />
          </linearGradient>
          {RAYS.map((r, i) => (
            <linearGradient
              key={r.color}
              id={`ray-${i}`}
              gradientUnits="userSpaceOnUse"
              x1={EXIT_X}
              y1={AXIS_Y}
              x2={RAY_END_X}
              y2={r.y}
            >
              <stop offset="0%" stopColor={r.color} stopOpacity="0.95" />
              <stop offset="100%" stopColor={r.color} stopOpacity="0" />
            </linearGradient>
          ))}
          <filter id="soft-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
        </defs>

        {/* ambient bloom behind the prism */}
        <motion.circle
          cx="400"
          cy={AXIS_Y}
          r="105"
          fill="#8B5CF6"
          opacity="0.16"
          filter="url(#soft-glow)"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* incoming white beam */}
        <motion.line
          x1={BEAM_START}
          y1={AXIS_Y}
          x2={ENTRY_X}
          y2={AXIS_Y}
          stroke="url(#beam-in)"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1, delay: 0.35, ease: "easeOut" }}
        />

        {/* refracted spectrum — glow pass, then crisp pass */}
        <g filter="url(#soft-glow)" opacity="0.55">
          {RAYS.map((r, i) => (
            <motion.line
              key={`glow-${r.color}`}
              x1={EXIT_X}
              y1={AXIS_Y}
              x2={RAY_END_X}
              y2={r.y}
              stroke={`url(#ray-${i})`}
              strokeWidth="5"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.1, delay: 0.9 + i * 0.07, ease: "easeOut" }}
            />
          ))}
        </g>
        {RAYS.map((r, i) => (
          <motion.line
            key={r.color}
            x1={EXIT_X}
            y1={AXIS_Y}
            x2={RAY_END_X}
            y2={r.y}
            stroke={`url(#ray-${i})`}
            strokeWidth="2"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.1, delay: 0.9 + i * 0.07, ease: "easeOut" }}
          />
        ))}

        {/* the prism */}
        <motion.path
          d="M400 85L489 235H311L400 85Z"
          fill="#8B5CF6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.09 }}
          transition={{ duration: 1, delay: 0.5 }}
        />
        <motion.path
          d="M400 85L489 235H311L400 85Z"
          fill="none"
          stroke="url(#prism-edge)"
          strokeWidth="3"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.3, delay: 0.15, ease: "easeInOut" }}
        />
        <motion.line
          x1="400"
          y1="85"
          x2="400"
          y2="235"
          stroke="url(#prism-edge)"
          strokeWidth="1.2"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.5 }}
          transition={{ duration: 1, delay: 0.8 }}
        />
      </svg>
    </motion.div>
  );
}

export default function Landing() {
  const enterWorkspace = useEnterWorkspace();

  return (
    <div className="min-h-screen bg-void relative overflow-x-clip">
      {/* ambient background */}
      <div className="absolute inset-0 bg-grid mask-fade-b h-[900px]" />
      <div
        className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full opacity-25 blur-[120px]"
        style={{ background: "radial-gradient(ellipse, #8B5CF6 0%, #22D3EE 55%, transparent 75%)" }}
      />

      {/* nav */}
      <header className="relative z-10 max-w-6xl mx-auto flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <PrismMark size={26} />
          <span className="font-display font-semibold text-lg tracking-tight">Prism AI</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted">
          <a href="#layers" className="hover:text-ink transition-colors">Layers</a>
          <a href="#how" className="hover:text-ink transition-colors">How it works</a>
          <a href="#build" className="hover:text-ink transition-colors">Build studio</a>
        </nav>
      </header>

      {/* hero */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pt-14 md:pt-20 text-center">
        <motion.div {...fadeUp}>
          <span className="chip border-violet/40 text-violet-soft bg-violet/10">
            <Sparkles size={12} />
            AI Product Intelligence
          </span>
        </motion.div>
        <motion.h1
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.08 }}
          className="font-display font-bold tracking-tight text-5xl md:text-7xl leading-[1.05] mt-6"
        >
          Reveal the hidden layers
          <br />
          behind <span className="spectrum-text">every product</span>
        </motion.h1>
        <motion.p
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.16 }}
          className="mt-6 text-lg text-muted max-w-2xl mx-auto leading-relaxed"
        >
          Point Prism at any website, app, or SaaS. It refracts the product into eight layers of
          intelligence — strategy, design, technology, psychology, growth — then helps you conceive
          and spec something better.
        </motion.p>
        <motion.div
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.24 }}
          className="mt-9 flex flex-col items-center gap-4"
        >
          <button onClick={enterWorkspace} className="btn-primary !px-7 !py-3 text-base">
            Reveal a product
            <ArrowRight size={17} />
          </button>
          <span className="text-xs text-faint">
            A team of PMs, designers, engineers &amp; growth experts — in one analysis.
          </span>
        </motion.div>

        <SpectrumBeam />

        {/* what the pipeline actually does, in numbers */}
        <motion.div
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.3 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 -mt-4 md:-mt-8"
        >
          {[
            { n: "8", label: "intelligence layers" },
            { n: "20+", label: "AI passes per workflow" },
            { n: "16", label: "PRD sections generated" },
            { n: "8", label: "builder prompts compiled" },
          ].map((s) => (
            <div key={s.label} className="glass p-4">
              <div className="font-display text-2xl font-bold spectrum-text">{s.n}</div>
              <div className="text-[11.5px] text-faint mt-1">{s.label}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* layers */}
      <section id="layers" className="relative z-10 max-w-6xl mx-auto px-6 pt-8 pb-20">
        <motion.div {...fadeUp} className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight">
            One product in. <span className="spectrum-text">Eight layers out.</span>
          </h2>
          <p className="text-muted mt-3 max-w-xl mx-auto">
            Every analysis runs a real multi-stage AI pipeline, fanned out across parallel models —
            not a single generic summary.
          </p>
        </motion.div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {LAYERS.map((l, i) => (
            <motion.div
              key={l.title}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: i * 0.05 }}
              className="glass glass-hover p-5"
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center mb-3.5"
                style={{ background: `${l.color}1A`, border: `1px solid ${l.color}40` }}
              >
                <l.icon size={17} style={{ color: l.color }} />
              </div>
              <h3 className="font-semibold text-[15px] mb-1.5">{l.title}</h3>
              <p className="text-[13px] text-muted leading-relaxed">{l.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* how it works */}
      <section id="how" className="relative z-10 max-w-6xl mx-auto px-6 py-16">
        <motion.h2 {...fadeUp} className="font-display text-3xl md:text-4xl font-bold tracking-tight text-center mb-12">
          From <span className="text-muted line-through decoration-rose/60">inspiration</span>{" "}
          <span className="spectrum-text">to production</span>
        </motion.h2>
        <div className="grid md:grid-cols-4 gap-4">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.n}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: i * 0.08 }}
              className="glass p-6 relative overflow-hidden"
            >
              <span className="absolute -top-3 right-3 font-display text-6xl font-bold text-white/[0.04]">
                {s.n}
              </span>
              <s.icon size={20} className="text-violet-soft mb-4" />
              <h3 className="font-display font-semibold text-lg mb-2">{s.title}</h3>
              <p className="text-[13px] text-muted leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* a genuine report excerpt */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-16">
        <motion.div {...fadeUp} className="text-center mb-10">
          <span className="chip border-emerald/40 text-emerald bg-emerald/10 mb-4">
            Real output
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight">
            Inside an <span className="spectrum-text">actual report</span>
          </h2>
          <p className="text-muted mt-3 max-w-xl mx-auto text-[15px]">
            Scores and opportunities Prism produced when it analyzed Linear — not a mockup.
          </p>
        </motion.div>

        <motion.div {...fadeUp} className="glass p-7 md:p-9">
          <div className="flex flex-col lg:flex-row gap-9 items-center">
            <div className="text-center shrink-0">
              <ScoreRing score={91} size={140} strokeWidth={9} spectrum label="INNOVATION" />
              <div className="text-[11px] text-faint mt-3">Linear · Project Management SaaS</div>
            </div>
            <div className="flex-1 w-full grid sm:grid-cols-2 gap-x-9 gap-y-4">
              {[
                ["Business", 92],
                ["Design", 91],
                ["Technology", 95],
                ["Psychology", 88],
                ["Growth", 92],
                ["Differentiation", 95],
              ].map(([label, score], i) => (
                <ScoreBar key={label} label={label} score={score} delay={i * 0.06} />
              ))}
            </div>
          </div>

          <div className="mt-8 pt-7 border-t border-edge">
            <h3 className="text-[13px] font-semibold text-muted mb-4">
              Untapped opportunities it surfaced
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                {
                  t: "Discovery-to-Delivery Connector",
                  c: "Missing Feature",
                  color: "#60A5FA",
                  d: "Trace every issue back to the customer research that justified it.",
                },
                {
                  t: "Automated Retro-Insights",
                  c: "AI Opportunity",
                  color: "#8B5CF6",
                  d: "Read completed cycles to find recurring velocity bottlenecks.",
                },
                {
                  t: "Developer Burnout Analytics",
                  c: "Better Workflow",
                  color: "#22D3EE",
                  d: "Surface context-switching load so managers can protect focus.",
                },
              ].map((o) => (
                <div
                  key={o.t}
                  className="rounded-xl border border-edge bg-white/[0.02] p-4 border-l-2"
                  style={{ borderLeftColor: o.color }}
                >
                  <h4 className="text-[13.5px] font-semibold leading-snug">{o.t}</h4>
                  <p className="text-[12px] text-muted leading-relaxed mt-1.5">{o.d}</p>
                  <span
                    className="chip mt-3"
                    style={{ borderColor: `${o.color}55`, color: o.color, background: `${o.color}14` }}
                  >
                    {o.c}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* build studio highlight */}
      <section id="build" className="relative z-10 max-w-5xl mx-auto px-6 py-16">
        <motion.div {...fadeUp} className="glass p-8 md:p-12 relative overflow-hidden">
          <div
            className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-20 blur-[100px]"
            style={{ background: "radial-gradient(circle, #22D3EE, transparent 70%)" }}
          />
          <div className="relative grid md:grid-cols-2 gap-10 items-center">
            <div>
              <span className="chip border-cyan/40 text-cyan-soft bg-cyan/10 mb-4">
                <Wand2 size={12} />
                Build Studio
              </span>
              <h2 className="font-display text-3xl font-bold tracking-tight leading-tight">
                Don't copy products.
                <br />
                <span className="spectrum-text">Out-build them.</span>
              </h2>
              <p className="text-muted mt-4 leading-relaxed text-[15px]">
                Evolution Mode turns analysis into an original concept. Prism then writes a
                16-section PRD and compiles it into native build prompts for eight AI development
                platforms — each one structured the way that tool thinks.
              </p>
            </div>
            <div className="space-y-2.5">
              {["Base44", "Claude Code", "Cursor", "Lovable", "v0", "Replit", "Windsurf", "Codex"].map(
                (p, i) => (
                  <motion.div
                    key={p}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.06, duration: 0.5 }}
                    className="flex items-center justify-between rounded-xl border border-edge bg-white/[0.02] px-4 py-2.5"
                  >
                    <span className="text-sm font-medium">{p}</span>
                    <span className="text-[11px] text-faint font-mono">
                      {i === 0 ? "recommended" : "native prompt"}
                    </span>
                  </motion.div>
                ),
              )}
            </div>
          </div>
        </motion.div>
      </section>

      {/* CTA */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 py-20 text-center">
        <motion.div {...fadeUp}>
          <PrismMark size={44} className="mx-auto mb-6" />
          <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
            See what they're <span className="spectrum-text">really made of</span>
          </h2>
          <button onClick={enterWorkspace} className="btn-primary !px-8 !py-3.5 text-base mt-8">
            Start analyzing free
            <ArrowRight size={17} />
          </button>
        </motion.div>
      </section>

      <footer className="relative z-10 border-t border-edge">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-faint">
          <div className="flex items-center gap-2">
            <PrismMark size={18} />
            <span>Prism AI — product intelligence, refracted.</span>
          </div>
          <span>Built on the Base44 backend.</span>
        </div>
      </footer>
    </div>
  );
}
