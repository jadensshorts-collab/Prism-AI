import { motion } from "framer-motion";
import {
  Layers,
  TrendingUp,
  Palette,
  Cpu,
  Brain,
  Rocket,
  Swords,
  Gauge,
} from "lucide-react";

export const LAYER_INFO = [
  { icon: Layers, color: "#8B5CF6", title: "Overview", desc: "What it does, who it serves, the problem it solves" },
  { icon: TrendingUp, color: "#60A5FA", title: "Business", desc: "Model, pricing tiers, segments, untapped revenue" },
  { icon: Palette, color: "#22D3EE", title: "Design", desc: "UI, UX, hierarchy, accessibility — six scored dimensions" },
  { icon: Cpu, color: "#34D399", title: "Technology", desc: "Stack detection with confidence-rated evidence" },
  { icon: Brain, color: "#FBBF24", title: "Psychology", desc: "Habit loops, trust signals, and why each one works" },
  { icon: Rocket, color: "#FB7185", title: "Growth", desc: "SEO, channels, retention, referral mechanics" },
  { icon: Swords, color: "#A78BFA", title: "Competitors", desc: "The real field, with threat levels and white space" },
  { icon: Gauge, color: "#67E8F9", title: "Innovation", desc: "Six-facet score plus untapped opportunities" },
];

// A compact map of what every analysis produces. Purely informational — it
// describes the pipeline that actually runs.
export default function LayerStrip() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {LAYER_INFO.map((l, i) => (
        <motion.div
          key={l.title}
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: Math.min(i * 0.04, 0.28) }}
          className="glass p-4"
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center mb-2.5"
            style={{ background: `${l.color}1A`, border: `1px solid ${l.color}3D` }}
          >
            <l.icon size={15} style={{ color: l.color }} />
          </div>
          <h4 className="text-[13px] font-semibold">{l.title}</h4>
          <p className="text-[11.5px] text-faint leading-relaxed mt-1">{l.desc}</p>
        </motion.div>
      ))}
    </div>
  );
}
