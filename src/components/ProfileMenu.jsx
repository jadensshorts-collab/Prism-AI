import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutGrid, GitCompareArrows, LogOut, ShieldCheck, Globe } from "lucide-react";
import { Project } from "@/api/base44Client";
import { signOut } from "@/lib/useAuth";
import PrismMark from "@/components/PrismMark";
import Spinner from "@/components/ui/Spinner";
import { parseDate } from "@/lib/utils";

// The account panel behind the avatar. Everything here is real: the identity
// fields come from the session, and the counters are computed from the user's
// own project rows — a plain database read, nothing generated.
export default function ProfileMenu({ user, fetchProjects }) {
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState(false);
  const triggerRef = useRef(null);
  const wasOpen = useRef(false);

  const load = fetchProjects || (() => Project.list("-created_date", 200));

  // Counting analyses is only worth a round trip once the panel is actually
  // opened, and only once per session after that.
  useEffect(() => {
    if (!open || stats || statsError) return;
    let alive = true;
    Promise.resolve(load())
      .then((projects) => {
        if (!alive) return;
        const complete = projects.filter((p) => p.status === "complete");
        const scores = complete.map((p) => p.innovation_score).filter((s) => s != null);
        setStats({
          total: projects.length,
          complete: complete.length,
          shared: projects.filter((p) => p.is_public).length,
          avg: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
        });
      })
      .catch(() => {
        if (alive) setStatsError(true);
      });
    return () => {
      alive = false;
    };
  }, [open, stats, statsError]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Closing unmounts whatever held focus, which would drop the caret back to
  // the document and restart tabbing from the top of the page.
  useEffect(() => {
    if (wasOpen.current && !open) triggerRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  const name = user.full_name || user.email;
  const initial = (user.full_name || user.email || "?")[0].toUpperCase();
  const joined = parseDate(user.created_date);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Account: ${name}`}
        className="flex items-center gap-2.5 rounded-full pl-[3px] pr-1 py-[3px] -my-[3px] transition-colors hover:bg-white/[0.06]"
      >
        <span className="w-7 h-7 rounded-full spectrum-bar p-[1.5px] shrink-0">
          <span
            aria-hidden="true"
            className="w-full h-full rounded-full bg-raised flex items-center justify-center text-[11px] font-semibold"
          >
            {initial}
          </span>
        </span>
        <span className="text-[13px] text-muted hidden md:block max-w-[140px] truncate">{name}</span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              role="dialog"
              aria-label="Your profile"
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.16 }}
              // Never wider than the screen it opens on, however narrow that is.
              className="absolute right-0 top-full mt-2.5 w-[19rem] max-w-[calc(100vw-1.5rem)] glass !bg-raised z-50 shadow-2xl overflow-hidden"
            >
              <div className="relative p-5 pb-4">
                <div
                  aria-hidden="true"
                  className="absolute -top-24 -right-10 w-56 h-40 rounded-full opacity-[0.18] blur-[70px]"
                  style={{ background: "radial-gradient(ellipse, #8B5CF6, #22D3EE 65%, transparent 80%)" }}
                />
                <div className="relative flex items-center gap-3.5">
                  <span className="w-12 h-12 rounded-full spectrum-bar p-[2px] shrink-0">
                    <span
                      aria-hidden="true"
                      className="w-full h-full rounded-full bg-raised flex items-center justify-center font-display text-lg font-bold"
                    >
                      {initial}
                    </span>
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-semibold text-[15px] truncate">{name}</h3>
                      {user.is_verified && (
                        <ShieldCheck size={13} className="text-emerald shrink-0" aria-label="Verified email" />
                      )}
                    </div>
                    <p className="text-[12px] text-muted truncate mt-0.5">{user.email}</p>
                  </div>
                </div>
                <p className="relative text-[11.5px] text-muted mt-3.5">
                  {joined
                    ? `Member since ${joined.toLocaleDateString(undefined, { month: "long", year: "numeric" })}`
                    : "Prism AI account"}
                  {user.role === "admin" && " · Workspace owner"}
                </p>
              </div>

              <div className="px-5 pb-4">
                {statsError ? (
                  <p className="text-[12px] text-muted">Your analyses couldn't be counted just now.</p>
                ) : !stats ? (
                  <div className="flex items-center gap-2 text-[12px] text-muted py-2">
                    <Spinner size={13} /> Counting your analyses…
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Products analyzed", value: stats.total },
                      { label: "Reports complete", value: stats.complete },
                      { label: "Public links", value: stats.shared, icon: Globe },
                      { label: "Avg. innovation", value: stats.avg ?? "—", prism: true },
                    ].map((s) => (
                      <div key={s.label} className="rounded-xl border border-edge bg-white/[0.03] px-3 py-2.5">
                        <div className="flex items-center gap-1.5 text-violet-soft">
                          {s.prism ? <PrismMark size={12} /> : s.icon ? <s.icon size={12} /> : null}
                          <span className="font-display text-lg font-bold tabular-nums leading-none text-ink">
                            {s.value}
                          </span>
                        </div>
                        <div className="text-[10.5px] text-muted mt-1.5">{s.label}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-edge p-2">
                {[
                  { to: "/app", icon: LayoutGrid, label: "Workspace" },
                  { to: "/app/compare", icon: GitCompareArrows, label: "Compare products" },
                ].map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-muted hover:text-ink hover:bg-white/[0.05] transition-colors"
                  >
                    <l.icon size={14} />
                    {l.label}
                  </Link>
                ))}
                <button
                  onClick={signOut}
                  className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-muted hover:text-rose hover:bg-rose/10 transition-colors"
                >
                  <LogOut size={14} />
                  Sign out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
