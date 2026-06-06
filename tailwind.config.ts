import type { Config } from "tailwindcss";

// IBM Carbon Design System tokens (see DESIGN.md).
// Carbon Gray 100 dark theme: near-black canvas, light ink, one assertive
// IBM Blue accent, flat-square chrome. Structural tokens resolve through CSS
// custom properties (app/globals.css) so the whole surface flips in one place.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "var(--canvas)",
        ink: {
          DEFAULT: "var(--ink)",
          muted: "var(--ink-muted)",
          subtle: "var(--ink-subtle)",
        },
        surface: {
          1: "var(--surface-1)",
          2: "var(--surface-2)",
        },
        hairline: {
          DEFAULT: "var(--hairline)",
          strong: "var(--hairline-strong)",
        },
        ibm: {
          blue: "var(--ibm-blue)",
          "blue-60": "var(--ibm-blue-60)",
          "blue-80": "var(--ibm-blue-80)",
          "blue-hover": "var(--ibm-blue-hover)",
        },
        inverse: {
          canvas: "#ffffff",
          surface: "#f4f4f4",
          ink: "#161616",
          "ink-muted": "#525252",
        },
        // Carbon semantic palette — Gray 100 brightens these for dark legibility.
        success: "#42be65",
        warning: "#f1c21b",
        error: "#fa4d56",
        info: "#4589ff",
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
