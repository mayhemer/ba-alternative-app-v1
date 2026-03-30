/** @type {import('tailwindcss').Config} */
const { colors } = require('./src/styling/tokens.js');

module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors,
      fontFamily: {
        default: ['Regular-Default'],
        bold: ['Bold-Default'],
      } 
    },
  },
  plugins: [],
};
