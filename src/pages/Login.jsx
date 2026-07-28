import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, User, ArrowRight, KeyRound, AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/useAuth";
import PrismMark from "@/components/PrismMark";
import Spinner from "@/components/ui/Spinner";

// The app's own login page. Custom-site deployments serve the SPA at /login,
// so Prism provides the sign-in UI itself and drives Base44's auth endpoints:
// Google OAuth via the platform's server-side flow, plus email/password with
// OTP-verified registration.
export default function Login() {
  const { user, loading } = useAuth();
  const [mode, setMode] = useState("signin"); // signin | signup | otp
  const [form, setForm] = useState({ full_name: "", email: "", password: "", otp: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Only allow same-origin redirect targets (no open redirects).
  const fromUrl = useMemo(() => {
    try {
      const raw = new URLSearchParams(window.location.search).get("from_url");
      if (!raw) return "/app";
      const url = new URL(raw, window.location.origin);
      return url.origin === window.location.origin ? url.pathname + url.search + url.hash : "/app";
    } catch {
      return "/app";
    }
  }, []);

  if (!loading && user) return <Navigate to={fromUrl} replace />;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const errText = (e, fallback) =>
    e?.response?.data?.error || e?.response?.data?.detail || e?.message || fallback;

  const finishLogin = () => {
    // Full reload so the auth provider re-initializes with the fresh token.
    window.location.replace(fromUrl);
  };

  const googleLogin = () => {
    setError("");
    base44.auth.loginWithProvider("google", fromUrl);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (mode === "signin") {
        await base44.auth.loginViaEmailPassword(form.email.trim(), form.password);
        finishLogin();
      } else if (mode === "signup") {
        await base44.auth.register({
          email: form.email.trim(),
          password: form.password,
          full_name: form.full_name.trim() || undefined,
        });
        setMode("otp");
        setNotice(`We emailed a verification code to ${form.email.trim()}.`);
      } else if (mode === "otp") {
        await base44.auth.verifyOtp({ email: form.email.trim(), otpCode: form.otp.trim() });
        await base44.auth.loginViaEmailPassword(form.email.trim(), form.password);
        finishLogin();
      }
    } catch (err) {
      setError(
        errText(
          err,
          mode === "signin"
            ? "Sign-in failed — check your email and password."
            : mode === "signup"
              ? "Could not create the account."
              : "Invalid or expired code.",
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setError("");
    try {
      await base44.auth.resendOtp(form.email.trim());
      setNotice(`A new code is on its way to ${form.email.trim()}.`);
    } catch (err) {
      setError(errText(err, "Could not resend the code."));
    }
  };

  return (
    <div className="min-h-screen bg-void relative flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-grid mask-fade-b" />
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[640px] h-[380px] rounded-full opacity-20 blur-[110px]"
        style={{ background: "radial-gradient(ellipse, #8B5CF6, #22D3EE 60%, transparent 80%)" }}
      />
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-sm"
      >
        <div className="text-center mb-7">
          <PrismMark size={42} className="mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold tracking-tight">
            {mode === "signup" ? "Create your account" : mode === "otp" ? "Check your email" : "Welcome to Prism"}
          </h1>
          <p className="text-[13px] text-muted mt-1.5">
            {mode === "otp"
              ? "Enter the 6-digit code to verify your email."
              : "Sign in to reveal the hidden layers behind any product."}
          </p>
        </div>

        <div className="glass p-6">
          {mode !== "otp" && (
            <>
              <button
                onClick={googleLogin}
                className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-white text-[#1f1f1f] font-semibold text-sm py-2.5 transition-transform hover:-translate-y-px"
              >
                <GoogleIcon />
                Continue with Google
              </button>
              <div className="flex items-center gap-3 my-5">
                <div className="h-px flex-1 bg-edge" />
                <span className="text-[11px] text-faint">or with email</span>
                <div className="h-px flex-1 bg-edge" />
              </div>
            </>
          )}

          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <Field icon={User}>
                <input
                  value={form.full_name}
                  onChange={set("full_name")}
                  placeholder="Full name"
                  className="input-dark !pl-10"
                  autoComplete="name"
                />
              </Field>
            )}
            {mode !== "otp" ? (
              <>
                <Field icon={Mail}>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={set("email")}
                    placeholder="you@example.com"
                    className="input-dark !pl-10"
                    autoComplete="email"
                  />
                </Field>
                <Field icon={Lock}>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={form.password}
                    onChange={set("password")}
                    placeholder={mode === "signup" ? "Password (8+ characters)" : "Password"}
                    className="input-dark !pl-10"
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  />
                </Field>
              </>
            ) : (
              <Field icon={KeyRound}>
                <input
                  required
                  value={form.otp}
                  onChange={set("otp")}
                  placeholder="Verification code"
                  className="input-dark !pl-10 tracking-[0.3em] font-mono"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                />
              </Field>
            )}

            {notice && <p className="text-[12px] text-cyan-soft leading-relaxed">{notice}</p>}
            {error && (
              <p className="text-[12px] text-rose leading-relaxed flex items-start gap-1.5">
                <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                {error}
              </p>
            )}

            <button type="submit" disabled={busy} className="btn-primary w-full !py-2.5">
              {busy ? (
                <Spinner size={15} className="text-white" />
              ) : (
                <>
                  {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Verify & continue"}
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {/* py-2.5 keeps these comfortably tappable on touch screens. */}
          <div className="mt-4 pt-3 border-t border-edge text-center text-[12px] text-muted">
            {mode === "signin" && (
              <button
                onClick={() => { setMode("signup"); setError(""); }}
                className="w-full py-2.5 hover:text-ink transition-colors"
              >
                New here? <span className="text-violet-soft font-medium">Create an account</span>
              </button>
            )}
            {mode === "signup" && (
              <button
                onClick={() => { setMode("signin"); setError(""); }}
                className="w-full py-2.5 hover:text-ink transition-colors"
              >
                Already have an account? <span className="text-violet-soft font-medium">Sign in</span>
              </button>
            )}
            {mode === "otp" && (
              <button onClick={resend} className="w-full py-2.5 hover:text-ink transition-colors">
                Didn't get it? <span className="text-violet-soft font-medium">Resend code</span>
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function Field({ icon: Icon, children }) {
  return (
    <div className="relative">
      <Icon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
      {children}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
