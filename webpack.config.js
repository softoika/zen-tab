const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const TerserWebpackPlugin = require("terser-webpack-plugin");

const mode = process.env.NODE_ENV || "development";
const isProd = mode === "production";

module.exports = {
  mode,
  entry: {
    popup: "./src/popup/Popup.tsx",
    background: "./src/background.ts",
  },
  output: {
    path: path.resolve(__dirname, "dist/"),
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: "ts-loader",
      },
    ],
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: "static", to: "." },
        { from: "node_modules/webextension-polyfill/dist/browser-polyfill.js" },
      ],
    }),
  ],
  devtool: !isProd && "inline-source-map",
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  optimization: {
    minimize: isProd,
    minimizer: [new TerserWebpackPlugin({ 
      terserOptions: {
        compress: { drop_console: true }
      }
    })],
  },
};
