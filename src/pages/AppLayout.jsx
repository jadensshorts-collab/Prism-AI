import { useEffect } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { LayoutGrid, GitCompareArrows } from "lucide-react";
import PrismMark from "@/components/PrismMark";
import ProfileMenu from "@/components/ProfileMenu";
import Spinner from "@/components/ui/Spinner";
import { useAuth, signIn } from "@/lib/useAuth";
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
          {/* Left group has to be allowed to shrink: at 375px the brand plus two
              labelled nav items measured 322px, which pushed the avatar past the
              right edge of the screen. */}
          <div className="flex items-center gap-4 sm:gap-7 min-w-0">
            {/* The brand mark is the way back out to the marketing homepage. */}
            <Link
              to="/"
              className="flex items-center gap-2.5 shrink-0"
              title="Back to the Prism AI homepage"
            >
              <PrismMark size={24} />
              <span className="font-display font-semibold tracking-tight">Prism AI</span>
            </Link>
            <nav className="flex items-center gap-1 min-w-0">
              {nav.map((n) => {
                const active = n.exact
                  ? location.pathname === n.to
                  : location.pathname.startsWith(n.to);
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    aria-label={n.label}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-[13px] font-medium transition-colors",
                      active
                        ? "text-ink bg-white/[0.07]"
                        : "text-muted hover:text-ink hover:bg-white/[0.04]",
                    )}
                  >
                    <n.icon size={14} />
                    {/* Labels fold away on the narrowest screens; the icons and
                        the aria-label carry the meaning. */}
                    <span className="hidden sm:inline">{n.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
          {/* The avatar opens the account panel, which is where signing out
              now lives — the header keeps one control instead of three. */}
          <div className="shrink-0">
            <ProfileMenu user={user} />
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-5 py-8">
        <Outlet />
      </main>
    </div>
  );
}
