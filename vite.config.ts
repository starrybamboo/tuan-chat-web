import type { Plugin } from "vite";

import * as babelCore from "@babel/core";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import { existsSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const _ReactCompilerConfig = {
  // React Compiler configuration options
  // You can add specific options here if needed
};

/**
 * Fix CommonJS default export issues for modules like lodash that have no default export.
 * This plugin rewrites code like `import x from 'lodash/debounce'` to work with
 * lodash's actual named/CommonJS exports at module load time.
 */
function fixCjsDefaultExportPlugin(): Plugin {
  return {
    name: "fix-cjs-default-export",
    apply: "serve",
    transform(code, _id) {
      // Target modules that commonly have CJS/default export issues
      const problematicModules = [
        "lodash/debounce",
        "lodash/throttle",
        "lodash/memoize",
        "lodash/isPlainObject",
        "lodash/isObject",
        "use-sync-external-store/shim/with-selector.js",
        "use-sync-external-store/shim/index.js",
        "dagre",
        "qrcode",
        "quill-delta",
        "quill-delta/dist/Delta",
        "quill-delta/dist/Delta.js",
        "fast-diff",
        "pngjs",
        "randombytes",
        "safe-buffer",
        "dayjs",
        "dayjs/dayjs.min.js",
        "react-fast-compare",
        "screenfull",
      ];

      let modified = false;
      let result = code;

      for (const module of problematicModules) {
        // Match: import identifier from 'module' or import identifier from "module"
        const importRegex = new RegExp(
          `import\\s+([\\w$]+)\\s+from\\s+['"](${module.replace(/\//g, "\\/")})['"](;?)`,
          "g",
        );

        if (importRegex.test(result)) {
          modified = true;
          result = result.replace(
            importRegex,
            (match, identifier) => {
              // Convert to dynamic import + namespace, then extract the default
              // This works around the missing default export by using the CJS wrapper
              return `import * as __module_${identifier} from '${module}'; const ${identifier} = __module_${identifier}.default || __module_${identifier};`;
            },
          );
        }
      }

      return modified ? { code: result } : null;
    },
  };
}

export default defineConfig(({ command }) => {
  const isDev = command === "serve";

  const nm = (p: string) => {
    const abs = resolve(__dirname, p);
    return existsSync(abs) ? realpathSync(abs) : abs;
  };

  // Some BlockSuite dist outputs ship ES2023 auto-accessor syntax:
  // `accessor foo = ...` which Rollup (and some tooling) may fail to parse.
  // Downlevel it in Vite's transform pipeline.
  const blocksuiteAutoAccessorRE = /@blocksuite[\\/](?:std|affine-model|affine-block-[^\\/]+)[\\/]dist[\\/].*\.js(?:\?.*)?$/;

  return {
    plugins: [
      tailwindcss(),
      fixCjsDefaultExportPlugin(),

      // Downlevel BlockSuite ES2023 auto-accessor syntax in dist outputs.
      // Example crashing syntax: `accessor color = ...` (brush.js), `accessor elements = ...` (v-line.js).
      {
        name: "tc-downlevel-blocksuite-auto-accessor",
        enforce: "pre",
        async transform(code, id) {
          if (!blocksuiteAutoAccessorRE.test(id))
            return null;
          if (!/^\s*accessor\s+/m.test(code))
            return null;

          const filename = id.split("?")[0];
          const result = await babelCore.transformAsync(code, {
            filename,
            sourceMaps: true,
            presets: [
              [
                "@babel/preset-env",
                {
                  targets: { esmodules: true },
                  bugfixes: true,
                  modules: false,
                  loose: true,
                },
              ],
            ],
            plugins: [
              ["@babel/plugin-proposal-decorators", { version: "2023-05" }],
              ["@babel/plugin-proposal-class-properties", { loose: true }],
            ],
          });

          if (!result?.code)
            return null;
          return { code: result.code, map: result.map ?? null };
        },
      },

      // NOTE:
      // Some upstream packages (e.g. BlockSuite/AFFiNE) ship vanilla-extract sources
      // or runtime that can reference `document`. In production builds, `emitCss`
      // evaluates style modules and may crash with `document is not defined`.
      //
      // Using `transform` avoids executing those modules at build time.
      vanillaExtractPlugin({
        unstable_mode: "transform",
      }),

      reactRouter(),
      tsconfigPaths(),
      // NOTE: React Compiler is experimental and currently broken.
      // Disabling it for now to unblock BlockSuite playground migration.
      // To re-enable: uncomment the babel() plugin and ensure react/compiler-runtime is properly installed.
      // babel({
      //   filter: /app\/(routes\/role|components\/Role).*\.[jt]sx?$/,
      //   babelConfig: {
      //     presets: ["@babel/preset-typescript"],
      //     plugins: [
      //       ["babel-plugin-react-compiler", ReactCompilerConfig],
      //     ],
      //   },
      // }),
    ],
    base: "/",
    resolve: {
      // Keep compatibility with upstream playground sources that import "*.js" while
      // the actual file may be TypeScript (e.g. setup.js -> setup.ts).
      // This mirrors the upstream playground Vite config.
      extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".json"],

      // BlockSuite pulls in lit/lit-html. Ensure we don't end up with nested copies like
      // `lit/node_modules/lit-html`, which increases module count and can exhaust
      // browser/dev-server resources on Windows.
      dedupe: [
        "react",
        "react-dom",
        "react-router",
        "zustand",

        // Ensure BlockSuite/Yjs are singletons. Multiple module instances can
        // break DI tokens (e.g. StoreSelectionExtension) and instance checks
        // (e.g. "store is invalid").
        "yjs",
        "@blocksuite/global",
        "@blocksuite/store",
        "@blocksuite/std",
        "@blocksuite/sync",
        "@blocksuite/affine",
        "@blocksuite/affine-model",
        "@blocksuite/affine-shared",
        "@blocksuite/integration-test",

        "lit",
        "lit-element",
        "lit-html",
        "@lit/context",
        "@lit/reactive-element",
        "@lit/react",
      ],
      alias: [
        // BlockSuite packages export TypeScript sources (`./src/*.ts`) by default.
        // In Vite dev this can lead to:
        // - decorators not being applied (custom elements not defined) -> "Illegal constructor"
        // - mixed module instances (src vs dist) -> DI token mismatch / Yjs store issues
        // Force them to use prebuilt dist outputs.
        {
          find: /^@blocksuite\/std$/,
          replacement: nm("node_modules/@blocksuite/std/dist/index.js"),
        },
        {
          find: /^@blocksuite\/std\/(.+)$/,
          replacement: `${nm("node_modules/@blocksuite/std/dist")}/$1`,
        },
        {
          find: /^@blocksuite\/store$/,
          replacement: nm("node_modules/@blocksuite/store/dist/index.js"),
        },
        {
          find: /^@blocksuite\/store\/(.+)$/,
          replacement: `${nm("node_modules/@blocksuite/store/dist")}/$1`,
        },
        {
          find: /^@blocksuite\/global$/,
          replacement: nm("node_modules/@blocksuite/global/dist/index.js"),
        },
        {
          find: /^@blocksuite\/global\/(.+)$/,
          replacement: `${nm("node_modules/@blocksuite/global/dist")}/$1`,
        },
        {
          find: /^@blocksuite\/sync$/,
          replacement: nm("node_modules/@blocksuite/sync/dist/index.js"),
        },
        {
          find: /^@blocksuite\/sync\/(.+)$/,
          replacement: `${nm("node_modules/@blocksuite/sync/dist")}/$1`,
        },
        {
          find: /^@blocksuite\/affine$/,
          replacement: nm("node_modules/@blocksuite/affine/dist/index.js"),
        },
        {
          find: /^@blocksuite\/affine\/(.+)$/,
          replacement: `${nm("node_modules/@blocksuite/affine/dist")}/$1`,
        },
        {
          find: /^@blocksuite\/affine-model$/,
          replacement: nm("node_modules/@blocksuite/affine-model/dist/index.js"),
        },
        {
          find: /^@blocksuite\/affine-model\/(.+)$/,
          replacement: `${nm("node_modules/@blocksuite/affine-model/dist")}/$1`,
        },
        {
          find: /^@blocksuite\/affine-shared$/,
          replacement: nm("node_modules/@blocksuite/affine-shared/dist/index.js"),
        },
        {
          find: /^@blocksuite\/affine-shared\/(.+)$/,
          replacement: `${nm("node_modules/@blocksuite/affine-shared/dist")}/$1`,
        },

        // Some BlockSuite packages export vanilla-extract `*.css.ts` sources in `exports`.
        // In production/SSR builds this can crash with `document is not defined`.
        // Force them to use prebuilt dist outputs.
        {
          find: /^@blocksuite\/affine-block-note$/,
          replacement: nm("node_modules/@blocksuite/affine-block-note/dist/index.js"),
        },
        {
          find: /^@blocksuite\/affine-block-note\/(.+)$/,
          replacement: `${nm("node_modules/@blocksuite/affine-block-note/dist")}/$1`,
        },

        // Force Lit ecosystem to resolve to a single physical copy.
        // This helps avoid runtime warnings like "Multiple versions of Lit loaded"
        // when the same version is loaded from different paths (e.g. pnpm virtual store).
        {
          find: /^lit$/,
          replacement: nm("node_modules/lit/index.js"),
        },
        {
          find: /^lit\/(.+)$/,
          replacement: `${nm("node_modules/lit")}/$1`,
        },
        {
          find: /^lit-html$/,
          replacement: nm("node_modules/lit-html/lit-html.js"),
        },
        {
          find: /^lit-html\/(.+)$/,
          replacement: `${nm("node_modules/lit-html")}/$1`,
        },
        {
          find: /^lit-element$/,
          replacement: nm("node_modules/lit-element/index.js"),
        },
        {
          find: /^lit-element\/(.+)$/,
          replacement: `${nm("node_modules/lit-element")}/$1`,
        },
        {
          find: /^@lit\/reactive-element$/,
          replacement: nm("node_modules/@lit/reactive-element/reactive-element.js"),
        },
        {
          find: /^@lit\/reactive-element\/(.+)$/,
          replacement: `${nm("node_modules/@lit/reactive-element")}/$1`,
        },
        {
          find: /^@lit\/context$/,
          replacement: nm("node_modules/@lit/context/index.js"),
        },
        {
          find: /^@lit\/context\/(.+)$/,
          replacement: `${nm("node_modules/@lit/context")}/$1`,
        },
        {
          find: /^@lit\/react$/,
          replacement: nm("node_modules/@lit/react/index.js"),
        },
        {
          find: /^@lit\/react\/(.+)$/,
          replacement: `${nm("node_modules/@lit/react")}/$1`,
        },
        {
          find: "@",
          replacement: resolve(__dirname, "app"),
        },
        {
          find: "figma-squircle",
          replacement: nm("node_modules/figma-squircle/dist/module.js"),
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
      noExternal: [
        /^@blocksuite\//,
        /^@toeverything\//,
        "qrcode",
        "dagre",
        "lodash",
        "quill-delta",
        "quill-delta/dist/Delta",
        "fast-diff",
        "use-sync-external-store",
        "randombytes",
        "safe-buffer",
        "pngjs",
      ],
    },

    esbuild: {
      target: "es2022",
    },

    optimizeDeps: {
      // Prevent Vite from auto-optimizing discovered deps (which can accidentally
      // pull in vanilla-extract `*.css.ts` sources from node_modules).
      noDiscovery: true,

      // Explicitly pre-bundle only the deps we know are safe/needed.
      // IMPORTANT: do NOT pre-bundle BlockSuite/AFFiNE packages.
      include: [
        // Ensure React JSX runtime is properly converted to ESM for browser.
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",

        // Ensure React Router runtime is pre-bundled with the same React instance.
        "react-router",
        "zustand",

        // Pixi has a very large module graph; without pre-bundling it can trigger
        // browser resource exhaustion (ERR_INSUFFICIENT_RESOURCES) in dev.
        "pixi.js",

        // Markdown/code highlighting (CJS interop)
        "lowlight",
        "react-syntax-highlighter",

        "lit",
        "lit-element",
        "lit-html",
        "@lit/context",
        "@lit/reactive-element",
        "@lit/react",

        // Fix CJS/ESM interop for packages that are imported as ESM but are CJS.n
        // This prevents runtime errors like:
        // ".../style-to-js/cjs/index.js ... does not provide an export named 'default'".
        "style-to-js",
        "debug",
        "extend",
        "bind-event-listener",
        "bytes",
        "dagre",
        "qrcode",
        "quill-delta",
        "quill-delta/dist/Delta",
        "quill-delta/dist/Delta.js",
        "fast-diff",
        "pngjs",
        "randombytes",
        "safe-buffer",
        "cssesc",
        "deepmerge",
        "picocolors",
        "eventemitter3",

        // Fix CJS/ESM interop for upstream deps used by the playground.
        "lodash",
        "lodash/debounce",
        "lodash/throttle",
        "lodash/memoize",
        "lodash/isObject",
        "lodash.ismatch",
        "lodash/isPlainObject",
        "use-sync-external-store/shim/with-selector",
        "use-sync-external-store/shim/with-selector.js",
        "use-sync-external-store/shim/index.js",
        "use-sync-external-store/shim",
        "simple-xml-to-json",
        "react-fast-compare",

        // Fix CJS/ESM interop for minimatch/glob transitive deps.
        "brace-expansion",
        "screenfull",
      ],

      // IMPORTANT: do NOT pre-bundle `@blocksuite/affine-*` packages.
      // Many of them include `*.css.ts` (vanilla-extract) sources.
      exclude: [
        "@blocksuite/affine",
        "@blocksuite/affine-ext-loader",
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

        "@blocksuite/integration-test",

        // Ensure these are not pre-bundled to avoid duplicate module graphs
        // (breaks DI tokens / instanceof checks).
        "@blocksuite/global",
        "@blocksuite/store",
        "@blocksuite/std",
        "@blocksuite/sync",
      ],
    },
  };
});
