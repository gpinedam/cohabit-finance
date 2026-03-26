/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
        },
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%':       { transform: 'translateX(-8px)' },
          '40%':       { transform: 'translateX(8px)' },
          '60%':       { transform: 'translateX(-6px)' },
          '80%':       { transform: 'translateX(6px)' },
        },
        'slide-up': {
          '0%':   { transform: 'translateY(14px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        shake:      'shake 0.4s ease-in-out',
        'slide-up': 'slide-up 0.28s cubic-bezier(0.16,1,0.3,1)',
        'fade-in':  'fade-in 0.2s ease-out',
      },
    },
  },
  plugins: [],
}
