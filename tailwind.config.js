/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        satellite: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#0d9488',
          600: '#0f766e',
          700: '#115e59',
          800: '#134e4a',
          900: '#042f2e',
        },
        gis: {
          teal: '#0f766e',
          tealHover: '#0d9488',
          tealLight: '#f0fdfa',
          tealBorder: '#99f6e4',
          charcoal: '#0f172a',
          slate: '#334155',
          muted: '#64748b',
          border: '#e2e8f0',
          panel: '#ffffff',
          base: '#f8fafc',
          subtle: '#f1f5f9',
          changeOrange: '#ea580c',
          changeOrangeBg: '#fff7ed',
          changeOrangeBorder: '#ffedd5',
          changePurple: '#7e22ce',
          changePurpleBg: '#faf5ff',
          changePurpleBorder: '#f3e8ff'
        },
        ui: {
          dark: '#1e293b',
          darker: '#f8fafc',
          card: '#ffffff',
          panel: '#ffffff',
          subtle: '#f1f5f9',
          light: '#f8fafc',
          border: '#e2e8f0',
          borderDark: '#cbd5e1'
        }
      }
    },
  },
  plugins: [],
}
