import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";

const AuthContext = createContext({ user: null, loading: true });

export function AuthProvider({ children }) {
  const [state, setState] = useState({ user: null, loading: true });

  useEffect(() => {
    let alive = true;

    // Always ask the server who we are. A returning visitor is often
    // authenticated by an HTTP-only cookie with nothing in localStorage, so
    // checking storage alone would sign them out every time they came back.
    base44.auth
      .me()
      .then((user) => {
        if (alive) setState({ user, loading: false });
      })
      .catch(() => {
        if (!alive) return;
        // Nobody is signed in. The SDK's analytics module polls the current
        // user on a timer, which would otherwise emit a steady stream of 401s
        // on public pages, so stop it until a session exists.
        try {
          base44.analytics?.cleanup?.();
        } catch {
          // best-effort
        }
        setState({ user: null, loading: false });
      });

    return () => {
      alive = false;
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

export function signIn(nextUrl) {
  const target = nextUrl || window.location.pathname + window.location.search;
  window.location.href = `/login?from_url=${encodeURIComponent(target)}`;
}

// Signing out always lands on the marketing homepage.
export function signOut() {
  try {
    localStorage.removeItem("base44_access_token");
    localStorage.removeItem("token");
  } catch {
    // storage may be unavailable; the server logout still clears the cookie
  }
  base44.auth.logout(window.location.origin + "/");
}

// Entering the workspace passes through sign-in when there is no session, so
// the user lands in the workspace itself rather than back on the homepage.
export function useEnterWorkspace() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  return () => {
    if (user) navigate("/app");
    else if (loading) navigate("/app"); // AppLayout resolves auth and redirects if needed
    else navigate(`/login?from_url=${encodeURIComponent("/app")}`);
  };
}
