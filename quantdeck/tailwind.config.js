/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:          'hsl(0 0% 8%)',
        'bg-card':   'hsl(0 0% 10.5%)',
        'bg-muted':  'hsl(0 0% 13%)',
        'bg-accent': 'hsl(0 0% 18%)',
        border:      'hsl(0 0% 16%)',
        text:        'hsl(0 0% 96%)',
        'text-dim':  'hsl(0 0% 64%)',
        'text-faint':'hsl(0 0% 38%)',
        accent:      'hsl(213 94% 62%)',
        'accent-dim':'hsl(213 80% 76%)',
        amber:       'hsl(45 93% 58%)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
