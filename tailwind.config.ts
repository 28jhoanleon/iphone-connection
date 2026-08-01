import type { Config } from "tailwindcss";

/** Tokens del Doc 00. Sin color de acento: el único color de la página es el del producto. */
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    screens: {
      xs: "375px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
    },
    extend: {
      colors: {
        ink: "#0A0A0A",
        paper: "#FAFAFA",
        surface: "#F1F1F0",
        line: "#DFDEDC",
        mute: "#6E6E73",
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
