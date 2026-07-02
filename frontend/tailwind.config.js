
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand color replaces the default purple/violet palettes app-wide
        // (see task: "Replace all the purple with #1C69A0") -- both keys
        // point at the same scale so bg-purple-600/bg-violet-600 etc. all
        // resolve to the brand blue instead of Tailwind's stock purple.
        purple: {
          50: "#F1F6F9",
          100: "#DDE9F1",
          200: "#B6CFE1",
          300: "#8EB4D0",
          350: "#77A5C6",
          400: "#5C93BB",
          500: "#3378AA",
          600: "#1C69A0",
          650: "#195F90",
          700: "#16527D",
        },
        violet: {
          50: "#F1F6F9",
          100: "#DDE9F1",
          200: "#B6CFE1",
          300: "#8EB4D0",
          350: "#77A5C6",
          400: "#5C93BB",
          500: "#3378AA",
          600: "#1C69A0",
          650: "#195F90",
          700: "#16527D",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
}
