import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import babel from "vite-plugin-babel";
import tsconfigPaths from "vite-tsconfig-paths";

const ReactCompilerConfig = {
  // React Compiler configuration options
  // You can add specific options here if needed
};

export default defineConfig(({ command }) => {
  const isDev = command === "serve";

  return {
    plugins: [
      tailwindcss(),

      // NOTE:
      // In dev on Windows, some upstream packages (e.g. BlockSuite/AFFiNE) ship
      // vanilla-extract `*.css.ts` from node_modules. Using the default `emitCss`
      // mode can crash the dev server with:
      // "No CSS for file: .../*.css.ts".
      //
      // Using `transform` in dev avoids the virtual CSS resolution path that
      // triggers this failure, while keeping `emitCss` for production builds.
      vanillaExtractPlugin({
        unstable_mode: isDev ? "transform" : "emitCss",
      }),

      reactRouter(),
      tsconfigPaths(),
      babel({
      // React Compiler is experimental; keep it away from chat module to avoid
      // producing invalid runtime output (e.g. Unexpected identifier in route module).
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
      // BlockSuite pulls in lit/lit-html. Ensure we don't end up with nested copies like
      // `lit/node_modules/lit-html`, which increases module count and can exhaust
      // browser/dev-server resources on Windows.
      dedupe: [
        "react",
        "react-dom",
        "react-router",
        "lit",
        "lit-html",
        "@lit/context",
      ],
      alias: [
        {
          find: "@",
          replacement: resolve(__dirname, "app"),
        },
        {
          find: "figma-squircle",
          replacement: resolve(__dirname, "node_modules/figma-squircle/dist/module.js"),
        },
      ],
    },
    server: {
      port: 5177,
      strictPort: true,
      host: "0.0.0.0",
    },

    // React Router dev loads route modules in SSR. Some upstream packages (e.g. BlockSuite)
    // export TypeScript sources in `exports`, which Node cannot execute if externalized.
    // Force Vite SSR to bundle/transpile them to avoid runtime syntax errors like:
    // "SyntaxError: Unexpected identifier 'lineStyle'".
    ssr: {
      noExternal: [/^@blocksuite\//, /^@toeverything\//],
    },

    esbuild: {
      target: "es2022",
    },

    optimizeDeps: {
      // Prevent Vite from auto-optimizing discovered deps (which can accidentally
      // pull in vanilla-extract `*.css.ts` sources from node_modules).
      // noDiscovery: true,

      // Explicitly pre-bundle only the deps we know are safe/needed.
      include: [
        "@blocksuite/global",
        "@blocksuite/store",
        "@blocksuite/sync",
        "@blocksuite/std",
        "lit",
        "lit-html",
        "@lit/context",

        // Fix CJS/ESM interop for packages that are imported as ESM but are CJS.n
        // This prevents runtime errors like:
        // ".../style-to-js/cjs/index.js ... does not provide an export named 'default'".
        "style-to-js",
        "debug",
        "extend",
        "bind-event-listener",
        "bytes",
        "cssesc",
        "deepmerge",
        "picocolors",
      ],

      // IMPORTANT: do NOT pre-bundle `@blocksuite/affine-*` packages.
      // Many of them include `*.css.ts` (vanilla-extract) sources.
      exclude: [
        "@blocksuite/affine",
        "@blocksuite/affine-ext-loader",
        "@blocksuite/affine-model",
        "@blocksuite/affine-shared",
        "@blocksuite/affine-components",
        "@blocksuite/affine-inline-preset",
        "@blocksuite/affine-inline-preset/store",
        "@blocksuite/affine-inline-preset/view",
        "@blocksuite/affine-block-root",
        "@blocksuite/affine-block-root/store",
        "@blocksuite/affine-block-root/view",
        "@blocksuite/affine-block-note",
        "@blocksuite/affine-block-note/store",
        "@blocksuite/affine-block-note/view",
        "@blocksuite/affine-block-paragraph",
        "@blocksuite/affine-block-paragraph/store",
        "@blocksuite/affine-block-paragraph/view",
        "@blocksuite/affine-block-surface",
        "@blocksuite/affine-block-surface/store",
        "@blocksuite/affine-block-surface/view",

        // Common transitive deps that also ship `src/*.ts` + `*.css.ts`
        "@blocksuite/affine-block-frame",
        "@blocksuite/affine-gfx-shape",
        "@blocksuite/affine-inline-latex",
        "@blocksuite/data-view",
      ],
    },
  };
});
