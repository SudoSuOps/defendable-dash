import type { Config } from "tailwindcss";

// Design tokens mirror defendable-cloud-v2/app (one design system across the surfaces).
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0a0a0a",
        paper: "#e7e5e4",
        honey: {
          50: "#fff8e1",
          100: "#ffeeb0",
          200: "#fde17a",
          300: "#f6c64b",
          400: "#e6ab2a",
          500: "#c8901c",
          600: "#a07418",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
