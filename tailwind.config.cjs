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
        background: "#f8f9ff",
        surface: "#f8f9ff",
        "surface-container": "#e5eeff",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#eff4ff",
        "surface-high": "#dce9ff",
        "surface-container-high": "#dce9ff",
        "surface-container-highest": "#d3e4fe",
        ink: "#0b1c30",
        "on-background": "#0b1c30",
        "on-surface": "#0b1c30",
        muted: "#424656",
        "on-surface-variant": "#424656",
        outline: "#737687",
        "outline-variant": "#c2c6d9",
        primary: "#004cca",
        "primary-bright": "#0062ff",
        "primary-container": "#0062ff",
        "primary-fixed": "#dbe1ff",
        "on-primary": "#ffffff",
        "on-primary-fixed": "#00174b",
        secondary: "#6b38d4",
        "secondary-container": "#8455ef",
        "secondary-fixed": "#e9ddff",
        tertiary: "#007f57",
        "tertiary-container": "#007f57",
        "tertiary-fixed": "#6ffbbe",
        danger: "#ba1a1a",
        error: "#ba1a1a",
        "error-container": "#ffdad6"
      },
      fontFamily: {
        sans: ["Be Vietnam Pro", "Inter", "system-ui", "sans-serif"]
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
