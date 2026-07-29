import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutGrid,
  GitCompareArrows,
  LogOut,
  ShieldCheck,
  Globe,
  Camera,
  Upload,
  Trash2,
  Check,
  AlertTriangle,
} from "lucide-react";
import { Project, UserProfile } from "@/api/base44Client";
import { signOut } from "@/lib/useAuth";
import PrismMark from "@/components/PrismMark";
import Avatar from "@/components/Avatar";
import Spinner from "@/components/ui/Spinner";
import { parseDate, cn } from "@/lib/utils";
import { AVATAR_PRESETS, fileToAvatar } from "@/lib/avatar";

// The account panel behind the avatar. Everything here is real: the identity
// fields come from the session, and the counters are computed from the user's
// own project rows — a plain database read, nothing generated.
export default function ProfileMenu({ user, fetchProjects, profileStore }) {
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState(false);
  const [picking, setPicking] = useState(false);
  const [avatar, setAvatar] = useState(null);
  const [row, setRow] = useState(null);
  const [saving, setSaving] = useState("");
  const [avatarError, setAvatarError] = useState("");
  const triggerRef = useRef(null);
  const fileRef = useRef(null);
  const wasOpen = useRef(false);

  const load = fetchProjects || (() => Project.list("-created_date", 200));
  const store = profileStore || {
    read: () => UserProfile.list("-created_date", 1),
    create: (data) => UserProfile.create(data),
    update: (id, data) => UserProfile.update(id, data),
  };

  // The header avatar is visible on every workspace page, so its picture has
  // to resolve on mount rather than waiting for the panel to be opened.
  useEffect(() => {
    let alive = true;
    Promise.resolve(store.read())
      .then((rows) => {
        if (!alive) return;
        setRow(rows?.[0] || null);
        setAvatar(rows?.[0]?.avatar || "");
      })
      .catch(() => {
        // No profile row yet, or it couldn't be read — fall back to the initial.
        if (alive) setAvatar("");
      });
    return () => {
      alive = false;
    };
  }, []);

  const saveAvatar = async (value, key) => {
    setSaving(key);
    setAvatarError("");
    const previous = avatar;
    setAvatar(value); // optimistic: the picture should land the instant it's chosen
    try {
      if (row) await store.update(row.id, { avatar: value });
      else {
        const created = await store.create({ avatar: value });
        setRow(created);
      }
      setPicking(false);
    } catch (e) {
      setAvatar(previous);
      setAvatarError(e?.response?.data?.error || e?.message || "That picture couldn't be saved.");
    } finally {
      setSaving("");
    }
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // let the same file be re-picked after a failure
    if (!file) return;
    setAvatarError("");
    setSaving("upload");
    try {
      const uri = await fileToAvatar(file);
      await saveAvatar(uri, "upload");
    } catch (err) {
      setAvatarError(err.message);
      setSaving("");
    }
  };

  // Counting analyses is only worth a round trip once the panel is actually
  // opened, and only once per session after that.
  useEffect(() => {
    if (!open || stats || statsError) return;
    let alive = true;
    Promise.resolve(load())
      .then((projects) => {
        if (!alive) return;
        const complete = projects.filter((p) => p.status === "complete");
        const scores = complete.map((p) => p.innovation_score).filter((s) => s != null);
        setStats({
          total: projects.length,
          complete: complete.length,
          shared: projects.filter((p) => p.is_public).length,
          avg: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
        });
      })
      .catch(() => {
        if (alive) setStatsError(true);
      });
    return () => {
      alive = false;
    };
  }, [open, stats, statsError]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Closing unmounts whatever held focus, which would drop the caret back to
  // the document and restart tabbing from the top of the page.
  useEffect(() => {
    if (wasOpen.current && !open) triggerRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  const name = user.full_name || user.email;
  const initial = (user.full_name || user.email || "?")[0].toUpperCase();
  const joined = parseDate(user.created_date);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Account: ${name}`}
        className="flex items-center gap-2.5 rounded-full pl-[3px] pr-1 py-[3px] -my-[3px] transition-colors hover:bg-white/[0.06]"
      >
        <Avatar avatar={avatar} initial={initial} size={28} />
        <span className="text-[13px] text-muted hidden md:block max-w-[140px] truncate">{name}</span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              role="dialog"
              aria-label="Your profile"
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.16 }}
              // Never wider than the screen it opens on, however narrow that is.
              className="absolute right-0 top-full mt-2.5 w-[19rem] max-w-[calc(100vw-1.5rem)] glass !bg-raised z-50 shadow-2xl overflow-hidden"
            >
              <div className="relative p-5 pb-4">
                <div
                  aria-hidden="true"
                  className="absolute -top-24 -right-10 w-56 h-40 rounded-full opacity-[0.18] blur-[70px]"
                  style={{ background: "radial-gradient(ellipse, #8B5CF6, #22D3EE 65%, transparent 80%)" }}
                />
                <div className="relative flex items-center gap-3.5">
                  <button
                    onClick={() => {
                      setPicking((v) => !v);
                      setAvatarError("");
                    }}
                    aria-expanded={picking}
                    aria-label="Change your profile picture"
                    className="relative group/av rounded-full shrink-0"
                  >
                    <Avatar avatar={avatar} initial={initial} size={48} ringWidth={2} />
                    <span className="absolute inset-0 rounded-full bg-black/55 flex items-center justify-center opacity-0 group-hover/av:opacity-100 group-focus-visible/av:opacity-100 transition-opacity">
                      <Camera size={16} />
                    </span>
                  </button>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-semibold text-[15px] truncate">{name}</h3>
                      {user.is_verified && (
                        <ShieldCheck size={13} className="text-emerald shrink-0" aria-label="Verified email" />
                      )}
                    </div>
                    <p className="text-[12px] text-muted truncate mt-0.5">{user.email}</p>
                  </div>
                </div>
                <p className="relative text-[11.5px] text-muted mt-3.5">
                  {joined
                    ? `Member since ${joined.toLocaleDateString(undefined, { month: "long", year: "numeric" })}`
                    : "Prism AI account"}
                  {user.role === "admin" && " · Workspace owner"}
                </p>

                <AnimatePresence initial={false}>
                  {picking && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.18 }}
                      className="relative overflow-hidden"
                    >
                      <div className="pt-4">
                        <p className="text-[11px] text-muted mb-2">Pick a colour</p>
                        <div className="flex flex-wrap gap-2">
                          {AVATAR_PRESETS.map((p) => {
                            const value = `preset:${p.id}`;
                            const active = avatar === value;
                            return (
                              <button
                                key={p.id}
                                onClick={() => saveAvatar(value, p.id)}
                                disabled={Boolean(saving)}
                                aria-label={p.label}
                                aria-pressed={active}
                                className={cn(
                                  "w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110 disabled:opacity-50",
                                  active && "ring-2 ring-white/70 ring-offset-2 ring-offset-raised",
                                )}
                                style={{ background: p.css }}
                              >
                                {saving === p.id ? (
                                  <Spinner size={12} className="text-white" />
                                ) : active ? (
                                  <Check size={13} className="text-white" />
                                ) : null}
                              </button>
                            );
                          })}
                        </div>

                        <div className="flex items-center gap-2 mt-3.5">
                          <input
                            ref={fileRef}
                            type="file"
                            accept="image/*"
                            onChange={onFile}
                            className="hidden"
                          />
                          <button
                            onClick={() => fileRef.current?.click()}
                            disabled={Boolean(saving)}
                            className="btn-ghost !py-1.5 !px-3 text-[12px] disabled:opacity-50"
                          >
                            {saving === "upload" ? <Spinner size={12} /> : <Upload size={12} />}
                            Upload a picture
                          </button>
                          {avatar && (
                            <button
                              onClick={() => saveAvatar("", "remove")}
                              disabled={Boolean(saving)}
                              aria-label="Remove profile picture"
                              className="btn-ghost !py-1.5 !px-2.5 text-[12px] hover:!text-rose disabled:opacity-50"
                            >
                              {saving === "remove" ? <Spinner size={12} /> : <Trash2 size={12} />}
                            </button>
                          )}
                        </div>

                        {avatarError ? (
                          <p className="text-[11px] text-rose mt-2.5 flex items-start gap-1.5">
                            <AlertTriangle size={11} className="mt-0.5 shrink-0" />
                            {avatarError}
                          </p>
                        ) : (
                          <p className="text-[11px] text-muted mt-2.5">
                            Pictures are squared and shrunk in your browser before saving.
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="px-5 pb-4">
                {statsError ? (
                  <p className="text-[12px] text-muted">Your analyses couldn't be counted just now.</p>
                ) : !stats ? (
                  <div className="flex items-center gap-2 text-[12px] text-muted py-2">
                    <Spinner size={13} /> Counting your analyses…
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Products analyzed", value: stats.total },
                      { label: "Reports complete", value: stats.complete },
                      { label: "Public links", value: stats.shared, icon: Globe },
                      { label: "Avg. innovation", value: stats.avg ?? "—", prism: true },
                    ].map((s) => (
                      <div key={s.label} className="rounded-xl border border-edge bg-white/[0.03] px-3 py-2.5">
                        <div className="flex items-center gap-1.5 text-violet-soft">
                          {s.prism ? <PrismMark size={12} /> : s.icon ? <s.icon size={12} /> : null}
                          <span className="font-display text-lg font-bold tabular-nums leading-none text-ink">
                            {s.value}
                          </span>
                        </div>
                        <div className="text-[10.5px] text-muted mt-1.5">{s.label}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-edge p-2">
                {[
                  { to: "/app", icon: LayoutGrid, label: "Workspace" },
                  { to: "/app/compare", icon: GitCompareArrows, label: "Compare products" },
                ].map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-muted hover:text-ink hover:bg-white/[0.05] transition-colors"
                  >
                    <l.icon size={14} />
                    {l.label}
                  </Link>
                ))}
                <button
                  onClick={signOut}
                  className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-muted hover:text-rose hover:bg-rose/10 transition-colors"
                >
                  <LogOut size={14} />
                  Sign out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
