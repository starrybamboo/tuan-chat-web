import type { Plugin } from "vite";

import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { Buffer } from "node:buffer";
import { existsSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
// import process from "node:process";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fetch as undiciFetch } from "undici";
import { defineConfig } from "vite";

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
          for (const [key, value] of Object.entries(req.headers)) {
            if (!shouldForwardOssUploadHeader(key)) {
              continue;
            }
            const values = Array.isArray(value) ? value : [value];
            values.forEach((item) => {
              const normalizedValue = String(item ?? "").trim();
              if (normalizedValue) {
                headers.append(key, normalizedValue);
              }
            });
          }

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

function webgalAssetProxyPlugin(): Plugin {
  function buildTuanChatMediaOriginFallbackUrl(targetUrl: URL): string | null {
    const hostname = targetUrl.hostname.toLowerCase();
    if (hostname !== "media.tuan.chat" && !hostname.endsWith(".media.tuan.chat")) {
      return null;
    }
    const fallbackUrl = new URL("https://origin.tuan.chat");
    fallbackUrl.pathname = targetUrl.pathname;
    fallbackUrl.search = targetUrl.search;
    return fallbackUrl.toString();
  }

  function firstHeaderValue(value: string | string[] | undefined, fallback: string): string {
    if (Array.isArray(value)) {
      return value.find(item => String(item ?? "").trim()) || fallback;
    }
    return String(value || "").trim() || fallback;
  }

  async function fetchWebgalAssetViaTuanChat(targetUrl: URL, acceptHeader: string | string[] | undefined, userAgentHeader: string | string[] | undefined) {
    const requestHeaders = {
      accept: firstHeaderValue(acceptHeader, "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"),
      referer: "https://tuan.chat/",
      "user-agent": firstHeaderValue(userAgentHeader, "Mozilla/5.0"),
    };
    const firstResponse = await undiciFetch(targetUrl.toString(), {
      method: "GET",
      headers: requestHeaders,
    });
    if (firstResponse.ok) {
      return firstResponse;
    }

    const mediaOriginFallbackUrl = buildTuanChatMediaOriginFallbackUrl(targetUrl);
    if (!mediaOriginFallbackUrl) {
      return firstResponse;
    }

    const fallbackResponse = await undiciFetch(mediaOriginFallbackUrl, {
      method: "GET",
      headers: requestHeaders,
    });
    return fallbackResponse.ok ? fallbackResponse : firstResponse;
  }

  return {
    name: "tc-webgal-asset-proxy",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        try {
          const reqUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
          if (reqUrl.pathname !== "/api/webgal-asset-proxy") {
            next();
            return;
          }

          if ((req.method || "").toUpperCase() !== "GET") {
            res.statusCode = 405;
            res.setHeader("Content-Type", "text/plain; charset=utf-8");
            res.end("Method Not Allowed");
            return;
          }

          const targetUrlRaw = String(reqUrl.searchParams.get("url") || "").trim();
          let targetUrl: URL;
          try {
            targetUrl = new URL(targetUrlRaw);
          }
          catch {
            res.statusCode = 400;
            res.setHeader("Content-Type", "text/plain; charset=utf-8");
            res.end("Invalid asset URL");
            return;
          }

          if (!["http:", "https:"].includes(targetUrl.protocol)) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "text/plain; charset=utf-8");
            res.end("Asset URL protocol must be http(s)");
            return;
          }

          const upstreamRes = await fetchWebgalAssetViaTuanChat(targetUrl, req.headers.accept, req.headers["user-agent"]);

          res.statusCode = upstreamRes.status;
          const contentType = upstreamRes.headers.get("content-type");
          if (contentType) {
            res.setHeader("Content-Type", contentType);
          }
          const cacheControl = upstreamRes.headers.get("cache-control");
          if (cacheControl) {
            res.setHeader("Cache-Control", cacheControl);
          }
          res.setHeader("Access-Control-Allow-Origin", "*");

          if (!upstreamRes.body) {
            res.end();
            return;
          }

          await pipeline(Readable.fromWeb(upstreamRes.body as any), res as any);
        }
        catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          res.statusCode = 502;
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          res.end(`WebGAL asset proxy failed: ${message}`);
        }
      });
    },
  };
}

