import type { Config } from "tailwindcss";

/** Tokens del Doc 00. Sin color de acento: el único color de la página es el del producto. */
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0A0A0A",
        paper: "#FAFAFA",
        surface: "#F1F1F0",
        line: "#DFDEDC",
        mute: "#86868B",
      },
      fontFamily: {
        sans: ["Instrument Sans", "system-ui", "sans-serif"],
        data: ["JetBrains Mono", "monospace"],
      },
      maxWidth: { site: "1180px" },
      letterSpacing: { tightest: "-.045em" },
    },
  },
  plugins: [],
} satisfies Config;
