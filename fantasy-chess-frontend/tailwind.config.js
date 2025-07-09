/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: '#E6B84A', // Pawn Royale gold
        navy: '#101426', // Pawn Royale navy
        // Optionally, add lighter/darker shades if needed
        'gold-light': '#F5D88C',
        'navy-dark': '#0A0D18',
      },
    },
  },
  plugins: [],
} 