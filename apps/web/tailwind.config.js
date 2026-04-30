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
        sans: ['var(--font-sans)', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      // Escala áurea de espaciado (φ = 1.618, base 8px)
      spacing: {
        'phi-1':  '4px',
        'phi-2':  '8px',
        'phi-3':  '12px',
        'phi-4':  '20px',
        'phi-5':  '32px',
        'phi-6':  '52px',
        'phi-7':  '84px',
        'phi-8':  '136px',
      },
      // Escala tipográfica áurea
      fontSize: {
        'xs':   ['12px', { lineHeight: '16px' }],
        'sm':   ['14px', { lineHeight: '20px' }],
        'base': ['16px', { lineHeight: '24px' }],
        'lg':   ['20px', { lineHeight: '28px' }],
        'xl':   ['26px', { lineHeight: '32px' }],
        '2xl':  ['42px', { lineHeight: '48px' }],
        '3xl':  ['68px', { lineHeight: '76px' }],
      },
      // Radios áureos
      borderRadius: {
        'sm':   '4px',
        DEFAULT: '4px',
        'md':   '8px',
        'lg':   '12px',
        'xl':   '20px',
        '2xl':  '20px',
        'full': '9999px',
      },
      colors: {
        // Brand azul Terrazul (reemplaza verde para CTAs y navegación)
        verde: {
          50:  '#E8EDF8',  // brand-primary-light
          100: '#D1DBF1',
          400: '#5A7FCC',
          500: '#2A52B5',
          600: '#1B3FA0',  // brand-primary
          700: '#142E78',  // brand-primary-dark (hover)
          900: '#E8EDF8',  // alias de 50 — usado en nav-link-active bg
        },
        // Verde agrícola (indicadores de cultivo, badges "real")
        agro: {
          50:  '#ECFDF3',
          100: '#D1FAE5',
          400: '#4CAF72',
          500: '#2E8B3D',  // brand-secondary
          600: '#236F30',
          700: '#1A5424',
          900: '#0D2D14',
        },
        // Ámbar de advertencia (reemplaza dorado)
        dorado: {
          400: '#F0C040',
          500: '#DC9B04',  // warning
        },
        // Neutrales light (carbon invertido para tema claro)
        carbon: {
          50:  '#101828',  // text-primary (más oscuro = más peso)
          100: '#1D2939',
          200: '#344054',
          300: '#475467',  // text-secondary
          400: '#667085',  // text-tertiary
          500: '#98A2B3',  // text-disabled
          700: '#E4E7EC',  // border-subtle
          800: '#F2F4F7',  // bg-muted
          900: '#FAFBFC',  // bg-surface
          950: '#FFFFFF',  // bg-base
        },
        // Fondos light (reemplaza surface oscuro)
        surface: {
          DEFAULT: '#FFFFFF',   // bg-base
          raised:  '#FAFBFC',   // cards, sidebar
          overlay: '#F2F4F7',   // inputs, hover
          border:  '#E4E7EC',   // border-subtle
        },
      },
      boxShadow: {
        'verde-glow': '0 0 20px rgba(27,63,160,0.15)',
        'verde-sm':   '0 0 8px rgba(27,63,160,0.10)',
        'table':      '0 1px 0 #E4E7EC',
        'xs':  '0 1px 2px rgba(16,24,40,0.05)',
        'sm':  '0 1px 3px rgba(16,24,40,0.08), 0 1px 2px rgba(16,24,40,0.04)',
        'md':  '0 4px 8px rgba(16,24,40,0.08), 0 2px 4px rgba(16,24,40,0.04)',
        'lg':  '0 12px 20px rgba(16,24,40,0.10), 0 4px 8px rgba(16,24,40,0.06)',
      },
      animation: {
        'fade-in':     'fadeIn 0.3s cubic-bezier(0.4,0,0.2,1) forwards',
        'slide-up':    'slideUp 0.3s cubic-bezier(0,0,0.2,1) forwards',
        'pulse-verde': 'pulseVerde 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        pulseVerde: {
          '0%, 100%': { boxShadow: '0 0 6px rgba(27,63,160,0.15)' },
          '50%':      { boxShadow: '0 0 18px rgba(27,63,160,0.30)' },
        },
      },
    },
  },
  plugins: [],
};
