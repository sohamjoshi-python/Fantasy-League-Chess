/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#181C2A', // Deep Blue
        gold: '#FFD700',    // Rich Gold
        white: '#F7F7FA',   // Soft White
        slate: '#6B7280',   // Slate Gray
        purple: '#7C3AED',  // Royal Purple
        'primary-dark': '#131624',
        'gold-dark': '#B89B2B',
        'purple-light': '#A78BFA',
      },
    },
  },
  plugins: [],
} 