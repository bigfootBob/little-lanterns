/** @type {import('tailwindcss').Config} */
module.exports = {
  // Ensure the paths correctly point to where your files live
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        'lantern-amber': '#FF8C00', // Matches your icon
        'clinical-green': '#00C851',
      },
    },
  },
  plugins: [],
};