import type { Config } from "tailwindcss";

// IBM Carbon Design System tokens (see DESIGN.md).
// White canvas, charcoal ink, one assertive IBM Blue accent, flat-square chrome.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#ffffff",
        ink: {
          DEFAULT: "#161616",
          muted: "#525252",
          subtle: "#8c8c8c",
        },
        surface: {
          1: "#f4f4f4",
          2: "#e0e0e0",
        },
        hairline: {
          DEFAULT: "#e0e0e0",
          strong: "#161616",
        },
        ibm: {
          blue: "#0f62fe",
          "blue-60": "#0043ce",
          "blue-80": "#002d9c",
          "blue-hover": "#0050e6",
        },
        inverse: {
          canvas: "#161616",
          surface: "#262626",
          ink: "#ffffff",
          "ink-muted": "#c6c6c6",
        },
        // Carbon semantic palette — the only chroma beyond IBM Blue.
        success: "#24a148",
        warning: "#f1c21b",
        error: "#da1e28",
        info: "#0f62fe",
      },
      borderRadius: {
        // Carbon commits to flat geometry; nothing rounds past 2px.
        none: "0px",
        xs: "2px",
        sm: "4px",
      },
      fontFamily: {
        sans: ["var(--font-plex-sans)", "Helvetica Neue", "Arial", "sans-serif"],
        mono: ["var(--font-plex-mono)", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        carbon: "0.16px",
      },
    },
  },
  plugins: [],
};

export default config;
