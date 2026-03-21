import type { Plugin } from "vite";

import * as babelCore from "@babel/core";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import { Buffer } from "node:buffer";
import { existsSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
// import process from "node:process";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fetch as undiciFetch } from "undici";
import { defineConfig, loadEnv } from "vite";
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
        "fast-diff",
        "pngjs",
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

function ossUploadProxyPlugin(): Plugin {
  const readBody = async (req: any) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  };

  return {
    name: "tc-oss-upload-proxy",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        try {
          const reqUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
          const pathname = decodeURIComponent(reqUrl.pathname);
          if (pathname !== "/api/oss-upload-proxy") {
            next();
            return;
          }

          if ((req.method || "").toUpperCase() !== "PUT") {
            res.statusCode = 405;
            res.setHeader("Content-Type", "text/plain; charset=utf-8");
            res.end("Method Not Allowed");
            return;
          }

          const encodedTargetUrl = String(req.headers["x-tc-oss-upload-url"] || "").trim();
          if (!encodedTargetUrl) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "text/plain; charset=utf-8");
            res.end("Missing x-tc-oss-upload-url header");
            return;
          }

          let targetUrlRaw = "";
          try {
            targetUrlRaw = decodeURIComponent(encodedTargetUrl);
          }
          catch {
            res.statusCode = 400;
            res.setHeader("Content-Type", "text/plain; charset=utf-8");
            res.end("Invalid x-tc-oss-upload-url header");
            return;
          }

          let targetUrl: URL;
          try {
            targetUrl = new URL(targetUrlRaw);
          }
          catch {
            res.statusCode = 400;
            res.setHeader("Content-Type", "text/plain; charset=utf-8");
            res.end("Invalid upload target URL");
            return;
          }

          if (!["http:", "https:"].includes(targetUrl.protocol)) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "text/plain; charset=utf-8");
            res.end("Upload target protocol must be http(s)");
            return;
          }

          const body = await readBody(req);
          const headers = new Headers();
          const contentType = String(req.headers["content-type"] || "").trim();
          if (contentType)
            headers.set("content-type", contentType);
          const cacheControl = String(req.headers["cache-control"] || "").trim();
          if (cacheControl)
            headers.set("cache-control", cacheControl);

          const upstreamRes = await undiciFetch(targetUrl.toString(), {
            method: "PUT",
            headers,
            body,
          });

          const upstreamContentType = upstreamRes.headers.get("content-type");
          if (upstreamContentType) {
            res.setHeader("Content-Type", upstreamContentType);
          }
          res.statusCode = upstreamRes.status;

          if (!upstreamRes.body) {
            res.end();
            return;
          }

          const upstreamBody = upstreamRes.body as any;
          try {
            await pipeline(Readable.fromWeb(upstreamBody), res as any);
          }
          catch (e) {
            try {
              res.destroy(e as any);
            }
            catch {
              // ignore
            }
          }
        }
        catch (e) {
          const err = e as any;
          const message = err instanceof Error ? err.message : String(err);
          const cause = err?.cause;
          const causeMessage = cause instanceof Error ? cause.message : (cause ? String(cause) : "");
          res.statusCode = 502;
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          res.end(`OSS upload proxy failed: ${message}${causeMessage ? ` (cause: ${causeMessage})` : ""}`);
        }
      });
    },
  };
}

function electronDevPingPlugin(): Plugin {
  return {
    name: "tc-electron-dev-ping",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        try {
          const reqUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
          if (reqUrl.pathname !== "/__electron_ping") {
            next();
            return;
          }

          const nonce = reqUrl.searchParams.get("nonce") || "";
          const body = JSON.stringify({
            ok: true,
            app: "tuan-chat-web",
            dev: true,
            nonce,
          });

          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.setHeader("Cache-Control", "no-store");
          res.setHeader("X-Tuan-Chat-Web", "1");
          res.end(body);
        }
        catch {
          next();
        }
      });
    },
  };
}

function authRecoveryCompatPlugin(): Plugin {
  const legacyPath = "/api/core/authRecovery.ts";
  const nextPath = "/api/authRecovery.ts";

  return {
    name: "tc-auth-recovery-compat",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url?.startsWith(legacyPath)) {
          req.url = `${nextPath}${req.url.slice(legacyPath.length)}`;
        }
        next();
      });
    },
  };
}

