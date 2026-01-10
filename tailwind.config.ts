import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Cores da Jhon Jhon Barbearia (Premium Gold & Deep Black)
        primary: {
          DEFAULT: "rgb(212, 175, 55)",
          foreground: "rgb(0, 0, 0)",
          light: "rgb(232, 205, 125)",
          dark: "rgb(168, 135, 40)",
        },
        gold: {
          50: "#fcfaf2",
          100: "#f7f1de",
          200: "#eee1bc",
          300: "#dfc78f",
          400: "#d3ae5f",
          500: "#d4af37", // Base Gold
          600: "#b48e2b",
          700: "#8e6c24",
          800: "#755823",
          900: "#634b22",
          950: "#392a11",
        },
        background: "rgb(5, 5, 5)", // Slightly off-black for depth
        foreground: "rgb(255, 255, 255)",
        card: {
          DEFAULT: "rgba(255, 255, 255, 0.03)",
          foreground: "rgb(255, 255, 255)",
        },
        popover: {
          DEFAULT: "rgb(12, 12, 12)",
          foreground: "rgb(255, 255, 255)",
        },
        secondary: {
          DEFAULT: "rgba(212, 175, 55, 0.1)",
          foreground: "rgb(212, 175, 55)",
        },
        muted: {
          DEFAULT: "rgb(24, 24, 24)",
          foreground: "rgb(160, 160, 160)",
        },
        accent: {
          DEFAULT: "rgb(212, 175, 55)",
          foreground: "rgb(0, 0, 0)",
        },
        destructive: {
          DEFAULT: "rgb(239, 68, 68)",
          foreground: "rgb(255, 255, 255)",
        },
        border: "rgba(255, 255, 255, 0.08)",
        input: "rgba(255, 255, 255, 0.08)",
        ring: "rgb(212, 175, 55)",
        success: "rgb(34, 197, 94)",
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.25rem",
      },
      fontFamily: {
        sans: ["Montserrat", "sans-serif"],
        serif: ["Playfair Display", "serif"],
      },
      backgroundImage: {
        "gold-gradient": "linear-gradient(135deg, #d4af37 0%, #f7f1de 50%, #b48e2b 100%)",
        "dark-gradient": "linear-gradient(180deg, rgba(12, 12, 12, 0) 0%, rgba(5, 5, 5, 1) 100%)",
      },
      boxShadow: {
        "gold-glow": "0 0 20px rgba(212, 175, 55, 0.2)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
