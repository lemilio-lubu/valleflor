/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"DM Serif Display"', 'Georgia', 'serif'],
        mono: ['"DM Mono"', 'monospace'],
        sans: ['"DM Sans"', 'sans-serif'],
      },
      colors: {
        verde: {
          50: '#f0fdf4',
          100: '#dcfce7',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          900: '#14532d',
        },
        dorado: {
          400: '#fbbf24',
          500: '#f59e0b',
        },
        carbon: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#080c14',
        },
        surface: {
          DEFAULT: '#0d1117',
          raised: '#161b22',
          overlay: '#21262d',
          border: '#30363d',
        },
      },
      boxShadow: {
        'verde-glow': '0 0 20px rgba(22,163,74,0.3)',
        'verde-sm': '0 0 8px rgba(22,163,74,0.2)',
        'table': '0 1px 0 rgba(48,54,61,0.8)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease forwards',
        'slide-up': 'slideUp 0.4s ease forwards',
        'pulse-verde': 'pulseVerde 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        pulseVerde: {
          '0%, 100%': { boxShadow: '0 0 6px rgba(22,163,74,0.3)' },
          '50%': { boxShadow: '0 0 18px rgba(22,163,74,0.6)' },
        },
      },
    },
  },
  plugins: [],
};
