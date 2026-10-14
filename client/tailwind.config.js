/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Manrope', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'] },
      colors: {
        navy: { 950: '#080B18', 900: '#0E1325', 800: '#151B35', 700: '#1E2647', 600: '#2A3460' },
        brand: { 50: '#F5F2FF', 100: '#ECE6FF', 200: '#D9CDFF', 300: '#BBA6FF', 400: '#9A79FF', 500: '#7C4DFF', 600: '#6A38F5', 700: '#5A2BD9', 800: '#4A25AE', 900: '#3B2188' },
        surface: '#F6F7FB',
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,42,.04), 0 1px 3px rgba(15,23,42,.06)',
        pop: '0 12px 32px -8px rgba(15,23,42,.18), 0 2px 6px rgba(15,23,42,.06)',
        hero: '0 40px 80px -24px rgba(58,33,136,.45), 0 8px 24px -8px rgba(15,23,42,.25)',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        popIn: { from: { opacity: 0, transform: 'translateY(6px) scale(.98)' }, to: { opacity: 1, transform: 'none' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: { fadeIn: 'fadeIn .15s ease-out', popIn: 'popIn .16s ease-out' },
    },
  },
  plugins: [],
};
