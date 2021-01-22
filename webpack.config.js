const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const TerserWebpackPlugin = require("terser-webpack-plugin");
const TsconfigPathsPlugin = require("tsconfig-paths-webpack-plugin");

const mode = process.env.NODE_ENV || "development";
const isProd = mode === "production";

module.exports = {
  mode,
  entry: {
    popup: "./src/popup/Popup.tsx",
    options: "./src/options/Options.tsx",
    background: "./src/background/index.ts",
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
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader", "postcss-loader"],
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
    plugins: [new TsconfigPathsPlugin({})],
  },
  optimization: {
    minimize: isProd,
    minimizer: [
      new TerserWebpackPlugin({
        terserOptions: {
          compress: { drop_console: true },
        },
      }),
    ],
  },
};
