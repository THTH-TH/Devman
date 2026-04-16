/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          50: '#EEF0EB',
          100: '#D8DDD1',
          200: '#B5BEA5',
          300: '#8D9E78',
          400: '#6A7D52',
          500: '#4F5E38',
          600: '#3E4929',
          700: '#2e3720',
          800: '#1F2516',
          900: '#10130B',
        },
        ocean: {
          50: '#e6f4f6',
          200: '#a8d8de',
          400: '#4db8c8',
          500: '#1B8A9A',
          600: '#1B8A9A',
          700: '#157080',
        },
        offwhite: '#F4F2F0',
      },
    },
  },
  plugins: [],
}
