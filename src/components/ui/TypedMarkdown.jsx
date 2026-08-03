import { useEffect, useMemo, useRef, useState } from "react";
import Markdown from "@/components/ui/Markdown";

// Words per second, and the longest we will ever spend on one answer. A short
// reply types at a readable pace; a very long one speeds up rather than making
// somebody sit through half a minute of animation.
const WORDS_PER_SECOND = 55;
const MAX_SECONDS = 4;
// Word-level reveal doesn't need 60fps, and re-parsing markdown on every frame
// is wasted work, so repaints are gated to roughly 30 per second.
const FRAME_MS = 33;

const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;

// A prefix of markdown can end mid-syntax — "**Retention" would render its
// asterisks literally for a frame or two. Closing the open markers keeps the
// text from flickering between raw and formatted as it arrives.
function balance(text) {
  let out = text;
  const fences = (out.match(/```/g) || []).length;
  if (fences % 2) out += "\n```";
  const ticks = (out.replace(/```/g, "").match(/`/g) || []).length;
  if (ticks % 2) out += "`";
  const bolds = (out.match(/\*\*/g) || []).length;
  if (bolds % 2) out += "**";
  return out;
}

export default function TypedMarkdown({ text = "", animate = false, skip = false, onAdvance }) {
  // Cut points land after each word plus its trailing space, so the reveal
  // never splits a word in half.
  const cuts = useMemo(() => {
    const out = [];
    const re = /\S+\s*/g;
    let m;
    while ((m = re.exec(text)) !== null) out.push(m.index + m[0].length);
    return out;
  }, [text]);

  const [shownWords, setShownWords] = useState(() => (animate ? 0 : cuts.length));
  const advanceRef = useRef(onAdvance);
  advanceRef.current = onAdvance;

  useEffect(() => {
    // A hidden tab suspends requestAnimationFrame entirely, so an answer that
    // arrives in the background would still be half-written when the reader
    // came back. Nobody is watching the animation in that case — show the text.
    if (!animate || reducedMotion() || document.hidden) {
      setShownWords(cuts.length);
      return;
    }
    let raf = 0;
    let start = null;
    let lastPaint = 0;
    const rate = Math.max(WORDS_PER_SECOND, cuts.length / MAX_SECONDS);

    const step = (now) => {
      if (start === null) start = now;
      const target = Math.min(cuts.length, Math.floor(((now - start) / 1000) * rate));
      if (now - lastPaint >= FRAME_MS || target >= cuts.length) {
        lastPaint = now;
        setShownWords(target);
        advanceRef.current?.();
      }
      if (target < cuts.length) raf = requestAnimationFrame(step);
    };

    const finish = () => {
      if (document.hidden) setShownWords(cuts.length);
    };
    document.addEventListener("visibilitychange", finish);
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", finish);
    };
  }, [animate, cuts]);

  // Asking a follow-up shouldn't leave the previous answer half-written.
  useEffect(() => {
    if (skip) setShownWords(cuts.length);
  }, [skip, cuts.length]);

  const typing = shownWords < cuts.length;
  const visible = typing ? balance(text.slice(0, cuts[shownWords - 1] ?? 0)) : text;

  return <Markdown className={typing ? "is-typing" : ""}>{visible}</Markdown>;
}