export default defineConfig(({ command }) => {
  const _isDev = command === "serve";
  // const env = loadEnv(mode, process.cwd(), "");

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
      authRecoveryCompatPlugin(),
      fixCjsDefaultExportPlugin(),
      ossUploadProxyPlugin(),
      electronDevPingPlugin(),

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
            // BlockSuite 发布包的 *.map 指向了未随 npm 分发的 src/* 文件。
            // 一旦继续传递 sourcemap，Rollup 在报告 warning 时会反复尝试回溯并产生日志噪音。
            // 这里显式关闭输入/输出 sourcemap，保持构建可读性。
            sourceMaps: false,
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
          // 防止上游文件尾部 `//# sourceMappingURL=...` 继续触发 sourcemap 回溯。
          const codeWithoutSourceMapUrl = result.code.replace(/\n\/\/# sourceMappingURL=.*$/gm, "");
          return { code: codeWithoutSourceMapUrl, map: null };
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
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
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
        {
          find: /^api\/core\/authRecovery$/,
          replacement: resolve(__dirname, "api/authRecovery.ts"),
        },
        {
          find: /^\/api\/core\/authRecovery\.ts$/,
          replacement: resolve(__dirname, "api/authRecovery.ts"),
        },
        // BlockSuite packages export TypeScript sources (`./src/*.ts`) by default.
        // In Vite dev this can lead to:
        // - decorators not being applied (custom elements not defined) -> "Illegal constructor"
        // - mixed module instances (src vs dist) -> DI token mismatch / Yjs store issues
        // Force them to use prebuilt dist outputs.
        // 音频转码依赖 ffmpeg.wasm：固定到 ESM 入口，避免 Vite 在 Windows 下解析 package exports 失败
        {
          find: /^@ffmpeg\/ffmpeg$/,
          replacement: nm("node_modules/@ffmpeg/ffmpeg/dist/esm/index.js"),
        },
        {
          // lz-string 在 CJS/ESM 互操作下可能只暴露 default，导致依赖内的 `import * as lz` 调用失败。
          // 统一走 shim，保证 namespace/default 两种调用都可用。
          find: /^lz-string$/,
          replacement: resolve(__dirname, "app/shims/lzStringCompat.ts"),
        },
        {
          find: /^@ffmpeg\/util$/,
          replacement: nm("node_modules/@ffmpeg/util/dist/esm/index.js"),
        },
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

    // 使用独立 cacheDir，避免浏览器/开发服务复用旧的 optimize deps 缓存（默认路径 node_modules/.vite），
    // 导致请求到不存在的 `chunk-*.js` 文件。
    cacheDir: "node_modules/.vite-tuan-chat-web",

    server: {
      port: 5177,
      strictPort: true,
      host: "0.0.0.0",
      // Pre-transform requested modules more aggressively in dev.
      // This often helps heavy ESM graphs (like BlockSuite) on first open.
      preTransformRequests: true,
      // Warm up the most expensive routes/modules in dev to reduce the first-load latency.
      // This does NOT change module resolution (unlike optimizeDeps for @blocksuite/*).
      warmup: {
        clientFiles: [
          // iframe route entry
          "app/routes/blocksuiteFrame.tsx",

          // iframe host
          "app/components/chat/shared/components/blocksuiteDescriptionEditor.tsx",

          // route client chunk + browser runtime
          "app/components/chat/infra/blocksuite/frame/BlocksuiteRouteFrameClient.tsx",
          "app/components/chat/infra/blocksuite/frame/BlocksuiteDescriptionEditorRuntime.browser.tsx",
          "app/components/chat/infra/blocksuite/bootstrap/browser.ts",
          "app/components/chat/infra/blocksuite/runtime/runtimeLoader.browser.ts",
          "app/components/chat/infra/blocksuite/editors/createBlocksuiteEditor.browser.ts",
          "app/components/chat/infra/blocksuite/spaceWorkspaceRegistry.ts",

          // core bootstrap modules
          "app/components/chat/infra/blocksuite/spec/coreElements.browser.ts",
          "app/components/chat/infra/blocksuite/styles/frameBase.css",
          "app/components/chat/infra/blocksuite/styles/tcHeader.css",

          // common doc sources/providers
          "app/components/chat/infra/blocksuite/remoteDocSource.ts",
        ],
      },
    },

    // React Router dev loads route modules in SSR. Some upstream packages (e.g. BlockSuite)
    // export TypeScript sources in `exports`, which Node cannot execute if externalized.
    // Force Vite SSR to bundle/transpile them to avoid runtime syntax errors like:
    // "SyntaxError: Unexpected identifier 'lineStyle'".
    ssr: {
      // `dagre` is pure CommonJS (module.exports). If we bundle it into SSR ESM,
      // it may be evaluated without a CJS wrapper and crash with `module is not defined`.
      external: [
        "dagre",
        "qrcode",
      ],
      noExternal: [
        /^@blocksuite\//,
        /^@toeverything\//,
        "lodash",
        "fast-diff",
        "use-sync-external-store",
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

        // BlockSuite/AFFiNE transitive deps:
        // Pre-bundle these to reduce the amount of /node_modules/* requests in dev.
        // (We still exclude @blocksuite/* themselves to keep single-instance guarantees.)
        "zod",
        "yjs",
        "rxjs",
        "@preact/signals-core",

        // Markdown/code highlighting (CJS interop)
        "lowlight",
        "react-syntax-highlighter",

        // NOTE: Avoid pre-bundling lit/@lit and @blocksuite/* here.
        // They are extremely sensitive to duplicate module instances
        // (e.g. Lit's ReactiveElement / custom element constructors).
        // Mixing Vite pre-bundled deps with our alias-to-dist strategy can lead to
        // runtime errors like: "Failed to construct 'HTMLElement': Illegal constructor".

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
        "fast-diff",
        "pngjs",
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
        // BlockSuite/lit are intentionally excluded to prevent duplicate instances
        // between Vite pre-bundled deps and our alias-to-dist resolution.
        "@blocksuite/global",
        "@blocksuite/store",
        "@blocksuite/std",
        "@blocksuite/sync",
        "lit",
        "lit-element",
        "lit-html",
        "@lit/context",
        "@lit/reactive-element",
        "@lit/react",

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
      ],
    },
  };
});
