import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, Wrench, Zap } from "lucide-react";
import { base44, Project, ChatMessage, invokeFunction } from "@/api/base44Client";
import Markdown from "@/components/ui/Markdown";
import Spinner from "@/components/ui/Spinner";
import PrismMark from "@/components/PrismMark";

const AGENT_NAME = "prism_analyst";

const SUGGESTIONS = [
  "How could this become a billion-dollar company?",
  "What features are missing?",
  "What would increase retention the most?",
  "How could AI transform this product?",
  "Where is this product most vulnerable?",
];

// Friendly labels for the agent's entity tool calls, so the user can watch it
// actually pull from the stored analysis instead of guessing.
const TOOL_LABELS = {
  read_Project: "Reading the product profile",
  read_ReportSection: "Consulting analysis layers",
  read_Evolution: "Reviewing the evolution concept",
  read_Prd: "Reading the PRD",
  read_GeneratedPrompt: "Checking builder prompts",
};

const toolLabel = (name) => TOOL_LABELS[name] || (name ? name.replace(/_/g, " ") : "Working");

export default function Strategist({ project }) {
  const [messages, setMessages] = useState(null);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [activeTools, setActiveTools] = useState([]);
  const [error, setError] = useState("");
  const [viaAgent, setViaAgent] = useState(true);
  const convoRef = useRef(null);
  const agentSucceeded = useRef(false);
  const endRef = useRef(null);

  // Normalizes both transports into one shape the view can render.
  const toView = (list) =>
    list
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m, i) => ({
        id: m.id || `${m.role}-${i}`,
        role: m.role,
        content: m.content || "",
        tools: (m.tool_calls || []).map((t) => t.name).filter(Boolean),
      }))
      .filter((m) => m.content || m.tools.length);

  const loadAgentConversation = async () => {
    // Reuse the conversation bound to this project so context compounds.
    if (project.agent_conversation_id) {
      const convo = await base44.agents.getConversation(project.agent_conversation_id);
      convoRef.current = convo;
      setMessages(toView(convo?.messages || []));
      return true;
    }
    setMessages([]);
    return true;
  };

  const loadFallback = async () => {
    const rows = await ChatMessage.filter({ project_id: project.id }, "created_date", 200);
    setMessages(
      rows.map((m) => ({ id: m.id, role: m.role, content: m.content, tools: [] })),
    );
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadAgentConversation();
        if (!cancelled) setViaAgent(true);
      } catch {
        if (cancelled) return;
        setViaAgent(false);
        await loadFallback().catch(() => setMessages([]));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, thinking, activeTools]);

  const ask = async (text) => {
    const message = (text ?? input).trim();
    if (!message || thinking) return;
    setInput("");
    setError("");
    setThinking(true);
    setActiveTools([]);
    setMessages((prev) => [
      ...(prev || []),
      { id: `tmp-${Date.now()}`, role: "user", content: message, tools: [] },
    ]);

    try {
      if (!viaAgent) throw new Error("fallback");

      // Bind a conversation to this project on first use.
      let convo = convoRef.current;
      if (!convo) {
        convo = await base44.agents.createConversation({
          agent_name: AGENT_NAME,
          metadata: { project_id: project.id, product: project.product_name || "" },
        });
        convoRef.current = convo;
        Project.update(project.id, { agent_conversation_id: convo.id }).catch(() => {});
      }

      // Stream tool activity while the agent works.
      let unsub;
      try {
        unsub = base44.agents.subscribeToConversation(convo.id, (update) => {
          const msgs = update?.messages || [];
          const names = msgs
            .flatMap((m) => m.tool_calls || [])
            .map((t) => t.name)
            .filter(Boolean);
          if (names.length) setActiveTools(names);
        });
      } catch {
        // realtime is a nicety here, not a requirement
      }

      try {
        await base44.agents.addMessage(convo, { role: "user", content: message });
        const full = await base44.agents.getConversation(convo.id);
        convoRef.current = full;
        agentSucceeded.current = true;
        setMessages(toView(full?.messages || []));
      } finally {
        try {
          unsub?.();
        } catch {
          // already closed
        }
      }
    } catch (agentErr) {
      // Once the agent has produced messages, switching transports would swap in
      // the (separate) function transcript and look like lost history. In that
      // case surface the error and keep the conversation intact instead.
      if (agentSucceeded.current) {
        setError(
          agentErr?.response?.data?.error ||
            agentErr?.message ||
            "The analyst couldn't answer that one. Try again.",
        );
        await loadAgentConversation().catch(() => {});
      } else {
        // Fall back to the stateless strategist function so the feature always works.
        try {
          setViaAgent(false);
          const res = await invokeFunction("strategist", {
            projectId: project.id,
            message,
          });
          if (res?.data?.error) throw new Error(res.data.error);
          await loadFallback();
        } catch (e) {
          setError(
            e?.response?.data?.error || e?.message || "The strategist couldn't answer. Try again.",
          );
        }
      }
    } finally {
      setThinking(false);
      setActiveTools([]);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div
        className="glass overflow-hidden flex flex-col"
        style={{ height: "calc(100vh - 240px)", minHeight: 480 }}
      >
        <div className="flex items-center justify-between gap-3 px-5 py-2.5 border-b border-edge">
          <div className="flex items-center gap-2 text-[12px] text-muted">
            <PrismMark size={15} />
            Prism Analyst
          </div>
          {viaAgent && (
            <span className="chip border-emerald/40 text-emerald bg-emerald/10">
              <Zap size={10} />
              Base44 Agent · entity tools
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {messages == null ? (
            <div className="flex items-center justify-center h-full gap-2.5 text-muted text-sm">
              <Spinner /> Loading conversation…
            </div>
          ) : messages.length === 0 && !thinking ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6">
              <PrismMark size={40} className="mb-4" />
              <h3 className="font-display text-lg font-semibold mb-1.5">AI Product Strategist</h3>
              <p className="text-[13px] text-muted max-w-sm leading-relaxed mb-7">
                A Base44 agent with live read access to your intelligence. It pulls the exact layers
                it needs from {project.product_name}'s report before answering — and remembers your
                context between sessions.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => ask(s)}
                    className="rounded-full border border-edge bg-white/[0.02] px-3.5 py-1.5 text-[12px] text-muted hover:text-ink hover:border-violet/50 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={m.role === "user" ? "flex justify-end" : "flex gap-3"}
                >
                  {m.role === "assistant" && <PrismMark size={22} className="mt-1 shrink-0" />}
                  {m.role === "user" ? (
                    <div className="max-w-[80%] rounded-2xl rounded-br-md bg-violet/15 border border-violet/25 px-4 py-2.5 text-[14px] leading-relaxed">
                      {m.content}
                    </div>
                  ) : (
                    <div className="max-w-[85%] min-w-0">
                      {m.tools.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {[...new Set(m.tools)].map((t) => (
                            <span
                              key={t}
                              className="chip border-cyan/30 text-cyan-soft bg-cyan/[0.07]"
                            >
                              <Wrench size={9} />
                              {toolLabel(t)}
                            </span>
                          ))}
                        </div>
                      )}
                      <Markdown>{m.content}</Markdown>
                    </div>
                  )}
                </motion.div>
              ))}

              {thinking && (
                <div className="flex gap-3">
                  <PrismMark size={22} className="shrink-0" />
                  <div className="min-w-0">
                    <AnimatePresence mode="popLayout">
                      {activeTools.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex flex-wrap gap-1.5 mb-2"
                        >
                          {[...new Set(activeTools)].map((t) => (
                            <span
                              key={t}
                              className="chip border-cyan/30 text-cyan-soft bg-cyan/[0.07]"
                            >
                              <Wrench size={9} />
                              {toolLabel(t)}
                            </span>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <span className="text-[13px] text-muted flex items-center gap-2">
                      <Spinner size={13} />
                      {activeTools.length ? "Reading your report…" : "Thinking…"}
                    </span>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </>
          )}
        </div>

        <div className="border-t border-edge p-4">
          {error && <p className="text-[12px] text-rose mb-2">{error}</p>}
          {messages?.length > 0 && (
            <div className="flex gap-2 mb-3 overflow-x-auto pb-0.5">
              {SUGGESTIONS.slice(0, 3).map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  disabled={thinking}
                  className="whitespace-nowrap rounded-full border border-edge px-3 py-1 text-[11px] text-faint hover:text-muted hover:border-edge-strong transition-colors disabled:opacity-50"
                >
                  <Sparkles size={10} className="inline mr-1 -mt-0.5" />
                  {s}
                </button>
              ))}
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask();
            }}
            className="flex gap-2.5"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask anything about ${project.product_name || "this product"}…`}
              className="input-dark flex-1"
              disabled={thinking}
              maxLength={2000}
            />
            <button
              type="submit"
              disabled={thinking || !input.trim()}
              aria-label="Send message"
              className="btn-primary !px-4"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
