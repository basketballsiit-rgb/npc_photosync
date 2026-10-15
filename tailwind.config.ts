import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        cosmic: {
          950: "#090514", // Deepest midnight plum/violet
          900: "#0F0728", // Deep cosmic background
          850: "#140A34", // Elevated surfaces
          800: "#1A0D42", // Card backgrounds
          750: "#221256", // Card hover
          700: "#2E186E", // Prominent borders
          600: "#49269E",
          500: "#7C3AED", // Vibrant violet accent
          400: "#A855F7",
          300: "#C084FC",
          200: "#DDD6FE",
          100: "#EDE9FE",
        },
        neon: {
          pink: "#F43F5E",
          coral: "#FB7185",
          orange: "#F97316",
          amber: "#F59E0B",
          purple: "#A855F7",
          fuchsia: "#D946EF",
          cyan: "#06B6D4",
          blue: "#3B82F6",
        },
        npc: {
          navy: {
            DEFAULT: "#0F0728",
            dark: "#090514",
            light: "#1A0D42",
            card: "#140A34",
          },
          cyan: {
            DEFAULT: "#06B6D4",
            light: "#22D3EE",
            dark: "#0891B2",
            glow: "rgba(6, 182, 212, 0.35)",
          },
          amber: {
            DEFAULT: "#F59E0B",
            light: "#FBBF24",
          },
          emerald: {
            DEFAULT: "#10B981",
            light: "#34D399",
          },
        },
      },
      boxShadow: {
        "glow-pink": "0 0 25px -4px rgba(244, 63, 94, 0.4)",
        "glow-purple": "0 0 25px -4px rgba(168, 85, 247, 0.4)",
        "glow-cyan": "0 0 25px -4px rgba(6, 182, 212, 0.4)",
        "cosmic-card": "0 10px 30px -10px rgba(15, 7, 40, 0.8)",
      },
      fontFamily: {
        sans: ["var(--font-kanit)", "Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
