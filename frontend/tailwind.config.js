/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f0f4ff',
          100: '#e0e9ff',
          200: '#c1d3fe',
          300: '#93b4fd',
          400: '#6090fa',
          500: '#3b6ef6',
          600: '#2451eb',
          700: '#1c3fd8',
          800: '#1e35af',
          900: '#1e308a',
          950: '#161f57',
        },
      },
    },
  },
  plugins: [],
}
