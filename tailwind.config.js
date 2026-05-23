/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream:     '#F7F2E7',
        creamSoft: '#FBF7EE',
        sage:      '#C7DCC2',
        sageSoft:  '#E3EDDC',
        sageDeep:  '#7FA982',
        inkSoft:   '#5A6A5C',
        ink:       '#2F3A2F',
        amber:     '#E8B873',
        amberSoft: '#F5DDB0',
        shellPink: '#F4D9CC',
      },
      fontFamily: {
        rounded: [
          '"M PLUS Rounded 1c"',
          '"Hiragino Maru Gothic ProN"',
          '"Yu Gothic"',
          'system-ui',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 8px 24px rgba(60, 80, 60, 0.08), 0 2px 6px rgba(60, 80, 60, 0.04)',
      },
      keyframes: {
        'seed-breath': {
          '0%, 100%': { transform: 'scale(1) translateY(0)' },
          '50%':      { transform: 'scale(1.04) translateY(-2px)' },
        },
        'seed-twinkle': {
          '0%, 100%': { opacity: '0.2', transform: 'scale(0.8)' },
          '50%':      { opacity: '1',   transform: 'scale(1.2)' },
        },
        'seed-hop': {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '25%':      { transform: 'translateY(-12px) rotate(-4deg)' },
          '50%':      { transform: 'translateY(0) rotate(0deg)' },
          '75%':      { transform: 'translateY(-6px) rotate(4deg)' },
        },
      },
      animation: {
        'seed-breath':  'seed-breath 4s ease-in-out infinite',
        'seed-twinkle': 'seed-twinkle 2.4s ease-in-out infinite',
        'seed-hop':     'seed-hop 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
