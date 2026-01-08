/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./api/**/*.{js,jsx,ts,tsx}",
    "./electron/**/*.{js,jsx,ts,tsx}",
  ],
  safelist: [
    "hidden",
    "flex",
    "btn",
    "tooltip",
  ],
};
