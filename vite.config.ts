import type { Plugin } from "vite";

import * as babelCore from "@babel/core";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import viteReact from "@vitejs/plugin-react";
import { Buffer } from "node:buffer";
import { existsSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
// import process from "node:process";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fetch as undiciFetch } from "undici";
import { defineConfig } from "vite";

function shouldRunReactCompiler(id: string): boolean {
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
  return true;
}

function reactCompilerPlugin(): Plugin {
  return {
    name: "tc-react-compiler",
    enforce: "pre",
    async transform(code, id) {
      if (!shouldRunReactCompiler(id)) {
        return null;
      }

      const result = await babelCore.transformAsync(code, {
        filename: id.split("?")[0],
        caller: {
          name: "tc-react-compiler",
          supportsStaticESM: true,
        },
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
      });

      if (!result?.code) {
        return null;
      }
      return { code: result.code, map: result.map };
    },
  };
}

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

  if (normalizedId.includes("/@ffmpeg/")) {
    return "vendor-ffmpeg";
  }
  if (normalizedId.includes("/pixi.js/")) {
    return "vendor-pixi";
  }
  return undefined;
}

/**
 * Fix CommonJS default export issues for modules that still surface interop problems in dev.
 */
function fixCjsDefaultExportPlugin(): Plugin {
  return {
    name: "fix-cjs-default-export",
    apply: "serve",
    transform(code, _id) {
      // Target modules that commonly have CJS/default export issues
      const problematicModules = [
        "dagre",
        "qrcode",
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
      tanstackRouter({
        target: "react",
        autoCodeSplitting: true,
        routesDirectory: "app/routes",
        generatedRouteTree: "app/routeTree.gen.ts",
        routeFileIgnorePattern: "^routeTypes\\.ts$",
      }),
      tailwindcss(),
      fixCjsDefaultExportPlugin(),
      ossUploadProxyPlugin(),
      electronDevPingPlugin(),

      // NOTE:
      // Some upstream packages ship vanilla-extract sources that should stay as
      // transforms instead of being evaluated while the production build runs.
      vanillaExtractPlugin({
        unstable_mode: "transform",
      }),

      viteReact(),
      reactCompilerPlugin(),
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
        "react/compiler-runtime",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-router",
        "@tanstack/react-router-devtools",
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
          find: /^@ffmpeg\/util$/,
          replacement: nm("node_modules/@ffmpeg/util/dist/esm/index.js"),
        },
        {
          find: "@",
          replacement: resolve(__dirname, "app"),
        },
      ],
    },

    // 使用独立 cacheDir，避免浏览器/开发服务复用旧的 optimize deps 缓存（默认路径 node_modules/.vite），
    // 导致请求到不存在的 `chunk-*.js` 文件。
    cacheDir: "node_modules/.vite-tuan-chat-web",

    build: {
      // Pixi is isolated behind the lazy visual-effects overlay chunk and is
      // currently just above Vite's 500 kB default. Keep the limit tight so
      // future non-lazy chunk growth still surfaces during build.
      chunkSizeWarningLimit: 520,
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
    },

    optimizeDeps: {
      // 保留已知 CJS 互操作项，同时允许 Vite 自动发现纯 SPA 首屏依赖。
      include: [
        "react/compiler-runtime",
        // Lazy room effects 只有在打开房间后才会触发，提前预构建可避免 dev 下按需优化 504。
        "pixi.js",
      ],
    },
  };
});
