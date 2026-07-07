import type { Config } from "tailwindcss";

// Lendrock "credit desk" identity — ledger green ink on warm-grey paper,
// bronze for flags/exceptions, oxide red for terminal states.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#1E5C44",
          hover: "#174A37",
          tint: "#E4ECE6",
          tintBorder: "#CBDCD1",
          deep: "#0F3326",
        },
        bronze: {
          DEFAULT: "#8A5A22",
          tint: "#F0E7D8",
        },
        oxide: {
          DEFAULT: "#7A2E2A",
          tint: "#F3E3E1",
        },
        page: "#F4F4EF",
        card: "#FCFBF7",
        ink: "#1A201C",
        body: "#3B443E",
        muted: "#5C655E",
        faint: "#8B948D",
        line: "#DDDBD1",
        line2: "#E8E6DC",
        line3: "#EFEDE4",
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
        serif: ["Iowan Old Style", "Palatino Linotype", "Palatino", "Book Antiqua", "Georgia", "serif"],
        mono: ["ui-monospace", "SF Mono", "Cascadia Code", "Menlo", "Consolas", "monospace"],
      },
      fontSize: {
        "2xs": ["11px", "14px"],
      },
      maxWidth: {
        shell: "1360px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(26, 32, 28, 0.04), 0 1px 1px rgba(26, 32, 28, 0.03)",
        raised: "0 2px 8px rgba(26, 32, 28, 0.08), 0 1px 2px rgba(26, 32, 28, 0.05)",
        deep: "0 12px 40px rgba(15, 51, 38, 0.25)",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "none" },
        },
        slideIn: {
          from: { opacity: "0", transform: "translateX(-4px)" },
          to: { opacity: "1", transform: "none" },
        },
      },
      animation: {
        fadeUp: "fadeUp .18s ease",
        slideIn: "slideIn .15s ease",
      },
    },
  },
  plugins: [],
};

export default config;
