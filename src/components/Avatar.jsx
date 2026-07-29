import { parseAvatar } from "@/lib/avatar";
import { cn } from "@/lib/utils";

// One avatar, three ways: an uploaded picture, a chosen gradient, or the
// initial we have always fallen back to. The gradient ring is the constant.
export default function Avatar({ avatar, initial, size = 28, className, ringWidth = 1.5 }) {
  const a = parseAvatar(avatar);
  return (
    <span
      className={cn("rounded-full spectrum-bar shrink-0 block", className)}
      style={{ width: size, height: size, padding: ringWidth }}
    >
      <span
        aria-hidden="true"
        className="w-full h-full rounded-full bg-raised flex items-center justify-center overflow-hidden font-semibold"
        style={{ fontSize: Math.max(10, Math.round(size * 0.38)) }}
      >
        {a.kind === "image" ? (
          <img src={a.src} alt="" className="w-full h-full object-cover" />
        ) : a.kind === "preset" ? (
          <span className="w-full h-full" style={{ background: a.preset.css }} />
        ) : (
          initial
        )}
      </span>
    </span>
  );
}
