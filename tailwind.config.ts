import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F5F4EF",
        ink: "#1C2531",
        "ink-soft": "#4A5568",
        brass: "#B5883A",
        "brass-dark": "#8F6A28",
        lost: "#B5482F",
        "lost-soft": "#F3E2DB",
        found: "#2F6B63",
        "found-soft": "#DFEBE7",
        line: "#D8D4C8",
      },
      fontFamily: {
        serif: ["var(--font-heading)", "Georgia", "serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        tag: "4px",
      },
    },
  },
  plugins: [],
};

export default config;
