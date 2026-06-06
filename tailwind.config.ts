import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#0a0a0b",
          surface: "#111113",
          raised: "#1a1a1f",
          highlight: "#22222a",
        },
        border: {
          DEFAULT: "#2a2a35",
          active: "#4a4a60",
        },
        text: {
          primary: "#e8e8f0",
          secondary: "#8888a0",
          muted: "#55556a",
        },
        accent: {
          blue: "#4f8ef7",
          green: "#22c55e",
          amber: "#f59e0b",
          red: "#ef4444",
          purple: "#a78bfa",
        },
      },
      fontFamily: {
        mono: ["var(--font-plex-mono)", "ui-monospace", "monospace"],
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
