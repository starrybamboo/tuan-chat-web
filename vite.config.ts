import type { Plugin } from "vite";

import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import react from "@vitejs/plugin-react";
import { Buffer } from "node:buffer";
import { existsSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
// import process from "node:process";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fetch as undiciFetch } from "undici";
import { defineConfig } from "vite";
import babel from "vite-plugin-babel";

const REACT_COMPILER_EXCLUDED_SOURCE_SUFFIXES: string[] = [];

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
        "fast-deep-equal",
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

  return {
    plugins: [
      ...tanstackStart({
        srcDirectory: "app",
        client: {
          entry: "main",
        },
        spa: {
          enabled: true,
        },
        start: {
          entry: "start",
        },
        router: {
          virtualRouteConfig: "app/virtualRoutes.ts",
        },
      }),
      tailwindcss(),
      fixCjsDefaultExportPlugin(),
      ossUploadProxyPlugin(),
      electronDevPingPlugin(),

      // NOTE:
      // Some upstream packages ship vanilla-extract sources or runtime that can
      // reference `document`. In production builds, `emitCss`
      // evaluates style modules and may crash with `document is not defined`.
      //
      // Using `transform` avoids executing those modules at build time.
      vanillaExtractPlugin({
        unstable_mode: "transform",
      }),

      react(),
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

      dedupe: [
        "react",
        "react-dom",
        "react-dom/client",
        "scheduler",
        "react/compiler-runtime",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-router",
        "zustand",
      ],
      alias: [
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
          // fast-deep-equal 的根入口和 react/es6 子路径都是 CJS。
          // BlockNote 等依赖会把它当成 ESM default 导入，Vite dev 下会直接炸。
          find: /^fast-deep-equal$/,
          replacement: resolve(__dirname, "app/shims/fastDeepEqualCompat.ts"),
        },
        {
          find: /^fast-deep-equal\/react\.js$/,
          replacement: resolve(__dirname, "app/shims/fastDeepEqualCompat.ts"),
        },
        {
          find: /^fast-deep-equal\/es6\/react\.js$/,
          replacement: resolve(__dirname, "app/shims/fastDeepEqualCompat.ts"),
        },
        {
          find: /^@ffmpeg\/util$/,
          replacement: nm("node_modules/@ffmpeg/util/dist/esm/index.js"),
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

    environments: {
      client: {
        build: {
          outDir: "build/client",
        },
      },
      server: {
        build: {
          outDir: "build/server",
        },
      },
    },

    build: {
      outDir: "build",
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
      preTransformRequests: true,
      // Warm up the current document editor path in dev.
      warmup: {
        clientFiles: [
          "app/components/chat/shared/components/BlockSuite/blocksuiteDescriptionEditor.tsx",
          "app/components/chat/infra/blocksuite/document/blockNoteSnapshot.ts",
          "app/components/chat/infra/blocksuite/document/docSnapshotCache.ts",
          "app/components/chat/infra/blocksuite/description/descriptionDocRemote.ts",
        ],
      },
    },

    ssr: {
      // `dagre` is pure CommonJS (module.exports). If we bundle it into SSR ESM,
      // it may be evaluated without a CJS wrapper and crash with `module is not defined`.
      external: [
        "dagre",
        "qrcode",
      ],
      noExternal: [
        "lodash",
        "fast-diff",
        "use-sync-external-store",
        "safe-buffer",
        "pngjs",
      ],
    },

    optimizeDeps: {
      // Prevent Vite from auto-optimizing discovered deps (which can accidentally
      // pull in vanilla-extract `*.css.ts` sources from node_modules).
      noDiscovery: true,

      // Explicitly pre-bundle only the deps we know are safe/needed.
      include: [
        // Ensure React JSX runtime is properly converted to ESM for browser.
        "react",
        "react-dom",
        "react-dom/client",
        "react/compiler-runtime",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",

        // Ensure TanStack Router runtime is pre-bundled with the same React instance.
        "@tanstack/react-router",
        "@tanstack/react-router-devtools",
        "zustand",

        // Pixi has a very large module graph; without pre-bundling it can trigger
        // browser resource exhaustion (ERR_INSUFFICIENT_RESOURCES) in dev.
        "pixi.js",
        "zod",
        "rxjs",
        "@preact/signals-core",

        // Markdown/code highlighting (CJS interop)
        "lowlight",
        "react-syntax-highlighter",

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

    },
  };
});
