/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'pokedex-red': '#c41e3a',
        'pokedex-red-dark': '#9e1730',
        'pokedex-red-light': '#d84a62',
        'pokedex-cream': '#f5f1e8',
        'pokedex-cream-dark': '#e8e2d3',
        'pokedex-charcoal': '#1a1a1a',
        'pokedex-lcd': '#b8d4b0',
        'pokedex-lcd-dark': '#3d5e3a',
        'pokedex-led': '#4ade80',
      },
      fontFamily: {
        display: ['Orbitron', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
        lcd: ['VT323', 'monospace'],
      },
      keyframes: {
        ledPulse: {
          '0%, 100%': {
            opacity: '0.85',
            transform: 'scale(1)',
            boxShadow: '0 0 8px rgba(74, 222, 128, 0.8)',
          },
          '50%': {
            opacity: '1',
            transform: 'scale(1.08)',
            boxShadow: '0 0 12px rgba(74, 222, 128, 0.95)',
          },
        },
      },
      animation: {
        'led-pulse': 'ledPulse 2.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

