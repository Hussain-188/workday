/** @type {import('tailwindcss').Config} */

/*
 * Meridian design tokens.
 *
 * The palette is deliberately narrow: warm paper neutrals carry the surface,
 * a single deep-pine accent carries every interactive state, and the semantic
 * hues are desaturated so a status pill never shouts louder than the data.
 */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Warm neutral ramp — the canvas, the rules, the type.
        ink: {
          50: '#F6F5F1',
          100: '#EFEDE7',
          200: '#E4E1D9',
          300: '#CFCBC0',
          400: '#9C978C',
          500: '#78736A',
          600: '#575249',
          700: '#3B3730',
          800: '#242220',
          900: '#1A1917',
          950: '#111110',
        },
        // Deep pine — the one accent. Used for primary actions and focus.
        pine: {
          50: '#EFF5F1',
          100: '#DAE9E0',
          200: '#B6D2C3',
          300: '#88B49E',
          400: '#568F76',
          500: '#357056',
          600: '#275843',
          700: '#1D4436',
          800: '#17362B',
          900: '#122A22',
          950: '#0B1A15',
        },
        clay: '#A8452F',    // danger / reject
        honey: { DEFAULT: '#9A6512', soft: '#FBF3E4' },
        azure: { DEFAULT: '#2B5C86', soft: '#EAF1F7' },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['"Instrument Serif"', 'Georgia', 'Cambria', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.04em' }],
      },
      borderRadius: {
        '4xl': '1.75rem',
      },
      boxShadow: {
        // Warm-tinted shadows; a neutral-grey drop shadow reads cheap on paper.
        hair: '0 1px 2px rgba(26,25,23,.05), 0 0 0 1px rgba(26,25,23,.04)',
        soft: '0 1px 2px rgba(26,25,23,.04), 0 8px 24px -12px rgba(26,25,23,.16)',
        lift: '0 2px 4px rgba(26,25,23,.04), 0 18px 40px -18px rgba(26,25,23,.28)',
        deep: '0 32px 80px -32px rgba(17,17,16,.45)',
        inset: 'inset 0 1px 0 rgba(255,255,255,.06)',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(.22,.61,.36,1)',
        spring: 'cubic-bezier(.34,1.36,.64,1)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'none' },
        },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(.97)' },
          to: { opacity: '1', transform: 'none' },
        },
        'slide-left': {
          from: { opacity: '0', transform: 'translateX(24px)' },
          to: { opacity: '1', transform: 'none' },
        },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        breathe: { '0%,100%': { opacity: '1' }, '50%': { opacity: '.45' } },
        'draw-in': { from: { transform: 'scaleX(0)' }, to: { transform: 'scaleX(1)' } },
      },
      animation: {
        'fade-up': 'fade-up .55s cubic-bezier(.22,.61,.36,1) both',
        'fade-in': 'fade-in .4s ease both',
        'scale-in': 'scale-in .3s cubic-bezier(.22,.61,.36,1) both',
        'slide-left': 'slide-left .4s cubic-bezier(.22,.61,.36,1) both',
        shimmer: 'shimmer 1.6s infinite',
        breathe: 'breathe 2.4s ease-in-out infinite',
        'draw-in': 'draw-in .9s cubic-bezier(.22,.61,.36,1) both',
      },
    },
  },
  plugins: [],
}
