module.exports = {
  mode: "jit",
  purge: ["src/**/*.{js,jsx,ts,tsx}", "static/*.html"],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {},
  },
  variants: {
    extend: {
      borderWidth: ["focus"],
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
