// DEV-ONLY: the failed-analysis screen, including the message a user sees when
// the provider is at its usage limit. Verifies no raw vendor text leaks through.
import { AlertTriangle, ArrowLeft, RotateCcw } from "lucide-react";

const MESSAGES = {
  quota:
    "The analysis engine is at its usage limit right now. Capacity returns in about 57 minutes — your other reports are unaffected, and you can retry then.",
  truncated: "The model returned an incomplete response. Retrying usually clears it.",
  config: "The analysis engine is not configured. Set the GROQ_API_KEY secret and try again.",
};

export default function DevFailed() {
  const kind = new URLSearchParams(window.location.search).get("kind") || "quota";
  const error = MESSAGES[kind] || MESSAGES.quota;

  return (
    <div className="py-24 text-center max-w-md mx-auto">
      <AlertTriangle size={32} className="mx-auto text-rose mb-4" />
      <h2 className="font-display text-xl font-semibold mb-2">Analysis failed</h2>
      <p className="text-[13px] text-muted leading-relaxed">{error}</p>
      <div className="flex items-center justify-center gap-3 mt-7">
        <button className="btn-ghost">
          <ArrowLeft size={15} /> Workspace
        </button>
        <button className="btn-primary">
          <RotateCcw size={15} /> Retry analysis
        </button>
      </div>
    </div>
  );
}
