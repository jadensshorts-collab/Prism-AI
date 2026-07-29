import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/lib/useAuth";
import PrismMark from "@/components/PrismMark";
import Landing from "@/pages/Landing.jsx";

// The marketing page is the entry point and stays eager. Everything behind it —
// the workspace, the report renderer, markdown — is split out so a first-time
// visitor doesn't download the whole application to read the landing page.
const Login = lazy(() => import("@/pages/Login.jsx"));
const PublicReport = lazy(() => import("@/pages/PublicReport.jsx"));
const AppLayout = lazy(() => import("@/pages/AppLayout.jsx"));
const Dashboard = lazy(() => import("@/pages/Dashboard.jsx"));
const ProjectPage = lazy(() => import("@/pages/ProjectPage.jsx"));
const Compare = lazy(() => import("@/pages/Compare.jsx"));

// Dev-only visual QA harness — excluded from production builds.
const DevReport = import.meta.env.DEV
  ? lazy(() => import("@/dev/DevReport.jsx").then((m) => ({ default: m.DevReport })))
  : null;
const DevAnalysis = import.meta.env.DEV
  ? lazy(() => import("@/dev/DevReport.jsx").then((m) => ({ default: m.DevAnalysis })))
  : null;
const DevPublic = import.meta.env.DEV
  ? lazy(() => import("@/dev/DevReport.jsx").then((m) => ({ default: m.DevPublic })))
  : null;
const DevEmpty = import.meta.env.DEV ? lazy(() => import("@/dev/DevEmpty.jsx")) : null;
const DevBoom = import.meta.env.DEV ? lazy(() => import("@/dev/DevBoom.jsx")) : null;
const DevDegraded = import.meta.env.DEV ? lazy(() => import("@/dev/DevDegraded.jsx")) : null;
const DevStalled = import.meta.env.DEV ? lazy(() => import("@/dev/DevStalled.jsx")) : null;
const DevGroq = import.meta.env.DEV ? lazy(() => import("@/dev/DevGroq.jsx")) : null;
const DevCompare = import.meta.env.DEV ? lazy(() => import("@/dev/DevCompare.jsx")) : null;
const DevFailed = import.meta.env.DEV ? lazy(() => import("@/dev/DevFailed.jsx")) : null;
const DevDashboard = import.meta.env.DEV ? lazy(() => import("@/dev/DevDashboard.jsx")) : null;

function RouteFallback() {
  return (
    <div className="min-h-screen bg-void flex items-center justify-center">
      <PrismMark size={44} className="animate-pulse-soft" />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/r/:token" element={<PublicReport />} />
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="project/:id" element={<ProjectPage />} />
            <Route path="compare" element={<Compare />} />
          </Route>
          {import.meta.env.DEV && (
            <>
              <Route path="/dev/report" element={<DevReport />} />
              <Route path="/dev/analysis" element={<DevAnalysis />} />
              <Route path="/dev/public" element={<DevPublic />} />
              <Route path="/dev/empty" element={<DevEmpty />} />
              <Route path="/dev/boom" element={<DevBoom />} />
              <Route path="/dev/degraded" element={<DevDegraded />} />
              <Route path="/dev/stalled" element={<DevStalled />} />
              <Route path="/dev/groq" element={<DevGroq />} />
              <Route path="/dev/compare" element={<DevCompare />} />
              <Route path="/dev/failed" element={<DevFailed />} />
              <Route path="/dev/dashboard" element={<DevDashboard />} />
            </>
          )}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}
