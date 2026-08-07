/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        malbec: { DEFAULT: '#6B1E3C', deep: '#4A1329' },
        sun: { DEFAULT: '#E8A33D', soft: '#F2C572' },
        stone: { DEFAULT: '#F3EFE9', dark: '#E4DCCE' },
        ink: { DEFAULT: '#241B1E', soft: '#6B5D5F' },
        paper: '#FFFDFB'
      },
      fontFamily: {
        display: ['Georgia', 'Times New Roman', 'serif']
      }
    },
  },
  plugins: [],
}
