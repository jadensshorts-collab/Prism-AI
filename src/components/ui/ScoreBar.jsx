import { motion } from "framer-motion";
import { scoreColor } from "@/lib/utils";

export default function ScoreBar({ label, score, note, delay = 0 }) {
  const pct = score == null ? 0 : Math.max(0, Math.min(100, score));
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[13px] font-medium text-ink">{label}</span>
        <span className="text-[13px] font-semibold tabular-nums" style={{ color: scoreColor(score) }}>
          {score == null ? "—" : Math.round(pct)}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: scoreColor(score) }}
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      {note && <p className="mt-1.5 text-xs text-muted leading-relaxed">{note}</p>}
    </div>
  );
}
