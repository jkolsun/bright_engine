import type { Config } from 'tailwindcss'

const config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
      },
      colors: {
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
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "cta-glow": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(59, 130, 246, 0.4), 0 0 60px rgba(59, 130, 246, 0.1)" },
          "50%": { boxShadow: "0 0 30px rgba(59, 130, 246, 0.6), 0 0 80px rgba(59, 130, 246, 0.2)" },
        },
        "cta-glow-teal": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(20, 184, 166, 0.4), 0 0 60px rgba(20, 184, 166, 0.1)" },
          "50%": { boxShadow: "0 0 30px rgba(20, 184, 166, 0.6), 0 0 80px rgba(20, 184, 166, 0.2)" },
        },
        "cta-glow-amber": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(245, 158, 11, 0.4), 0 0 60px rgba(245, 158, 11, 0.1)" },
          "50%": { boxShadow: "0 0 30px rgba(245, 158, 11, 0.6), 0 0 80px rgba(245, 158, 11, 0.2)" },
        },
        "cta-glow-orange": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(249, 115, 22, 0.4), 0 0 60px rgba(249, 115, 22, 0.1)" },
          "50%": { boxShadow: "0 0 30px rgba(249, 115, 22, 0.6), 0 0 80px rgba(249, 115, 22, 0.2)" },
        },
        "cta-glow-violet": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(139, 92, 246, 0.4), 0 0 60px rgba(139, 92, 246, 0.1)" },
          "50%": { boxShadow: "0 0 30px rgba(139, 92, 246, 0.6), 0 0 80px rgba(139, 92, 246, 0.2)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(30px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "gradient-x": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "bounce-gentle": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "cta-glow": "cta-glow 2.5s ease-in-out infinite",
        "cta-glow-teal": "cta-glow-teal 2.5s ease-in-out infinite",
        "cta-glow-amber": "cta-glow-amber 2.5s ease-in-out infinite",
        "cta-glow-orange": "cta-glow-orange 2.5s ease-in-out infinite",
        "cta-glow-violet": "cta-glow-violet 2.5s ease-in-out infinite",
        "float": "float 3s ease-in-out infinite",
        "fade-in-up": "fade-in-up 0.6s ease-out forwards",
        "gradient-x": "gradient-x 3s ease infinite",
        "shimmer": "shimmer 2s linear infinite",
        "bounce-gentle": "bounce-gentle 2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
