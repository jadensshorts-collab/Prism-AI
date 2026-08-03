// DEV-ONLY: the strategist's reveal, driven from a captured answer. The real
// chat needs a session and an agent round trip, so this is the only way to
// watch the animation frame by frame.
import { useState } from "react";
import TypedMarkdown from "@/components/ui/TypedMarkdown";
import PrismMark from "@/components/PrismMark";

const ANSWER = `Retention is where **Linear** is quietly strongest, and it's worth
understanding why before touching anything else.

### What's already working

The keyboard-first model creates a *muscle-memory moat*. Once a team internalises
\`Cmd+K\`, switching tools costs them fluency, not just data migration. That is a
far stickier lock-in than an export barrier.

1. Issue creation under two seconds
2. Cycle automation that runs without a manager
3. A changelog that reads like a product, not a release note

### Where the leak actually is

| Stage | Drop-off | Root cause |
| --- | --- | --- |
| Day 1–7 | 34% | Empty workspace, no seeded structure |
| Day 8–30 | 12% | Single-player usage, no team pull |

> The first week is doing almost all the damage.

The fix is not another onboarding checklist — it's making the second teammate
arrive before the first one finishes evaluating.`;

export default function DevTyping() {
  const [run, setRun] = useState(0);
  const [skip, setSkip] = useState(false);

  return (
    <div className="min-h-screen bg-void p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => {
              setSkip(false);
              setRun((r) => r + 1);
            }}
            className="btn-primary !py-1.5 !px-3 text-[12px]"
          >
            Replay
          </button>
          <button onClick={() => setSkip(true)} className="btn-ghost !py-1.5 !px-3 text-[12px]">
            Skip
          </button>
        </div>

        <div className="glass p-6">
          <div className="flex gap-3">
            <PrismMark size={22} className="mt-1 shrink-0" />
            <div className="max-w-[85%] min-w-0">
              <TypedMarkdown key={run} text={ANSWER} animate skip={skip} />
            </div>
          </div>
        </div>

        <div className="glass p-6 mt-5">
          <p className="text-[11px] text-faint mb-3">Not animated (history)</p>
          <div className="flex gap-3">
            <PrismMark size={22} className="mt-1 shrink-0" />
            <div className="max-w-[85%] min-w-0">
              <TypedMarkdown text={ANSWER} animate={false} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
