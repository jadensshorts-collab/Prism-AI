import { useEffect } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { LayoutGrid, GitCompareArrows, LogOut, ExternalLink } from "lucide-react";
import PrismMark from "@/components/PrismMark";
import Spinner from "@/components/ui/Spinner";
import { useAuth, signIn, signOut } from "@/lib/useAuth";
import { cn } from "@/lib/utils";

export default function AppLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) signIn();
  }, [loading, user]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-void flex flex-col items-center justify-center gap-5">
        <PrismMark size={54} className="animate-pulse-soft" />
        <div className="flex items-center gap-2.5 text-muted text-sm">
          <Spinner size={15} />
          {loading ? "Opening your workspace…" : "Redirecting to secure sign-in…"}
        </div>
      </div>
    );
  }

  const nav = [
    { to: "/app", icon: LayoutGrid, label: "Workspace", exact: true },
    { to: "/app/compare", icon: GitCompareArrows, label: "Compare" },
  ];

  return (
    <div className="min-h-screen bg-void">
      <header className="sticky top-0 z-40 border-b border-edge bg-void/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-7">
            <Link to="/app" className="flex items-center gap-2.5">
              <PrismMark size={24} />
              <span className="font-display font-semibold tracking-tight">Prism AI</span>
            </Link>
            <nav className="flex items-center gap-1">
              {nav.map((n) => {
                const active = n.exact
                  ? location.pathname === n.to
                  : location.pathname.startsWith(n.to);
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
                      active
                        ? "text-ink bg-white/[0.07]"
                        : "text-muted hover:text-ink hover:bg-white/[0.04]",
                    )}
                  >
                    <n.icon size={14} />
                    {n.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-[13px] text-faint hover:text-muted transition-colors hidden sm:flex items-center gap-1">
              <ExternalLink size={12} />
              Site
            </Link>
            <div className="flex items-center gap-2.5 pl-3 border-l border-edge">
              <div className="w-7 h-7 rounded-full spectrum-bar p-[1.5px]">
                <div className="w-full h-full rounded-full bg-raised flex items-center justify-center text-[11px] font-semibold">
                  {(user.full_name || user.email || "?")[0].toUpperCase()}
                </div>
              </div>
              <span className="text-[13px] text-muted hidden md:block max-w-[140px] truncate">
                {user.full_name || user.email}
              </span>
              <button
                onClick={signOut}
                title="Sign out"
                className="text-faint hover:text-rose transition-colors p-1"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-5 py-8">
        <Outlet />
      </main>
    </div>
  );
}
