import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { scoreColor } from "@/lib/utils";

// Animated radial score gauge. `size` in px, score 0-100 (null → empty state).
export default function ScoreRing({
  score,
  size = 64,
  strokeWidth = 5,
  spectrum = false,
  label,
  sublabel,
  className = "",
}) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const pct = score == null ? 0 : Math.max(0, Math.min(100, score));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (score == null) return;
    const dur = 1100;

    // Respect a reduced-motion preference: show the real number, no count-up.
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setDisplay(Math.round(pct));
      return;
    }

    let raf;
    const start = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(pct * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // requestAnimationFrame is paused in background/non-compositing tabs. Without
    // this guard the score would sit at a wrong "0" indefinitely, so snap to the
    // true value once the animation window has passed either way.
    const settle = setTimeout(() => setDisplay(Math.round(pct)), dur + 250);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(settle);
    };
  }, [pct, score]);

  const gid = `ring-${size}-${spectrum ? "s" : "m"}`;
  const stroke = spectrum ? `url(#${gid})` : scoreColor(score);

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {spectrum && (
          <defs>
            <linearGradient id={gid} x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8B5CF6" />
              <stop offset="50%" stopColor="#22D3EE" />
              <stop offset="100%" stopColor="#34D399" />
            </linearGradient>
          </defs>
        )}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (c * pct) / 100 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-display font-bold tabular-nums leading-none"
          style={{ fontSize: size * 0.28, color: spectrum ? "#EDEDF2" : scoreColor(score) }}
        >
          {score == null ? "—" : display}
        </span>
        {label && <span className="text-[10px] text-faint mt-0.5">{label}</span>}
      </div>
      {sublabel && (
        <span className="absolute -bottom-5 text-[11px] text-muted whitespace-nowrap">{sublabel}</span>
      )}
    </div>
  );
}
