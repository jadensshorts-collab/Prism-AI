import { Component } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import PrismMark from "@/components/PrismMark";

// A render error anywhere below this point would otherwise blank the entire
// page. Reports are assembled from model-generated JSON, so an unexpected shape
// is the realistic failure mode — catch it and keep the app navigable.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[Prism] Unhandled render error:", error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen bg-void flex items-center justify-center px-6">
        <div className="glass p-9 max-w-md text-center">
          <PrismMark size={38} className="mx-auto mb-5 opacity-70" />
          <div className="flex items-center justify-center gap-2 text-rose mb-2">
            <AlertTriangle size={16} />
            <h1 className="font-display text-lg font-semibold">Something broke on this screen</h1>
          </div>
          <p className="text-[13px] text-muted leading-relaxed">
            Your analyses are safe — this is a display problem, not lost data. Reloading usually
            clears it.
          </p>
          <p className="mt-3 font-mono text-[11px] text-faint break-words">
            {String(this.state.error?.message || this.state.error).slice(0, 200)}
          </p>
          <div className="flex items-center justify-center gap-3 mt-7">
            <a href="/app" className="btn-ghost">
              <Home size={15} /> Workspace
            </a>
            <button onClick={() => window.location.reload()} className="btn-primary">
              <RotateCcw size={15} /> Reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}
