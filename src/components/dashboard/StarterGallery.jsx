import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { STARTER_PRODUCTS } from "@/lib/starters";
import Spinner from "@/components/ui/Spinner";

// Launch pads for a real analysis. These are not previews or mock reports —
// clicking one runs the same pipeline as pasting the URL yourself.
export default function StarterGallery({ onPick, busy, pending }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {STARTER_PRODUCTS.map((p, i) => {
        const isPending = pending === p.url;
        return (
          <motion.button
            key={p.url}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: Math.min(i * 0.05, 0.3) }}
            onClick={() => onPick(p.url)}
            disabled={busy}
            className="glass glass-hover group relative overflow-hidden p-5 text-left disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <div
              className="absolute -top-16 -right-16 w-40 h-40 rounded-full blur-[50px] opacity-[0.18] transition-opacity duration-300 group-hover:opacity-30"
              style={{ background: p.color }}
            />
            <div className="relative flex items-start gap-3.5">
              {/* Decorative brand initial — the product name sits beside it, so
                  it is hidden from assistive tech rather than read twice. */}
              <div
                aria-hidden="true"
                className="w-10 h-10 rounded-xl flex items-center justify-center font-display text-lg font-bold shrink-0"
                style={{
                  background: `${p.color}1F`,
                  border: `1px solid ${p.color}55`,
                  color: p.color,
                }}
              >
                {p.name[0]}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-[15px] truncate">{p.name}</h3>
                  {isPending ? (
                    <Spinner size={14} />
                  ) : (
                    <ArrowRight
                      size={14}
                      className="text-faint opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0"
                    />
                  )}
                </div>
                <p className="text-[11px] text-faint truncate">{p.url}</p>
              </div>
            </div>
            <p className="relative text-[13px] text-muted leading-relaxed mt-3.5">{p.question}</p>
            <span className="relative chip border-edge text-faint bg-white/[0.02] mt-3.5">
              {p.category}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
