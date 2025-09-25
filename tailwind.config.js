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
      sm: '0.8rem',
      base: '1rem',
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
      },
    },
    fontFamily: {
      valera: 'Varela Round',
      banner: ['BPG Banner Caps', 'sans-serif'],
    },
  },

  plugins: [],
});
