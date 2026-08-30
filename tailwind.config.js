/** @type {import('tailwindcss').Config} */
const withMT = require('@material-tailwind/react/utils/withMT');

module.exports = withMT({
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    'path-to-your-node_modules/@material-tailwind/react/components/**/*.{js,ts,jsx,tsx}',
    'path-to-your-node_modules/@material-tailwind/react/theme/components/**/*.{js,ts,jsx,tsx}',
  ],

  darkMode: 'class',

  theme: {
    fontSize: {
      // `xs` and `lg` are re-added for the /studio design system; the rest is
      // the original ramp the legacy pages depend on.
      xs: '0.75rem',
      sm: '0.8rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.563rem',
      '3xl': '1.953rem',
      '4xl': '2.441rem',
      '5xl': '3.052rem',
      '6xl': '4.052rem',
      '7xl': '5.052rem',
      '8xl': '6.052rem',
      '9xl': '7.052rem',
    },
    extend: {
      colors: {
        // /studio design system. Light-only, modelled on TheOpenPresenter.
        studio: {
          bg: '#ffffff',
          surface: '#f7f8fa',
          bar: '#1b1f27',
          border: '#e5e7eb',
          divider: '#eef0f3',
          text: '#111318',
          muted: '#6b7280',
          faint: '#9ca3af',
          accent: '#2563eb',
          live: '#ef4444',
          go: '#1f7a4d',
          danger: '#dc2626',
          slide: '#000000',
        },
      },
      boxShadow: {
        studio: '0 1px 2px rgba(16, 24, 40, 0.05)',
        'studio-modal': '0 12px 32px rgba(16, 24, 40, 0.16)',
        'studio-panel': '0 8px 24px rgba(16, 24, 40, 0.12)',
      },
      borderRadius: {
        studio: '6px',
        'studio-lg': '10px',
      },
      backgroundImage: {
        '1img': "url('/public/images/1.jpeg')",
        '2img': "url('/public/images/2.jpeg')",
        '3img': "url('/public/images/3.jpeg')",
        '4img': "url('/public/images/4.jpeg')",
        '5img': "url('/public/images/5.jpeg')",
        '6img': "url('/public/images/6.jpeg')",
        '7img': "url('/public/images/7.jpeg')",
        '8img': "url('/public/images/8.jpeg')",
        '9img': "url('/public/images/9.jpeg')",
        '10img': "url('/public/images/10.jpeg')",
        '11img': "url('/public/images/11.jpeg')",
        '12img': "url('/public/images/12.jpeg')",
        '13img': "url('/public/images/13.jpeg')",
        '14img': "url('/public/images/14.jpeg')",
        '15img': "url('/public/images/15.jpeg')",
        '16img': "url('/public/images/16.jpeg')",
        '17img': "url('/public/images/17.jpeg')",
        '18img': "url('/public/images/18.jpeg')",
        '19img': "url('/public/images/19.jpeg')",
        '20img': "url('/public/images/20.jpeg')",
        '21img': "url('/public/images/the-crown.webp')",
        '22img': "url('/public/images/kingdom-crown.webp')",
        '23img': "url('/public/images/kingdom-cross.webp')",
        '24img': "url('/public/images/kingdom-dove.webp')",
        '25img': "url('/public/images/kingdom-hands.webp')",
        '26img': "url('/public/images/kingdom-communion.webp')",
        '27img': "url('/public/images/jesus-saves.webp')",
        '28img': "url('/public/images/kingdom-come-b.webp')",
        '29img': "url('/public/images/kingdom-come-c.webp')",
        '30img': "url('/public/images/fragrance-a.webp')",
        '31img': "url('/public/images/fragrance-b.webp')",
        '32img': "url('/public/images/isaiah-52-a.webp')",
        '33img': "url('/public/images/isaiah-52-b.webp')",
      },
    },
    fontFamily: {
      valera: 'Varela Round',
      banner: ['BPG Banner Caps', 'sans-serif'],
      // Trilingual projector faces: Georgian, Latin and Cyrillic in one family.
      firago: ['FiraGO', 'Noto Sans Georgian', 'sans-serif'],
      notosans: ['Noto Sans Trilingual', 'Noto Sans Georgian', 'sans-serif'],
      notoserif: ['Noto Serif Trilingual', 'Noto Serif Georgian', 'serif'],
      // Console chrome. System stack so no extra font request, with Georgian
      // and Cyrillic capable fallbacks.
      ui: [
        '-apple-system',
        'BlinkMacSystemFont',
        'Segoe UI',
        'Noto Sans Georgian',
        'Sylfaen',
        'Helvetica Neue',
        'Arial',
        'sans-serif',
      ],
    },
  },

  plugins: [],
});
