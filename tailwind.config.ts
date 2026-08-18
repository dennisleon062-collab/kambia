import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#14170f",
        paper: "#f6f6f2",
        lime: {
          DEFAULT: "#a8e02a",
          dark: "#7a9a20",
        },
        amber: {
          bg: "#fdf6e3",
          text: "#6b5210",
          icon: "#f0d089",
        },
        rust: "#a33b1f",
        // alias de compatibilidad para no reescribir cada clase brand-* existente
        brand: {
          50: "#fdf6e3",
          100: "#eef2e2",
          500: "#a8e02a",
          600: "#14170f",
          700: "#4b6b1f",
        },
      },
      fontFamily: {
        display: ["'Bricolage Grotesque'", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
