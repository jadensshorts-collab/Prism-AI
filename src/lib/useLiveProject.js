import { useCallback, useEffect, useRef, useState } from "react";
import { Project, ReportSection } from "@/api/base44Client";

// Live project state driven by Base44 realtime entity subscriptions.
//
// The analyze pipeline writes Project progress and ReportSection rows from the
// backend; those writes are broadcast over Base44's realtime channel, so the
// client re-renders the moment a layer lands instead of waiting on a timer.
//
// Realtime payloads are used as *signals* rather than as data: the SDK slims
// broadcasts over ~10 KB, and report sections routinely exceed that. Each event
// therefore triggers a targeted refetch, which keeps the UI truthful.
// A slow heartbeat remains as a safety net if the socket ever drops.
const HEARTBEAT_MS = 15000;

export function useLiveProject(id) {
  const [project, setProject] = useState(null);
  const [sections, setSections] = useState([]);
  const [notFound, setNotFound] = useState(false);
  const [live, setLive] = useState(false);
  const inFlight = useRef(false);
  const pending = useRef(false);

  // Events that land mid-request must not be dropped — the last one is usually
  // the pipeline finishing, and losing it would strand the view on "analyzing"
  // until the heartbeat. Coalesce into a single trailing refresh instead.
  const refresh = useCallback(async () => {
    if (!id) return null;
    if (inFlight.current) {
      pending.current = true;
      return null;
    }
    inFlight.current = true;
    try {
      const [p, secs] = await Promise.all([
        Project.get(id),
        ReportSection.filter({ project_id: id }),
      ]);
      setProject(p);
      setSections(secs);
      return p;
    } catch {
      setNotFound(true);
      return null;
    } finally {
      inFlight.current = false;
      if (pending.current) {
        pending.current = false;
        refresh();
      }
    }
  }, [id]);

  useEffect(() => {
    setProject(null);
    setSections([]);
    setNotFound(false);
    refresh();
  }, [refresh]);

  // Realtime: react to backend writes for this project as they happen.
  useEffect(() => {
    if (!id) return;
    let unsubProject;
    let unsubSections;
    try {
      unsubProject = Project.subscribe((event) => {
        if (event?.id === id) refresh();
      });
      unsubSections = ReportSection.subscribe((event) => {
        const pid = event?.data?.project_id;
        if (!pid || pid === id) refresh();
      });
      setLive(true);
    } catch {
      setLive(false);
    }
    return () => {
      try {
        unsubProject?.();
        unsubSections?.();
      } catch {
        // socket already torn down
      }
      setLive(false);
    };
  }, [id, refresh]);

  // Safety net while work is in flight, in case the socket drops.
  useEffect(() => {
    const working =
      project?.status === "analyzing" || sections.some((s) => s.status === "running");
    if (!working) return;
    const t = setInterval(refresh, HEARTBEAT_MS);
    return () => clearInterval(t);
  }, [project?.status, sections, refresh]);

  return { project, sections, notFound, live, refresh, setProject, setSections };
}
