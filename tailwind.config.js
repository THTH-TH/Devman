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
          50: '#eef0eb',
          600: '#3E4929',
          700: '#2e3720',
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
