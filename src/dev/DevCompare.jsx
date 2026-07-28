// DEV-ONLY: drives the Compare view's presentation with real captured project
// data, so the head-to-head can be verified without an authenticated session.
import { useMemo, useState } from "react";
import fixture from "./fixture-compare.json";
import ScoreRing from "@/components/ui/ScoreRing";
import PrismMark from "@/components/PrismMark";
import { CompareBody, ProjectSelect } from "@/pages/Compare";

export default function DevCompare() {
  const projects = fixture.projects;
  const [leftId, setLeftId] = useState(projects[0]?.id);
  const [rightId, setRightId] = useState(projects[1]?.id);
  const left = useMemo(() => projects.find((p) => p.id === leftId), [projects, leftId]);
  const right = useMemo(() => projects.find((p) => p.id === rightId), [projects, rightId]);

  return (
    <div className="max-w-5xl mx-auto px-5 py-8">
      <div className="text-center mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Head-to-<span className="spectrum-text">head</span>
        </h1>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 md:gap-6 mb-8">
        <ProjectSelect projects={projects} value={leftId} onChange={setLeftId} exclude={rightId} />
        <div className="w-10 h-10 rounded-full glass flex items-center justify-center">
          <span className="font-display font-bold text-faint text-sm">VS</span>
        </div>
        <ProjectSelect projects={projects} value={rightId} onChange={setRightId} exclude={leftId} />
      </div>
      <CompareBody left={left} right={right} facets={fixture.facets} />
    </div>
  );
}