function shouldForwardOssUploadHeader(headerName: string): boolean {
  const normalized = headerName.toLowerCase();
  return ![
    "connection",
    "content-length",
    "host",
    "origin",
    "referer",
    "x-tc-oss-upload-url",
  ].includes(normalized);
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
      ossUploadProxyPlugin(),
      webgalAssetProxyPlugin(),
      electronDevPingPlugin(),
      react(),
      babel({
        presets: [reactCompilerPreset()],
      }),
    ],
    base: "/",
    resolve: {
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
          find: /^@ffmpeg\/util$/,
          replacement: nm("node_modules/@ffmpeg/util/dist/esm/index.js"),
        },
        {
          find: "@",
          replacement: resolve(__dirname, "app"),
        },
        {
          find: /^api$/,
          replacement: resolve(__dirname, "api/index.ts"),
        },
        {
          find: /^api\/(.*)$/,
          replacement: resolve(__dirname, "api/$1"),
        },
        {
          find: /^app\/(.*)$/,
          replacement: resolve(__dirname, "app/$1"),
        },
        // 手动添加与 tsconfig.json paths 对应的 alias，避免使用 tsconfigPaths 的动态解析
        {
          find: /^@tuanchat\/domain$/,
          replacement: resolve(__dirname, "packages/tuanchat-domain/src/index.ts"),
        },
        {
          find: /^@tuanchat\/domain\/message-draft$/,
          replacement: resolve(__dirname, "packages/tuanchat-domain/src/messageDraft.ts"),
        },
        {
          find: /^@tuanchat\/domain\/message-preview$/,
          replacement: resolve(__dirname, "packages/tuanchat-domain/src/messagePreview.ts"),
        },
        {
          find: /^@tuanchat\/domain\/message-type$/,
          replacement: resolve(__dirname, "packages/tuanchat-domain/src/messageType.ts"),
        },
        {
          find: /^@tuanchat\/domain\/state-command$/,
          replacement: resolve(__dirname, "packages/tuanchat-domain/src/stateCommand.ts"),
        },
        {
          find: /^@tuanchat\/domain\/(.*)$/,
          replacement: resolve(__dirname, "packages/tuanchat-domain/src/$1"),
        },
        {
          find: /^@tuanchat\/galgame-ai-contract$/,
          replacement: resolve(__dirname, "packages/galgame-ai-contract/src/index.ts"),
        },
        {
          find: /^@tuanchat\/galgame-ai-contract\/(.*)$/,
          replacement: resolve(__dirname, "packages/galgame-ai-contract/src/$1"),
        },
        {
          find: /^@tuanchat\/local-db$/,
          replacement: resolve(__dirname, "packages/tuanchat-local-db/src/index.ts"),
        },
        {
          find: /^@tuanchat\/local-db\/(.*)$/,
          replacement: resolve(__dirname, "packages/tuanchat-local-db/src/$1"),
        },
        {
          find: /^@tuanchat\/openapi-client$/,
          replacement: resolve(__dirname, "packages/tuanchat-openapi-client/src/index.ts"),
        },
        {
          find: /^@tuanchat\/openapi-client\/(.*)$/,
          replacement: resolve(__dirname, "packages/tuanchat-openapi-client/src/$1"),
        },
        {
          find: /^@tuanchat\/query$/,
          replacement: resolve(__dirname, "packages/tuanchat-query/src/index.ts"),
        },
        {
          find: /^@tuanchat\/query\/(.*)$/,
          replacement: resolve(__dirname, "packages/tuanchat-query/src/$1"),
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
