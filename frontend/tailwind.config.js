/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Brutal Assault dark theme palette
        background: '#0a0a0a',
        surface: '#141414',
        border: '#2a2a2a',
        accent: '#e8c84a',       // must-see bright accent
        amber: '#b87a1a',        // maybe/dim amber
        textPrimary: '#f0f0f0',
        textSecondary: '#888888',
      },
    },
  },
  plugins: [],
};
