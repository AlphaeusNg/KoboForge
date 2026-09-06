/** Build committed utility CSS; GitHub Pages still serves a zero-build site. */
module.exports = {
  content: ["./index.html", "./js/**/*.js"],
  theme: {
    extend: {},
  },
  plugins: [],
};
