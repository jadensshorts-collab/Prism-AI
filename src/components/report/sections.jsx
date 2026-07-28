import { motion } from "framer-motion";
import {
  Target,
  Users,
  Puzzle,
  Gem,
  ListChecks,
  Info,
  TrendingUp,
  Palette,
  Cpu,
  Brain,
  Rocket,
  Swords,
  Gauge,
  ArrowUpRight,
  ShieldCheck,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
  CircleDollarSign,
} from "lucide-react";
import ScoreRing from "@/components/ui/ScoreRing";
import ScoreBar from "@/components/ui/ScoreBar";
import { cn, scoreColor, scoreLabel } from "@/lib/utils";

/* ---------- shared bits ---------- */

export function Card({ title, icon: Icon, children, className, accent }) {
  return (
    <section className={cn("glass p-6", className)}>
      {title && (
        <h3 className="flex items-center gap-2 font-display text-[15px] font-semibold mb-4">
          {Icon && <Icon size={16} style={{ color: accent || "#A78BFA" }} />}
          {title}
        </h3>
      )}
      {children}
    </section>
  );
}

function Pill({ children, tone = "default" }) {
  const tones = {
    default: "border-edge text-muted bg-white/[0.03]",
    violet: "border-violet/40 text-violet-soft bg-violet/10",
    cyan: "border-cyan/40 text-cyan-soft bg-cyan/10",
    emerald: "border-emerald/40 text-emerald bg-emerald/10",
    amber: "border-amber/40 text-amber bg-amber/10",
    rose: "border-rose/40 text-rose bg-rose/10",
  };
  return <span className={cn("chip", tones[tone])}>{children}</span>;
}

const CONFIDENCE_TONE = { confirmed: "emerald", likely: "cyan", possible: "default" };
const THREAT_TONE = { high: "rose", medium: "amber", low: "emerald" };
const IMPACT_TONE = { high: "emerald", medium: "cyan", low: "default" };

function ScoreHeader({ score, label = "Layer score", rationale }) {
  if (score == null) return null;
  return (
    <div className="glass p-6 flex items-center gap-6">
      <ScoreRing score={score} size={84} strokeWidth={6} />
      <div className="min-w-0">
        <div className="font-display text-lg font-semibold">
          {scoreLabel(score)} <span className="text-faint font-normal text-sm">· {label}</span>
        </div>
        {rationale && <p className="text-[13px] text-muted mt-1.5 leading-relaxed">{rationale}</p>}
      </div>
    </div>
  );
}

/* ---------- Overview ---------- */

