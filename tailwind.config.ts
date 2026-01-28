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
        // Cores da Jhon Jhon Barbearia
        primary: {
          DEFAULT: "rgb(212, 175, 55)",
          foreground: "rgb(0, 0, 0)",
        },
        background: "rgb(0, 0, 0)",
        foreground: "rgb(255, 255, 255)",
        card: {
          DEFAULT: "rgba(255, 255, 255, 0.05)",
          foreground: "rgb(255, 255, 255)",
        },
        popover: {
          DEFAULT: "rgb(17, 17, 17)",
          foreground: "rgb(255, 255, 255)",
        },
        secondary: {
          DEFAULT: "rgb(51, 51, 51)",
          foreground: "rgb(255, 255, 255)",
        },
        muted: {
          DEFAULT: "rgb(51, 51, 51)",
          foreground: "rgb(170, 170, 170)",
        },
        accent: {
          DEFAULT: "rgb(212, 175, 55)",
          foreground: "rgb(0, 0, 0)",
        },
        destructive: {
          DEFAULT: "rgb(239, 68, 68)",
          foreground: "rgb(255, 255, 255)",
        },
        border: "rgba(255, 255, 255, 0.1)",
        input: "rgba(255, 255, 255, 0.1)",
        ring: "rgb(212, 175, 55)",
        success: "rgb(34, 197, 94)",
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem",
      },
      fontFamily: {
        sans: ["Montserrat", "sans-serif"],
        serif: ["Playfair Display", "serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
