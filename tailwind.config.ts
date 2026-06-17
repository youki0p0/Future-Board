import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        makina: {
          bg: "#0a0e14",
          panel: "#121823",
          panel2: "#1a2230",
          line: "#273445",
          accent: "#34e1c4",
          accent2: "#7c5cff",
          danger: "#ff5a7a",
          warn: "#ffce5a",
          muted: "#7d8aa0",
          text: "#e7eefc",
        },
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      keyframes: {
        "dice-roll": {
          "0%": { transform: "rotate(0deg) scale(1)" },
          "50%": { transform: "rotate(180deg) scale(1.25)" },
          "100%": { transform: "rotate(360deg) scale(1)" },
        },
        "pop-in": {
          "0%": { transform: "scale(0.85)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(52,225,196,0.45)" },
          "50%": { boxShadow: "0 0 0 8px rgba(52,225,196,0)" },
        },
      },
      animation: {
        "dice-roll": "dice-roll 0.6s ease-in-out",
        "pop-in": "pop-in 0.25s ease-out",
        "pulse-glow": "pulse-glow 1.8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
