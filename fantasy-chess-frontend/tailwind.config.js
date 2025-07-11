/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#F7FAFC', // Very light gray, almost white
        accent: '#007BFF',  // Modern blue
        white: '#F7F7FA',   // Soft White (keeping as is)
        'neutral-100': '#F3F4F6', // Light neutral gray
        'neutral-500': '#6B7280', // Medium neutral gray
        'neutral-900': '#1F2937', // Dark neutral gray
        gold: '#FFD700',
        silver: '#C0C0C0',
        royalBlue: '#4F7FFB',
        purple: '#8B5CF6', // Pawn Royale purple
        slate: '#64748B', // Pawn Royale slate
      },
    },
  },
  plugins: [],
} 