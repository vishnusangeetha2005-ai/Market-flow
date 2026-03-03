/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // === Banner SaaS Design System ===
        // Primary Background: Deep Navy
        navy: {
          DEFAULT: '#0F172A',
          light: '#1E293B',
          muted: '#334155',
        },
        // Primary Accent: Royal Blue
        brand: {
          DEFAULT: '#2563EB',
          hover: '#1D4ED8',
          light: '#3B82F6',
          subtle: '#EFF6FF',
        },
        // CTA Accent: Electric Cyan
        cyan: {
          glow: '#22D3EE',
          subtle: '#ECFEFF',
        },
        // Surface / Cards
        surface: {
          DEFAULT: '#F1F5F9',
          card: '#FFFFFF',
          muted: '#E2E8F0',
        },
        // Text
        ink: {
          DEFAULT: '#111827',
          muted: '#6B7280',
          subtle: '#9CA3AF',
        },
      },
      borderRadius: {
        card: '12px',
        modal: '16px',
      },
      boxShadow: {
        card: '0 2px 8px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
        'card-hover': '0 8px 24px rgba(0,0,0,0.10), 0 0 0 1px rgba(37,99,235,0.12)',
        'cyan-glow': '0 0 20px rgba(34,211,238,0.25)',
        'blue-glow': '0 0 20px rgba(37,99,235,0.30)',
        elevated: '0 16px 48px rgba(0,0,0,0.16)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #2563EB, #22D3EE)',
        'navy-gradient': 'linear-gradient(180deg, #0F172A 0%, #1E293B 100%)',
        'hero-glow': 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(37,99,235,0.18) 0%, transparent 70%)',
        'cyan-pulse': 'radial-gradient(circle at center, rgba(34,211,238,0.12) 0%, transparent 70%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 12px rgba(34,211,238,0.20)' },
          '50%': { boxShadow: '0 0 28px rgba(34,211,238,0.40)' },
        },
      },
    },
  },
  plugins: [],
}
