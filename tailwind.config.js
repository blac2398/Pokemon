/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Oswald', 'system-ui', 'sans-serif'],
        lcd: ['VT323', 'monospace'],
      },
    },
  },
  plugins: [],
}

