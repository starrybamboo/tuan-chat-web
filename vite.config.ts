import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import babel from "vite-plugin-babel";
import tsconfigPaths from "vite-tsconfig-paths";

const ReactCompilerConfig = {
  // React Compiler configuration options
  // You can add specific options here if needed
};

export default defineConfig({
  plugins: [
    tailwindcss(),
    reactRouter(),
    tsconfigPaths(),
    babel({
      filter: /app\/(routes\/role|components\/Role).*\.[jt]sx?$/,
      babelConfig: {
        presets: ["@babel/preset-typescript"], // if you use TypeScript
        plugins: [
          ["babel-plugin-react-compiler", ReactCompilerConfig],
        ],
      },
    }),
  ],
  base: "/",
  resolve: {
    alias: [
      {
        find: "@",
        replacement: resolve(__dirname, "app"),
      },
    ],
  },
  server: {
    port: 5177,
    host: "0.0.0.0",
  },

});
