const colors = require("tailwindcss/colors");

module.exports = {
  mode: "jit",
  content: ["src/**/*.{js,jsx,ts,tsx}", "static/*.html"],
  theme: {
    extend: {
      green: colors.emerald,
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
