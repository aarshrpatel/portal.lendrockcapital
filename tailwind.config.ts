import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Setu brand (teal) + neutral scaffold lifted from the prototype
        brand: {
          DEFAULT: "#0e5b54",
          hover: "#0a4a44",
          tint: "#e6f2f0",
          tintBorder: "#cfe7e3",
        },
        page: "#f5f6f7",
        ink: "#1a1f24",
        body: "#3a424a",
        muted: "#7b848c",
        faint: "#9aa1a8",
        line: "#e7e9eb",
        line2: "#eef0f1",
        line3: "#f1f3f4",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
        guj: ["var(--font-guj)", "system-ui", "sans-serif"],
      },
      maxWidth: {
        shell: "1320px",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "none" },
        },
      },
      animation: {
        fadeUp: "fadeUp .14s ease",
      },
    },
  },
  plugins: [],
};

export default config;