export function OverviewSection({ project, sections, onNavigate }) {
  const o = project.overview || {};
  const byKey = Object.fromEntries(sections.map((s) => [s.section_key, s]));
  const layerCards = [
    { key: "business", label: "Business", icon: TrendingUp, color: "#60A5FA" },
    { key: "design", label: "Design", icon: Palette, color: "#22D3EE" },
    { key: "technology", label: "Technology", icon: Cpu, color: "#34D399" },
    { key: "psychology", label: "Psychology", icon: Brain, color: "#FBBF24" },
    { key: "growth", label: "Growth", icon: Rocket, color: "#FB7185" },
    { key: "competitors", label: "Competitors", icon: Swords, color: "#A78BFA" },
    { key: "innovation", label: "Innovation", icon: Gauge, color: "#67E8F9" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid lg:grid-cols-3 gap-5">
        <Card title="What it does" icon={Info} className="lg:col-span-2" accent="#8B5CF6">
          <p className="text-[14px] text-muted leading-relaxed">{o.what_it_does || "—"}</p>
          {o.notable_facts?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {o.notable_facts.map((f, i) => (
                <Pill key={i}>{f}</Pill>
              ))}
            </div>
          )}
        </Card>
        <Card title="Target users" icon={Users} accent="#22D3EE">
          <ul className="space-y-2">
            {(o.target_users || []).map((u, i) => (
              <li key={i} className="text-[13px] text-muted flex gap-2.5">
                <span className="text-cyan-soft mt-0.5">→</span>
                {u}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card title="Problem it solves" icon={Puzzle} accent="#FBBF24">
          <p className="text-[14px] text-muted leading-relaxed">{o.problem_solved || "—"}</p>
        </Card>
        <Card title="Value proposition" icon={Gem} accent="#34D399">
          <p className="text-[14px] text-muted leading-relaxed">{o.value_proposition || "—"}</p>
        </Card>
      </div>

      {o.key_features?.length > 0 && (
        <Card title="Key features" icon={ListChecks} accent="#60A5FA">
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2.5">
            {o.key_features.map((f, i) => (
              <div key={i} className="text-[13px] text-muted flex gap-2.5">
                <span className="w-1 h-1 rounded-full spectrum-bar mt-2 shrink-0" />
                {f}
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card title="The layers" icon={Target} accent="#A78BFA">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {layerCards.map((l) => {
            const sec = byKey[l.key];
            const score =
              l.key === "innovation"
                ? project.innovation_score
                : (project.layer_scores || {})[l.key];
            return (
              <button
                key={l.key}
                onClick={() => onNavigate(l.key)}
                className="glass glass-hover p-3.5 text-center group"
              >
                <l.icon size={16} className="mx-auto mb-2" style={{ color: l.color }} />
                <div
                  className="font-display text-lg font-bold tabular-nums"
                  style={{ color: score != null ? scoreColor(score) : "#62626F" }}
                >
                  {score != null ? Math.round(score) : sec?.status === "failed" ? "!" : "—"}
                </div>
                <div className="text-[10px] text-faint mt-0.5 flex items-center justify-center gap-0.5">
                  {l.label}
                  <ArrowUpRight size={9} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

/* ---------- Business ---------- */

export function BusinessSection({ data: d }) {
  return (
    <div className="space-y-5">
      <ScoreHeader score={d.score} label="Business layer" rationale={d.score_rationale} />
      <Card title="Business model" icon={TrendingUp} accent="#60A5FA">
        <p className="text-[14px] text-muted leading-relaxed">{d.business_model || "—"}</p>
        {d.growth_potential && (
          <p className="text-[13px] text-muted leading-relaxed mt-3 pt-3 border-t border-edge">
            <span className="text-ink font-medium">Growth outlook: </span>
            {d.growth_potential}
          </p>
        )}
      </Card>

      {d.pricing_strategy?.tiers?.length > 0 && (
        <Card title={`Pricing — ${d.pricing_strategy.model || ""}`} icon={CircleDollarSign} accent="#34D399">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-4">
            {d.pricing_strategy.tiers.map((t, i) => (
              <div key={i} className="rounded-xl border border-edge bg-white/[0.02] p-4">
                <div className="text-[13px] font-semibold">{t.name}</div>
                <div className="font-display text-lg font-bold text-emerald mt-1">{t.price}</div>
                <div className="text-[12px] text-muted mt-1.5">{t.for_whom}</div>
              </div>
            ))}
          </div>
          {d.pricing_strategy.assessment && (
            <p className="text-[13px] text-muted leading-relaxed">{d.pricing_strategy.assessment}</p>
          )}
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-5">
        {d.revenue_streams?.length > 0 && (
          <Card title="Revenue streams" icon={CircleDollarSign} accent="#FBBF24">
            <ul className="space-y-3">
              {d.revenue_streams.map((r, i) => (
                <li key={i} className="text-[13px]">
                  <span className="text-ink font-medium">{r.name}</span>
                  <p className="text-muted mt-0.5 leading-relaxed">{r.description}</p>
                </li>
              ))}
            </ul>
          </Card>
        )}
        {d.customer_segments?.length > 0 && (
          <Card title="Customer segments" icon={Users} accent="#22D3EE">
            <ul className="space-y-3">
              {d.customer_segments.map((s, i) => (
                <li key={i} className="text-[13px]">
                  <span className="text-ink font-medium">{s.segment}</span>
                  <p className="text-muted mt-0.5 leading-relaxed">{s.needs}</p>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      {d.monetization_opportunities?.length > 0 && (
        <Card title="Untapped monetization" icon={Lightbulb} accent="#FB7185">
          <div className="grid sm:grid-cols-2 gap-3">
            {d.monetization_opportunities.map((m, i) => (
              <div key={i} className="flex gap-2.5 text-[13px] text-muted rounded-xl border border-edge bg-white/[0.02] p-3.5 leading-relaxed">
                <Lightbulb size={14} className="text-amber shrink-0 mt-0.5" />
                {m}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

/* ---------- Design ---------- */

export function DesignSection({ data: d }) {
  return (
    <div className="space-y-5">
      <ScoreHeader score={d.score} label="Design layer" rationale={d.overall_assessment} />
      {d.dimensions?.length > 0 && (
        <Card title="Design scorecard" icon={Palette} accent="#22D3EE">
          <div className="grid md:grid-cols-2 gap-x-10 gap-y-6">
            {d.dimensions.map((dim, i) => (
              <ScoreBar key={i} label={dim.name} score={dim.score} note={dim.notes} delay={i * 0.06} />
            ))}
          </div>
        </Card>
      )}
      <div className="grid lg:grid-cols-2 gap-5">
        {d.strengths?.length > 0 && (
          <Card title="What works" icon={ThumbsUp} accent="#34D399">
            <ul className="space-y-2.5">
              {d.strengths.map((s, i) => (
                <li key={i} className="text-[13px] text-muted flex gap-2.5 leading-relaxed">
                  <ThumbsUp size={13} className="text-emerald shrink-0 mt-0.5" />
                  {s}
                </li>
              ))}
            </ul>
          </Card>
        )}
        {d.weaknesses?.length > 0 && (
          <Card title="What doesn't" icon={ThumbsDown} accent="#FB7185">
            <ul className="space-y-2.5">
              {d.weaknesses.map((s, i) => (
                <li key={i} className="text-[13px] text-muted flex gap-2.5 leading-relaxed">
                  <ThumbsDown size={13} className="text-rose shrink-0 mt-0.5" />
                  {s}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}

/* ---------- Technology ---------- */

export function TechnologySection({ data: d }) {
  const groups = {};
  for (const t of d.detected || []) {
    (groups[t.category] ||= []).push(t);
  }
  return (
    <div className="space-y-5">
      <ScoreHeader score={d.score} label="Stack modernity" rationale={d.stack_summary} />
      <div className="grid md:grid-cols-2 gap-5">
        {Object.entries(groups).map(([cat, items]) => (
          <Card key={cat} title={cat} icon={Cpu} accent="#34D399">
            <ul className="space-y-3">
              {items.map((t, i) => (
                <li key={i}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[13px] font-medium text-ink">{t.name}</span>
                    <Pill tone={CONFIDENCE_TONE[t.confidence] || "default"}>{t.confidence}</Pill>
                  </div>
                  {t.evidence && <p className="text-[12px] text-faint mt-1 leading-relaxed">{t.evidence}</p>}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
      {d.architecture_notes && (
        <Card title="Architecture notes" icon={ShieldCheck} accent="#60A5FA">
          <p className="text-[13px] text-muted leading-relaxed">{d.architecture_notes}</p>
        </Card>
      )}
    </div>
  );
}

/* ---------- Psychology ---------- */

export function PsychologySection({ data: d }) {
  return (
    <div className="space-y-5">
      <ScoreHeader score={d.score} label="Psychological sophistication" rationale={d.summary} />
      <div className="grid md:grid-cols-2 gap-4">
        {(d.techniques || []).map((t, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: (i % 4) * 0.05 }}
            className="glass p-5"
          >
            <div className="flex items-start justify-between gap-3 mb-2.5">
              <h4 className="text-[14px] font-semibold">{t.name}</h4>
              <Pill tone="violet">{t.category}</Pill>
            </div>
            {t.where_used && (
              <p className="text-[12px] text-faint mb-2">
                <span className="text-muted font-medium">Where: </span>
                {t.where_used}
              </p>
            )}
            <p className="text-[13px] text-muted leading-relaxed">
              <span className="text-ink font-medium">Why it works: </span>
              {t.why_it_works}
            </p>
            {t.effectiveness != null && (
              <div className="mt-3.5">
                <ScoreBar label="Execution" score={t.effectiveness} />
              </div>
            )}
          </motion.div>
        ))}
      </div>
      {d.missing_techniques?.length > 0 && (
        <Card title="Levers they're not pulling" icon={Lightbulb} accent="#FBBF24">
          <div className="grid md:grid-cols-2 gap-3">
            {d.missing_techniques.map((m, i) => (
              <div key={i} className="rounded-xl border border-dashed border-amber/30 bg-amber/[0.04] p-3.5">
                <div className="text-[13px] font-medium text-amber">{m.name}</div>
                <p className="text-[12px] text-muted mt-1 leading-relaxed">{m.opportunity}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

/* ---------- Growth ---------- */

const EFFECTIVENESS_TONE = { primary: "violet", strong: "emerald", moderate: "amber", weak: "rose" };

export function GrowthSection({ data: d }) {
  return (
    <div className="space-y-5">
      <ScoreHeader score={d.score} label="Growth machine" rationale={d.summary} />
      <div className="grid lg:grid-cols-2 gap-5">
        {d.acquisition_channels?.length > 0 && (
          <Card title="Acquisition channels" icon={Rocket} accent="#FB7185">
            <ul className="space-y-3.5">
              {d.acquisition_channels.map((c, i) => (
                <li key={i}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[13px] font-medium">{c.channel}</span>
                    <Pill tone={EFFECTIVENESS_TONE[c.effectiveness] || "default"}>{c.effectiveness}</Pill>
                  </div>
                  {c.notes && <p className="text-[12px] text-faint mt-1 leading-relaxed">{c.notes}</p>}
                </li>
              ))}
            </ul>
          </Card>
        )}
        <div className="space-y-5">
          {d.seo && (
            <Card title="SEO" icon={TrendingUp} accent="#60A5FA">
              <div className="flex items-center gap-5">
                <ScoreRing score={d.seo.score} size={56} strokeWidth={5} />
                <p className="text-[13px] text-muted leading-relaxed flex-1">{d.seo.assessment}</p>
              </div>
            </Card>
          )}
          {d.retention_mechanics?.length > 0 && (
            <Card title="Retention mechanics" icon={Target} accent="#34D399">
              <ul className="space-y-2">
                {d.retention_mechanics.map((r, i) => (
                  <li key={i} className="text-[13px] text-muted flex gap-2.5 leading-relaxed">
                    <span className="text-emerald mt-0.5">↻</span>
                    {r}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
      {d.referral_and_community && (
        <Card title="Referral & community" icon={Users} accent="#A78BFA">
          <p className="text-[13px] text-muted leading-relaxed">{d.referral_and_community}</p>
        </Card>
      )}
      {d.recommendations?.length > 0 && (
        <Card title="Growth plays to steal" icon={Lightbulb} accent="#FBBF24">
          <div className="grid md:grid-cols-2 gap-3">
            {d.recommendations.map((r, i) => (
              <div key={i} className="flex gap-2.5 text-[13px] text-muted rounded-xl border border-edge bg-white/[0.02] p-3.5 leading-relaxed">
                <span className="font-display font-bold text-violet-soft shrink-0">{String(i + 1).padStart(2, "0")}</span>
                {r}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

/* ---------- Competitors ---------- */

export function CompetitorsSection({ data: d }) {
  return (
    <div className="space-y-5">
      <Card title="Market position" icon={Swords} accent="#A78BFA">
        <p className="text-[14px] text-muted leading-relaxed">{d.market_position || "—"}</p>
        {d.differentiation_summary && (
          <p className="text-[13px] text-muted leading-relaxed mt-3 pt-3 border-t border-edge">
            <span className="text-ink font-medium">Differentiation: </span>
            {d.differentiation_summary}
          </p>
        )}
      </Card>
      <div className="grid md:grid-cols-2 gap-4">
        {(d.competitors || []).map((c, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: (i % 4) * 0.05 }}
            className="glass p-5"
          >
            <div className="flex items-start justify-between gap-3 mb-1">
              <h4 className="text-[15px] font-semibold">{c.name}</h4>
              <Pill tone={THREAT_TONE[c.threat_level] || "default"}>{c.threat_level} threat</Pill>
            </div>
            {c.pricing && <p className="text-[12px] text-faint mb-2">{c.pricing}</p>}
            <p className="text-[13px] text-muted leading-relaxed mb-3.5">{c.positioning}</p>
            <div className="grid grid-cols-2 gap-4 text-[12px]">
              <div>
                <div className="text-emerald font-medium mb-1.5 flex items-center gap-1"><ThumbsUp size={11} /> Strengths</div>
                <ul className="space-y-1 text-muted">
                  {(c.strengths || []).map((s, j) => <li key={j}>· {s}</li>)}
                </ul>
              </div>
              <div>
                <div className="text-rose font-medium mb-1.5 flex items-center gap-1"><ThumbsDown size={11} /> Weaknesses</div>
                <ul className="space-y-1 text-muted">
                  {(c.weaknesses || []).map((s, j) => <li key={j}>· {s}</li>)}
                </ul>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      {d.white_space && (
        <Card title="White space" icon={Lightbulb} accent="#67E8F9">
          <p className="text-[13px] text-muted leading-relaxed">{d.white_space}</p>
        </Card>
      )}
    </div>
  );
}

/* ---------- Innovation ---------- */

const OPP_COLORS = {
  "Missing Feature": "#60A5FA",
  "Better Workflow": "#22D3EE",
  "AI Opportunity": "#8B5CF6",
  "New Audience": "#34D399",
  Automation: "#67E8F9",
  Monetization: "#FBBF24",
  Accessibility: "#A78BFA",
  Enterprise: "#FB7185",
};

export function InnovationSection({ data: d }) {
  return (
    <div className="space-y-5">
      {/* meter */}
      <div className="glass p-8 md:p-10 relative overflow-hidden">
        <div
          className="absolute -top-24 -right-24 w-80 h-80 rounded-full opacity-[0.15] blur-[90px]"
          style={{ background: "radial-gradient(circle, #8B5CF6, #22D3EE 60%, transparent 80%)" }}
        />
        <div className="relative flex flex-col md:flex-row items-center gap-10">
          <div className="text-center shrink-0">
            <ScoreRing score={d.overall_score} size={168} strokeWidth={10} spectrum label="INNOVATION" />
            <div className="font-display text-sm font-semibold mt-3 spectrum-text">
              {scoreLabel(d.overall_score)}
            </div>
          </div>
          <div className="flex-1 w-full">
            {d.verdict?.trim() && (
              <p className="font-display text-lg md:text-xl font-semibold leading-snug mb-6">
                “{d.verdict}”
              </p>
            )}
            <div className="grid sm:grid-cols-2 gap-x-10 gap-y-5">
              {(d.facets || []).map((f, i) => (
                <ScoreBar key={i} label={f.name} score={f.score} note={f.rationale} delay={i * 0.07} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* opportunities */}
      <div className={d.opportunities?.length ? "" : "hidden"}>
        <h3 className="font-display text-lg font-semibold mb-1.5 flex items-center gap-2">
          <Lightbulb size={17} className="text-amber" />
          Untapped opportunities
        </h3>
        <p className="text-[13px] text-muted mb-5">
          Not ideas to copy — openings to build something better. Feed these into Evolution Mode in
          the Build Studio.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          {(d.opportunities || []).map((op, i) => {
            const color = OPP_COLORS[op.category] || "#A78BFA";
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: (i % 4) * 0.05 }}
                className="glass glass-hover p-5 border-l-2"
                style={{ borderLeftColor: color }}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h4 className="text-[14px] font-semibold leading-snug">{op.title}</h4>
                </div>
                <p className="text-[13px] text-muted leading-relaxed mb-3.5">{op.description}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="chip" style={{ borderColor: `${color}55`, color, background: `${color}14` }}>
                    {op.category}
                  </span>
                  <Pill tone={IMPACT_TONE[op.impact] || "default"}>impact: {op.impact}</Pill>
                  <Pill>effort: {op.effort}</Pill>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
