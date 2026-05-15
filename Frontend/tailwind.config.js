/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Modern Charcoal + Gold palette
        bg: {
          base: "#0C0C0E",
          surface: "#1A1A1F",
          elevated: "#1A1A1F",
          hover: "#24242A",
        },
        accent: {
          primary: "#D4A843",
          hover: "#A07830",
          muted: "rgba(212, 168, 67, 0.12)",
          glow: "rgba(212, 168, 67, 0.15)",
        },
        text: {
          primary: "#F0F0F6",
          secondary: "#A1A1AE",
          tertiary: "#6B6B78",
        },
        status: {
          high: "#EF4444",
          medium: "#F59E0B",
          low: "#D4A843",
          success: "#10B981",
        },
        // Legacy support if needed, but updated to theme
        primary: {
          50: "#fcf9ee",
          100: "#f7f0d4",
          200: "#eee0aa",
          300: "#e1ca76",
          400: "#d4a843", // accent-primary
          500: "#c39336",
          600: "#a07830", // accent-primary-hover
          700: "#865f28",
          800: "#6e4e24",
          900: "#5b4221",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-in-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
