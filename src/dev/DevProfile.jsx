// DEV-ONLY: the workspace header with the account panel, rendered from captured
// data. The real header needs a session, so this is the only way to inspect it.
import { Link } from "react-router-dom";
import { LayoutGrid, GitCompareArrows } from "lucide-react";
import fixture from "./fixture-dashboard.json";
import PrismMark from "@/components/PrismMark";
import ProfileMenu from "@/components/ProfileMenu";

const user = {
  ...fixture.user,
  created_date: "2026-07-26T14:02:11.000000",
  is_verified: true,
  role: "admin",
};

// Stands in for the UserProfile entity so the picker's full save path runs
// without a session. `window.__devProfileRows` lets a check inspect what was
// actually written, and `window.__devProfileFail` forces the failure branch.
window.__devProfileRows = [];
const profileStore = {
  read: async () => window.__devProfileRows,
  create: async (data) => {
    if (window.__devProfileFail) throw new Error("Storage is unavailable.");
    const created = { id: "dev-profile-1", ...data };
    window.__devProfileRows = [created];
    return created;
  },
  update: async (id, data) => {
    if (window.__devProfileFail) throw new Error("Storage is unavailable.");
    window.__devProfileRows = [{ id, ...data }];
    return window.__devProfileRows[0];
  },
};

export default function DevProfile() {
  return (
    <div className="min-h-screen bg-void">
      <header className="sticky top-0 z-40 border-b border-edge bg-void/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4 sm:gap-7 min-w-0">
            <Link to="/" className="flex items-center gap-2.5 shrink-0">
              <PrismMark size={24} />
              <span className="font-display font-semibold tracking-tight">Prism AI</span>
            </Link>
            <nav className="flex items-center gap-1 min-w-0">
              {[
                { icon: LayoutGrid, label: "Workspace", active: true },
                { icon: GitCompareArrows, label: "Compare" },
              ].map((n) => (
                <span
                  key={n.label}
                  className={
                    "flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-[13px] font-medium " +
                    (n.active ? "text-ink bg-white/[0.07]" : "text-muted")
                  }
                >
                  <n.icon size={14} />
                  <span className="hidden sm:inline">{n.label}</span>
                </span>
              ))}
            </nav>
          </div>
          <div className="shrink-0">
            <ProfileMenu
              user={user}
              fetchProjects={() => Promise.resolve(fixture.projects)}
              profileStore={profileStore}
            />
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-5 py-8">
        <p className="text-muted text-sm">Click the avatar, top right.</p>
      </main>
    </div>
  );
}
