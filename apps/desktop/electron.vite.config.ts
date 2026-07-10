import { defineConfig } from "electron-vite";
import { resolve } from "node:path";

const desktopRoot = __dirname;

export default defineConfig({
  main: {
    build: {
      externalizeDeps: {
        exclude: ["electron-updater", "fflate"],
      },
      outDir: resolve(desktopRoot, "electron", "main"),
      rollupOptions: {
        input: resolve(desktopRoot, "src", "main", "index.ts"),
        output: {
          entryFileNames: "[name].js",
          format: "es",
        },
      },
    },
  },
  preload: {
    build: {
      outDir: resolve(desktopRoot, "electron", "preload"),
      rollupOptions: {
        input: resolve(desktopRoot, "src", "preload", "index.ts"),
        output: {
          entryFileNames: "[name].cjs",
          format: "cjs",
        },
      },
    },
  },
});
