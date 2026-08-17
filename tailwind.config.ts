import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eefdf6",
          100: "#d6f8e6",
          500: "#0f9d58",
          600: "#0c7f46",
          700: "#0a6538",
        },
      },
    },
  },
  plugins: [],
};

export default config;
