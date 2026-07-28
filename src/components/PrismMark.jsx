import { cn } from "@/lib/utils";

// The Prism brand mark: a triangle refracting light into a spectrum.
export default function PrismMark({ size = 28, className, beam = false }) {
  const id = beam ? "pmg-beam" : "pmg";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id={id} x1="4" y1="28" x2="28" y2="6" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8B5CF6" />
          <stop offset="0.5" stopColor="#22D3EE" />
          <stop offset="1" stopColor="#34D399" />
        </linearGradient>
      </defs>
      <path
        d="M16 4L29 26H3L16 4Z"
        stroke={`url(#${id})`}
        strokeWidth="2.4"
        strokeLinejoin="round"
        fill="rgba(139,92,246,0.10)"
      />
      <path d="M16 4L16 26" stroke={`url(#${id})`} strokeWidth="1.2" opacity="0.55" />
    </svg>
  );
}
