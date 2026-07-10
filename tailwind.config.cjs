/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#f9f9ff",
        surface: "#f9f9ff",
        "surface-container": "#e7eefe",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f0f3ff",
        "surface-high": "#e2e8f8",
        "surface-container-high": "#e2e8f8",
        "surface-container-highest": "#dce2f3",
        ink: "#151c27",
        "on-background": "#151c27",
        "on-surface": "#151c27",
        muted: "#464555",
        "on-surface-variant": "#464555",
        outline: "#777587",
        "outline-variant": "#c7c4d8",
        primary: "#4f46e5",
        "primary-bright": "#6366f1",
        "primary-container": "#4f46e5",
        "primary-fixed": "#e2dfff",
        "on-primary": "#ffffff",
        "on-primary-fixed": "#0f0069",
        secondary: "#006c49",
        "secondary-container": "#6cf8bb",
        "secondary-fixed": "#6ffbbe",
        tertiary: "#684000",
        "tertiary-container": "#885500",
        "tertiary-fixed": "#6ffbbe",
        danger: "#ba1a1a",
        error: "#ba1a1a",
        "error-container": "#ffdad6"
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"]
      },
      boxShadow: {
        soft: "0 10px 25px -5px rgba(0, 0, 0, 0.05)",
        glow: "0 16px 40px -16px rgba(107, 56, 212, 0.45)"
      },
      backgroundImage: {
        "ai-gradient": "linear-gradient(135deg, #004cca 0%, #6b38d4 58%, #007f57 100%)"
      }
    }
  },
  plugins: []
};
