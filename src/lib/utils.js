export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function scoreColor(score) {
  // Matches the `faint` token; kept at AA contrast on the page background.
  if (score == null) return "#7C7C88";
  if (score >= 80) return "#34D399";
  if (score >= 65) return "#22D3EE";
  if (score >= 50) return "#FBBF24";
  return "#FB7185";
}

export function scoreLabel(score) {
  if (score == null) return "—";
  if (score >= 90) return "Exceptional";
  if (score >= 80) return "Excellent";
  if (score >= 70) return "Strong";
  if (score >= 60) return "Good";
  if (score >= 50) return "Average";
  if (score >= 40) return "Weak";
  return "Poor";
}

// Base44 returns timestamps without a timezone marker
// ("2026-07-27T18:58:22.573000"), which JavaScript parses as LOCAL time even
// though the server means UTC. West of UTC that makes recent records look like
// they are in the future, so every relative time collapses to "just now".
// Append the missing Z so the instant is interpreted correctly.
export function parseDate(dateStr) {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;
  const hasZone = /[Zz]$|[+-]\d{2}:?\d{2}$/.test(dateStr);
  const d = new Date(hasZone ? dateStr : `${dateStr}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function timeAgo(dateStr) {
  const date = parseDate(dateStr);
  if (!date) return "";
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return date.toLocaleDateString();
}

export function hostnameOf(url) {
  try {
    return new URL(url.includes("://") ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function normalizeUrl(input) {
  const t = input.trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  if (/^[\w-]+(\.[\w-]+)+([/?#].*)?$/.test(t)) return `https://${t}`;
  return t; // allow plain product names too
}

export function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export const SECTION_ORDER = [
  "business",
  "design",
  "technology",
  "psychology",
  "growth",
  "competitors",
  "innovation",
];

export const SECTION_META = {
  business: { label: "Business", stage: "Mapping the business engine" },
  design: { label: "Design", stage: "Deconstructing the design system" },
  technology: { label: "Technology", stage: "Detecting the technology stack" },
  psychology: { label: "Psychology", stage: "Decoding user psychology" },
  growth: { label: "Growth", stage: "Tracing the growth machine" },
  competitors: { label: "Competitors", stage: "Mapping the competitive field" },
  innovation: { label: "Innovation", stage: "Computing innovation score" },
};
