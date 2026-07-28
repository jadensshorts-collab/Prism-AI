import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Share2, Check, Copy, Globe, Lock, X } from "lucide-react";
import { invokeFunction, track } from "@/api/base44Client";
import Spinner from "@/components/ui/Spinner";
import { copyText } from "@/lib/utils";

// Opt-in public sharing. The token is minted server-side; revoking clears it,
// which permanently kills any link already in circulation.
export default function ShareButton({ project, onChange }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [state, setState] = useState({
    is_public: !!project.is_public,
    share_token: project.share_token || "",
  });

  const link = state.share_token
    ? `${window.location.origin}/r/${state.share_token}`
    : "";

  // Escape should dismiss the popover, matching every other menu on the web.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const toggle = async (share) => {
    setBusy(true);
    setError("");
    try {
      const res = await invokeFunction("share-report", { projectId: project.id, share });
      const d = res?.data;
      if (d?.error) throw new Error(d.error);
      setState({ is_public: d.is_public, share_token: d.share_token || "" });
      track(share ? "report_shared" : "report_unshared", { project_id: project.id });
      onChange?.(d);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Could not update sharing.");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (await copyText(link)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="btn-ghost"
      >
        <Share2 size={15} />
        Share
        {state.is_public && <span className="w-1.5 h-1.5 rounded-full bg-emerald" />}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.16 }}
              className="absolute right-0 top-full mt-2 w-80 glass !bg-raised p-5 z-50 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  {state.is_public ? (
                    <Globe size={15} className="text-emerald" />
                  ) : (
                    <Lock size={15} className="text-muted" />
                  )}
                  <h4 className="text-[14px] font-semibold">
                    {state.is_public ? "Public link is live" : "Private report"}
                  </h4>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close sharing panel"
                  className="text-faint hover:text-ink"
                >
                  <X size={14} />
                </button>
              </div>

              <p className="text-[12px] text-muted leading-relaxed mb-4">
                {state.is_public
                  ? "Anyone with this link can read the report — no account needed. Your workspace and other analyses stay private."
                  : "Only you can see this report. Turn on sharing to publish a read-only link."}
              </p>

              {state.is_public && link && (
                <div className="flex gap-2 mb-3">
                  <input
                    readOnly
                    value={link}
                    onClick={(e) => e.target.select()}
                    className="input-dark !py-1.5 !px-2.5 text-[11px] font-mono flex-1"
                  />
                  <button
                    onClick={copy}
                    aria-label="Copy share link"
                    title="Copy share link"
                    className="btn-ghost !py-1.5 !px-2.5"
                  >
                    {copied ? <Check size={13} className="text-emerald" /> : <Copy size={13} />}
                  </button>
                </div>
              )}

              {error && <p className="text-[12px] text-rose mb-2">{error}</p>}

              <button
                onClick={() => toggle(!state.is_public)}
                disabled={busy}
                className={state.is_public ? "btn-ghost w-full !py-2" : "btn-primary w-full !py-2"}
              >
                {busy ? (
                  <Spinner size={14} />
                ) : state.is_public ? (
                  <>
                    <Lock size={14} /> Make private
                  </>
                ) : (
                  <>
                    <Globe size={14} /> Create public link
                  </>
                )}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
