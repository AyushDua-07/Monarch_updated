/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        heading: ['Rajdhani', 'system-ui', 'sans-serif'],
        body: ['Space Grotesk', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        abyss: {
          50: '#e0f7ff',
          100: '#b3ecff',
          200: '#80dfff',
          300: '#4dd2ff',
          400: '#00d4ff',
          500: '#00b4d8',
          600: '#0090ad',
          700: '#006d82',
          800: '#0a1628',
          900: '#050510',
          950: '#020208',
        },
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'scan': 'scanline 2s ease-in-out infinite',
        'glitch': 'glitch-text 0.3s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 5px rgba(0, 212, 255, 0.3)' },
          '50%': { boxShadow: '0 0 15px rgba(0, 212, 255, 0.6), 0 0 30px rgba(0, 212, 255, 0.2)' },
        },
        'scanline': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(200%)' },
        },
        'glitch-text': {
          '0%, 100%': { textShadow: '2px 0 #00d4ff, -2px 0 #ff0040' },
          '25%': { textShadow: '-2px 0 #00d4ff, 2px 0 #ff0040' },
          '50%': { textShadow: '2px 2px #00d4ff, -2px -2px #ff0040' },
          '75%': { textShadow: '-2px 2px #00d4ff, 2px -2px #ff0040' },
        },
      },
    },
  },
  plugins: [],
};
