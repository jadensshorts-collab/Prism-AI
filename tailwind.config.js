/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        void: "#07070C",
        surface: "#0C0C14",
        raised: "#12121C",
        edge: "rgba(255,255,255,0.08)",
        "edge-strong": "rgba(255,255,255,0.14)",
        ink: "#EDEDF2",
        muted: "#9B9BAD",
        faint: "#62626F",
        violet: { DEFAULT: "#8B5CF6", soft: "#A78BFA" },
        cyan: { DEFAULT: "#22D3EE", soft: "#67E8F9" },
        emerald: { DEFAULT: "#34D399" },
        amber: { DEFAULT: "#FBBF24" },
        rose: { DEFAULT: "#FB7185" },
        blue: { DEFAULT: "#60A5FA" },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Space Grotesk", "Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      animation: {
        "spin-slow": "spin 14s linear infinite",
        shimmer: "shimmer 2.4s linear infinite",
        "pulse-soft": "pulseSoft 2.8s ease-in-out infinite",
        beam: "beam 9s ease-in-out infinite alternate",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.55" },
          "50%": { opacity: "1" },
        },
        beam: {
          "0%": { transform: "rotate(-2deg) translateX(-2%)", opacity: "0.7" },
          "100%": { transform: "rotate(2deg) translateX(2%)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
