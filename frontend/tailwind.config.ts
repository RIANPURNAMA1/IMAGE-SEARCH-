import type { Config } from 'tailwindcss';

// Warna hanya hitam, putih, dan abu-abu netral. Nilai dibaca dari CSS variable (lihat index.css)
// sehingga mode terang/gelap mengikuti preferensi sistem.
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: token('bg'),
        fg: token('fg'),
        muted: token('muted'),
        line: token('line'),
        'line-strong': token('line-strong'),
        surface: token('surface'),
      },
      fontFamily: {
        sans: [
          '"Schibsted Grotesk"',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      keyframes: {
        indeterminate: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(250%)' },
        },
      },
      animation: {
        indeterminate: 'indeterminate 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
