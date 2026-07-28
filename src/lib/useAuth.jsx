import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";

const AuthContext = createContext({ user: null, loading: true });

export function AuthProvider({ children }) {
  const [state, setState] = useState({ user: null, loading: true });

  useEffect(() => {
    let alive = true;
    // createClient() already harvested any token from the OAuth redirect URL
    // into storage, so an empty store means nobody is signed in. Skipping the
    // request keeps public pages fast and free of 401 noise.
    const hasSession =
      typeof window !== "undefined" &&
      Boolean(localStorage.getItem("base44_access_token") || localStorage.getItem("token"));

    if (!hasSession) {
      // The SDK's analytics module runs a heartbeat that re-checks the current
      // user and flushes a batch on a timer. With no session that loop just
      // produces a steady stream of 401s on public pages (landing, shared
      // reports) for telemetry nobody can attribute — so shut it down until
      // the user actually signs in. Sign-in reloads the page, which rebuilds
      // the client with a token and restores tracking.
      try {
        base44.analytics?.cleanup?.();
      } catch {
        // best-effort
      }
      setState({ user: null, loading: false });
      return;
    }

    base44.auth
      .me()
      .then((user) => alive && setState({ user, loading: false }))
      .catch(() => alive && setState({ user: null, loading: false }));
    return () => {
      alive = false;
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

export function signIn() {
  // Custom-site deployments serve the SPA at /login, so Prism hosts its own
  // sign-in page rather than using the SDK's redirectToLogin.
  window.location.href = `/login?from_url=${encodeURIComponent(window.location.href)}`;
}

export function signOut() {
  base44.auth.logout(window.location.origin);
}

// Entering the workspace always passes through sign-in when there is no
// session, landing the user in the workspace itself rather than bouncing them
// back to the marketing page.
export function useEnterWorkspace() {
  const { user } = useAuth();
  const navigate = useNavigate();
  return () => {
    if (user) navigate("/app");
    else navigate(`/login?from_url=${encodeURIComponent("/app")}`);
  };
}
