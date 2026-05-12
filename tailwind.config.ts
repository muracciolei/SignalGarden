import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        void: '#02030a',
        signal: '#58f3ff',
        bloom: '#ff4fd8',
        chlor: '#85ffb7',
        ember: '#ffb86b',
        ice: '#c7f5ff',
      },
      boxShadow: {
        glow: '0 0 30px rgba(88, 243, 255, 0.24)',
        bloom: '0 0 50px rgba(255, 79, 216, 0.2)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
} satisfies Config
