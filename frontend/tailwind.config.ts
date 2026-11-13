import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#121212',
        panel: '#181818',
        'panel-card': '#1E1E1E',
        edge: '#282828',
        'edge-light': '#333333',
        brand: '#3ECF8E',
        'brand-hover': '#34B27B',
        'brand-muted': 'rgba(62, 207, 142, 0.12)',
        accent: '#3ECF8E',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        panel: '0 1px 0 0 rgba(255, 255, 255, 0.05), 0 20px 40px -30px rgba(0, 0, 0, 0.9)',
      },
    },
  },
  plugins: [],
} satisfies Config;
