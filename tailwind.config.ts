import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './features/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        pulse: {
          bg: '#09130F',
          surface: '#14231D',
          accent: '#4DD6A7',
          'accent-dark': '#D99A42',
          muted: '#263B34',
          border: '#21362F',
          text: '#F4FBF7',
          'text-muted': '#9EB3A8',
        },
      },
      fontFamily: {
        sans: ['var(--font-cairo)', 'var(--font-plus-jakarta)', 'sans-serif'],
        display: ['var(--font-space-grotesk)', 'sans-serif'],
        latin: ['var(--font-plus-jakarta)', 'sans-serif'],
        arabic: ['var(--font-cairo)', 'sans-serif'],
      },
      backgroundImage: {
        'pulse-gradient': 'linear-gradient(135deg, #09130F 0%, #14231D 52%, #0E1914 100%)',
        'accent-gradient': 'linear-gradient(135deg, #4DD6A7, #D99A42)',
        'glass-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
      },
      backdropBlur: {
        glass: '20px',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'fade-in': 'fade-in 0.5s ease-out',
        'slide-up': 'slide-up 0.4s ease-out',
        'orbit': 'orbit 20s linear infinite',
        'orbit-reverse': 'orbit 15s linear infinite reverse',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(77, 214, 167, 0.28)' },
          '50%': { boxShadow: '0 0 40px rgba(217, 154, 66, 0.42)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        orbit: {
          '0%': { transform: 'rotate(0deg) translateX(150px) rotate(0deg)' },
          '100%': { transform: 'rotate(360deg) translateX(150px) rotate(-360deg)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
