/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: {
        '2xl': '1320px',
      }
    },
    extend: {
      colors: {
        navy: {
          50: '#f0f5fb',
          100: '#dbe6f4',
          200: '#b8cfe8',
          300: '#8aafd6',
          400: '#5485bf',
          500: '#3265a4',
          600: '#225088',
          700: '#1b3f6c',
          800: '#163458',
          900: '#0F2944',
          950: '#0a1b2e',
        },
        gold: {
          50: '#fbf7f1',
          100: '#f5ead8',
          200: '#ead2b0',
          300: '#dfb382',
          400: '#d4a574',
          500: '#c2874f',
          600: '#a76e3e',
          700: '#8b5735',
          800: '#704732',
          900: '#5c3c2c',
        },
        ivory: {
          50: '#fdfbf7',
          100: '#FAF7F0',
          200: '#F3EDE0',
          300: '#E8DFC7',
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', '"Source Han Serif SC"', 'Georgia', 'serif'],
        sans: ['"Inter"', '"PingFang SC"', '"Microsoft YaHei"', 'system-ui', 'sans-serif'],
        mono: ['"Roboto Mono"', '"SF Mono"', '"Menlo"', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-fast': 'pulse 0.6s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-up': 'fadeUp 0.6s ease-out forwards',
        'scale-in': 'scaleIn 0.3s ease-out forwards',
        'spin-slow': 'spin 8s linear infinite',
        'progress': 'progress 0.8s ease-out forwards',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        progress: {
          '0%': { strokeDashoffset: '100' },
        },
      },
      boxShadow: {
        'card': '0 4px 20px -4px rgba(15, 41, 68, 0.08), 0 2px 8px -4px rgba(15, 41, 68, 0.04)',
        'card-hover': '0 12px 40px -8px rgba(15, 41, 68, 0.15), 0 4px 12px -4px rgba(15, 41, 68, 0.08)',
        'timer': '0 0 80px -20px rgba(212, 165, 116, 0.4), 0 0 40px -10px rgba(15, 41, 68, 0.2)',
      },
      backgroundImage: {
        'gradient-navy': 'linear-gradient(135deg, #0F2944 0%, #1b3f6c 100%)',
        'gradient-gold': 'linear-gradient(135deg, #D4A574 0%, #c2874f 100%)',
        'gradient-rank-1': 'linear-gradient(135deg, #FFD700 0%, #D4A574 50%, #c2874f 100%)',
        'gradient-rank-2': 'linear-gradient(135deg, #E8E8E8 0%, #C0C0C0 50%, #A8A8A8 100%)',
        'gradient-rank-3': 'linear-gradient(135deg, #CD7F32 0%, #B87333 50%, #8B5A2B 100%)',
      },
    },
  },
  plugins: [],
};
