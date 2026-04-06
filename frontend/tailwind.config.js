/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        pixel: ['"Press Start 2P"', "monospace"],
        mono:  ['"IBM Plex Mono"', "monospace"],
      },
      colors: {
        // Dark mode surfaces
        d: {
          bg:      "#0b0b0f",
          surface: "#111117",
          card:    "#16161e",
          border:  "#22222e",
          border2: "#2a2a38",
          muted:   "#3a3a4e",
        },
        // Light mode surfaces
        l: {
          bg:      "#f4f1eb",
          surface: "#ede9e0",
          card:    "#ffffff",
          border:  "#ddd9cf",
          border2: "#c8c4bc",
          muted:   "#9e9a94",
        },
        // Brand accents
        teal:   { DEFAULT: "#00e5a0", dark: "#00b87d", light: "#33ebb3" },
        brick:  { DEFAULT: "#c8614a", dark: "#a04d3a", light: "#d4735e" },
        amber:  { DEFAULT: "#f5a623", dark: "#c8851c", light: "#f7b84e" },
        crimson:{ DEFAULT: "#e05252", dark: "#b83f3f", light: "#e87070" },
      },
      animation: {
        "fade-in":    "fadeIn 0.3s ease forwards",
        "slide-up":   "slideUp 0.3s ease forwards",
        "pixel-glow": "pixelGlow 2s ease-in-out infinite",
        "blink":      "blink 1s step-end infinite",
      },
      keyframes: {
        fadeIn:    { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp:   { from: { opacity: 0, transform: "translateY(12px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        pixelGlow: { "0%,100%": { textShadow: "0 0 8px #c8614a88" }, "50%": { textShadow: "0 0 20px #c8614acc, 0 0 40px #c8614a44" } },
        blink:     { "0%,100%": { opacity: 1 }, "50%": { opacity: 0 } },
      },
    },
  },
  plugins: [],
};
