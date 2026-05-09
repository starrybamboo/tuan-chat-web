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
import { defineConfig } from "vite";
import babel from "vite-plugin-babel";

const REACT_COMPILER_EXCLUDED_SOURCE_SUFFIXES = [
  "/app/components/chat/infra/blocksuite/spec/tcMentionElement.client.ts",
  "/app/components/chat/infra/blocksuite/editors/tcAffineEditorContainer.ts",
  "/app/components/chat/infra/blocksuite/editors/extensions/embed/embedIframeNoCredentiallessElements.ts",
];

function splitVendorChunk(id: string): string | undefined {
  const normalizedId = id.replace(/\\/g, "/");
  if (normalizedId.includes("vite/preload-helper")) {
    return "vendor-runtime";
  }
  if (
    normalizedId.includes("/app/components/common/dicer/")
    && !normalizedId.includes("/app/components/common/dicer/utils/")
    && !normalizedId.endsWith("/app/components/common/dicer/roleAbilityAliasMaps.ts")
  ) {
    return "dicer-runtime";
  }

  if (!normalizedId.includes("/node_modules/")) {
    return undefined;
  }

  if (normalizedId.includes("/react-syntax-highlighter/") || normalizedId.includes("/refractor/")) {
    return "vendor-markdown-highlight";
  }
  if (normalizedId.includes("/@ffmpeg/")) {
    return "vendor-ffmpeg";
  }
  if (normalizedId.includes("/pixi.js/")) {
    return "vendor-pixi";
  }
  return undefined;
}

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

export default defineConfig(() => {
  // const _isDev = command === "serve";
  // const env = loadEnv(mode, process.cwd(), "");

  const nm = (p: string) => {
    const abs = resolve(__dirname, p);
    return existsSync(abs) ? realpathSync(abs) : abs;
  };

  // Some BlockSuite packages still ship auto-accessor syntax through either:
  // - prebuilt `dist/*.js`
  // - exported `src/*.ts`
  // Browsers that don't support `accessor foo = ...` will fail at parse time.
  const blocksuiteAutoAccessorRE = /@blocksuite[\\/][^\\/]+[\\/](?:dist[\\/].*\.js|src[\\/].*\.[jt]sx?)(?:\?.*)?$/;

  return {
    plugins: [
      tailwindcss(),
      fixCjsDefaultExportPlugin(),
      ossUploadProxyPlugin(),
      electronDevPingPlugin(),

      // Downlevel BlockSuite auto-accessor syntax before Vite/rolldown emits browser bundles.
      // Example crashing syntax:
      // - `accessor menu = ...` from dist context-menu files
      // - `protected override accessor blockContainerStyles = ...` from src TypeScript exports
      {
        name: "tc-downlevel-blocksuite-auto-accessor",
        enforce: "pre",
        async transform(code, id) {
          if (!blocksuiteAutoAccessorRE.test(id))
            return null;
          if (!/\b(?:override\s+)?accessor\s+[A-Za-z_$]/.test(code))
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
              [
                "@babel/preset-typescript",
                {
                  allowDeclareFields: true,
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
      babel({
        filter: (id) => {
          const normalizedId = id.split("?")[0].replace(/\\/g, "/");
          if (!/\.[jt]sx?$/.test(normalizedId)) {
            return false;
          }
          if (
            normalizedId.includes("/node_modules/")
            || normalizedId.includes("/build/")
            || normalizedId.includes("/dist/")
            || normalizedId.includes("/release/")
            || normalizedId.includes("/extraResources/")
          ) {
            return false;
          }
          return !REACT_COMPILER_EXCLUDED_SOURCE_SUFFIXES.some(suffix => normalizedId.endsWith(suffix));
        },
        babelConfig: {
          presets: [
            [
              "@babel/preset-typescript",
              {
                allExtensions: true,
                isTSX: true,
              },
            ],
          ],
          plugins: ["babel-plugin-react-compiler"],
        },
      }),
    ],
    base: "/",
    resolve: {
      tsconfigPaths: true,

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
        "react/compiler-runtime",
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

    build: {
      rollupOptions: {
        output: {
          manualChunks: splitVendorChunk,
        },
      },
    },

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
          "app/components/chat/shared/components/BlockSuite/blocksuiteDescriptionEditor.tsx",

          // route client chunk + browser runtime
          "app/components/chat/infra/blocksuite/BlocksuiteRouteFrameClient.tsx",
          "app/components/chat/infra/blocksuite/BlocksuiteDescriptionEditorRuntime.browser.tsx",
          "app/components/chat/infra/blocksuite/bootstrap/browser.ts",
          "app/components/chat/infra/blocksuite/runtime/runtimeLoader.browser.ts",
          "app/components/chat/infra/blocksuite/editors/createBlocksuiteEditor.browser.ts",
          "app/components/chat/infra/blocksuite/space/spaceWorkspaceRegistry.ts",

          // core bootstrap modules
          "app/components/chat/infra/blocksuite/spec/coreElements.browser.ts",
          "app/components/chat/infra/blocksuite/styles/frameBase.css",
          "app/components/chat/infra/blocksuite/styles/tcHeader.css",

          // common doc sources/providers
          "app/components/chat/infra/blocksuite/space/runtime/remoteDocSource.ts",
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

    optimizeDeps: {
      // 临时下掉依赖预打包优化：让开发期按真实解析结果全量加载，
      // 避免手工 include/exclude 与 BlockSuite/Lit 单例 alias 混用时产生重复实例。
      // Vite 8 中 noDiscovery=true 且 include 为空即禁用 deps optimizer。
      noDiscovery: true,
      include: [],
    },
  };
});
