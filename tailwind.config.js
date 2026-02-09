/** @type {import('tailwindcss').Config} */
module.exports = {
  // Ensure the paths correctly point to where your files live
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        quicksand: ["Quicksand_400Regular", "sans-serif"],
        castoro: ["Castoro_400Regular", "serif"],
        "castoro-italic": ["Castoro_400Regular_Italic", "serif"],
      },
      colors: {
        'lantern-marine': '#005f69', // Dark marine blue-green
        'clinical-green': '#00C851',
        'lantern-light': '#e9efee', // Off-white for borders
      },
    },
  },
  plugins: [],
};