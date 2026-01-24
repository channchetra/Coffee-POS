/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef7ee',
          100: '#fdedd6',
          200: '#f9d7ac',
          300: '#f5ba77',
          400: '#f09440',
          500: '#ec771a',
          600: '#dd5d10',
          700: '#b74510',
          800: '#923815',
          900: '#763014',
          950: '#401608',
        },
        coffee: {
          50: '#f6f3f0',
          100: '#e8e0d8',
          200: '#d3c4b4',
          300: '#b9a188',
          400: '#a58566',
          500: '#96725a',
          600: '#805d4c',
          700: '#684a40',
          800: '#583f39',
          900: '#4c3733',
          950: '#2a1d1a',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans Khmer', 'system-ui', 'sans-serif'],
        khmer: ['Noto Sans Khmer', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
