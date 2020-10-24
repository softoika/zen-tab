const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  mode: process.env.NODE_ENV || "development",
  entry: {
    popup: "./src/popup/Popup.tsx",
    background: "./src/background.ts"
  },
  output: {
    path: path.resolve(__dirname, "dist/")
  },
  module: {
    rules: [
      { 
        test: /\.tsx?$/,
        loader: "ts-loader"
      }
    ]
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: "static", to: "." },
        { from: "node_modules/webextension-polyfill/dist/browser-polyfill.js" }
      ]
    })
  ],
  devtool: "inline-source-map",
  resolve: {
    extensions: [".tsx", ".ts", ".js"]
  }
};
