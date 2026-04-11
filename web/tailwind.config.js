/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#06060e',
          900: '#0d0d1a',
          800: '#12122a',
          700: '#191935',
          600: '#212150',
          500: '#2c2c6e',
        },
      },
      fontFamily: {
        reading: ['Georgia', 'Cambria', '"Times New Roman"', 'serif'],
      },
      animation: {
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
