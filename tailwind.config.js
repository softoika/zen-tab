module.exports = {
  purge: ["src/**/*.{js,jsx,ts,tsx}", "static/*.html"],
  darkMode: false, // or 'media' or 'class'
  theme: {
    customForms: (theme) => ({
      default: {
        input: {
          borderWidth: theme("borderWidth.DEFAULT"),
          borderColor: theme("colors.gray.300"),
          borderRadius: theme("borderRadius.md"),
          "&:focus": {
            borderColor: theme("colors.indigo.600"),
          },
        },
      },
    }),
  },
  variants: {
    extend: {
      borderWidth: ["focus"],
    },
  },
  plugins: [require("@tailwindcss/custom-forms")],
};
