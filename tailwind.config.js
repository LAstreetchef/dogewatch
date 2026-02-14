/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        doge: {
          bg: '#0d0a04',
          panel: '#1a1207',
          border: '#2a2215',
          gold: '#FFD700',
          'gold-dark': '#D4A017',
          text: '#e8dcc8',
          muted: '#8a7a5a',
        },
        risk: {
          high: '#ff4444',
          moderate: '#ffaa00',
          safe: '#44ff44',
        },
      },
      fontFamily: {
        doge: ['Doge Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'gold': '0 0 20px rgba(255, 215, 0, 0.25)',
        'gold-lg': '0 0 40px rgba(255, 215, 0, 0.35)',
      },
      animation: {
        'sniff': 'sniff 0.5s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
      },
      keyframes: {
        sniff: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(-3deg)' },
          '75%': { transform: 'rotate(3deg)' },
        },
        'glow-pulse': {
          '0%, 100%': { filter: 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.25))' },
          '50%': { filter: 'drop-shadow(0 0 30px rgba(255, 215, 0, 0.5))' },
        },
      },
    },
  },
  plugins: [],
};
