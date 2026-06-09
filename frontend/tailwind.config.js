/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-up':   'fade-up 0.3s ease both',
        'fade-in':   'fade-in 0.25s ease both',
        'scale-in':  'scale-in 0.25s ease both',
        'spin-slow': 'spin-slow 1.4s linear infinite',
        'float':     'float 3s ease-in-out infinite',
      },
      keyframes: {
        'fade-up':  { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'fade-in':  { from: { opacity: '0' }, to: { opacity: '1' } },
        'scale-in': { from: { opacity: '0', transform: 'scale(0.95)' }, to: { opacity: '1', transform: 'scale(1)' } },
        'spin-slow':{ to: { transform: 'rotate(360deg)' } },
        'float':    { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-4px)' } },
      },
    },
  },
  plugins: [],
};
