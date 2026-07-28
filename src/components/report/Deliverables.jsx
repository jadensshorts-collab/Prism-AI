import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FileText, Terminal, ScrollText, Download, RefreshCw, ExternalLink, HardDrive } from "lucide-react";
import { Artifact, invokeFunction } from "@/api/base44Client";
import Spinner from "@/components/ui/Spinner";
import { timeAgo } from "@/lib/utils";

const KINDS = [
  {
    kind: "report",
    label: "Intelligence Report",
    icon: ScrollText,
    color: "#8B5CF6",
    desc: "The full eight-layer analysis with scores, competitor tables, and opportunities.",
  },
  {
    kind: "prd",
    label: "Product Requirements Doc",
    icon: FileText,
    color: "#22D3EE",
    desc: "The complete 16-section PRD for your evolution concept.",
  },
  {
    kind: "prompt-pack",
    label: "Builder Prompt Pack",
    icon: Terminal,
    color: "#34D399",
    desc: "All eight platform-native build prompts in one file.",
  },
];

const fmtSize = (b) => (b == null ? "" : b < 1024 ? `${b} B` : `${(b / 1024).toFixed(1)} KB`);

// Deliverables are rendered and stored by the backend: `export-artifact`
// assembles the markdown server-side, uploads it to Base44 file storage, and
// records an Artifact row — so every file has a durable, shareable URL.
export default function Deliverables({ project }) {
  const [artifacts, setArtifacts] = useState(null);
  const [working, setWorking] = useState("");
  const [error, setError] = useState("");

  // Deliverables are stored as ordered chunk rows (entity fields are size
  // capped), so rebuild each one into a single document for download.
  const load = () =>
    Artifact.filter({ project_id: project.id })
      .then((rows) => {
        const groups = new Map();
        for (const r of rows) {
          const key = r.group_id || r.id;
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key).push(r);
        }
        const byKind = new Map();
        for (const parts of groups.values()) {
          parts.sort((a, b) => (a.part || 0) - (b.part || 0));
          const head = parts[0];
          const doc = {
            ...head,
            content: parts.map((p) => p.content || "").join("\n"),
          };
          const prev = byKind.get(head.kind);
          const newer =
            !prev ||
            new Date(head.updated_date || head.created_date) >
              new Date(prev.updated_date || prev.created_date);
          if (newer) byKind.set(head.kind, doc);
        }
        setArtifacts([...byKind.values()]);
      })
      .catch(() => setArtifacts([]));

  const download = (art) => {
    const blob = new Blob([art.content || ""], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = art.filename || "prism-export.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  const generate = async (kind) => {
    setWorking(kind);
    setError("");
    try {
      const res = await invokeFunction("export-artifact", { projectId: project.id, kind });
      if (res?.data?.error) throw new Error(res.data.error);
      await load();
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Export failed.");
    } finally {
      setWorking("");
    }
  };

  const byKind = Object.fromEntries((artifacts || []).map((a) => [a.kind, a]));

  return (
    <div className="space-y-5">
      <div className="glass p-6 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-violet/10 border border-violet/30 flex items-center justify-center shrink-0">
          <HardDrive size={18} className="text-violet-soft" />
        </div>
        <div>
          <h3 className="font-display text-[15px] font-semibold">Stored deliverables</h3>
          <p className="text-[13px] text-muted leading-relaxed mt-1">
            Prism renders each document on the backend and persists it to your workspace, so every
            export stays available to re-download without regenerating it.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose/30 bg-rose/[0.06] px-4 py-3 text-[13px] text-rose">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        {KINDS.map((k, i) => {
          const art = byKind[k.kind];
          const busy = working === k.kind;
          return (
            <motion.div
              key={k.kind}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="glass p-5 flex flex-col"
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center mb-3.5"
                style={{ background: `${k.color}1A`, border: `1px solid ${k.color}40` }}
              >
                <k.icon size={16} style={{ color: k.color }} />
              </div>
              <h4 className="text-[14px] font-semibold">{k.label}</h4>
              <p className="text-[12.5px] text-muted leading-relaxed mt-1.5 flex-1">{k.desc}</p>

              {art ? (
                <>
                  <div className="mt-4 pt-3.5 border-t border-edge text-[11px] text-faint space-y-0.5">
                    <div className="font-mono truncate text-muted">{art.filename}</div>
                    <div>
                      {fmtSize(art.size_bytes)} · stored {timeAgo(art.updated_date || art.created_date)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => download(art)}
                      className="btn-primary !py-1.5 !px-3 text-[12px] flex-1"
                    >
                      <Download size={13} />
                      Download
                    </button>
                    <button
                      onClick={() => generate(k.kind)}
                      disabled={busy}
                      aria-label={`Regenerate the ${k.label} file from the latest data`}
                      title="Regenerate from the latest data"
                      className="btn-ghost !py-1.5 !px-2.5"
                    >
                      {busy ? <Spinner size={13} /> : <RefreshCw size={13} />}
                    </button>
                  </div>
                </>
              ) : (
                <button
                  onClick={() => generate(k.kind)}
                  disabled={busy || artifacts == null}
                  className="btn-ghost w-full mt-4 !py-2 text-[12.5px]"
                >
                  {busy ? <Spinner size={13} /> : <ExternalLink size={13} />}
                  {busy ? "Generating…" : "Generate file"}
                </button>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
