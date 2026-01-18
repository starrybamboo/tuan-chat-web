import type { Plugin } from "vite";

import * as babelCore from "@babel/core";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import { Buffer } from "node:buffer";
import { execSync } from "node:child_process";
import { existsSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { Agent, ProxyAgent, fetch as undiciFetch } from "undici";
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

function novelApiProxyPlugin(config: { defaultEndpoint: string; allowAnyEndpoint: boolean; proxyUrl: string; connectTimeoutMs: number }): Plugin {
  const defaultNovelAiEndpoint = config.defaultEndpoint.replace(/\/+$/, "");
  const allowAnyNovelAiEndpoint = config.allowAnyEndpoint;
  const connectTimeoutMs = config.connectTimeoutMs > 0 ? config.connectTimeoutMs : 10_000;
  const proxyUrl = String(config.proxyUrl || "").trim();

  const upstreamDispatcher = proxyUrl
    ? new ProxyAgent({ uri: proxyUrl, connect: { timeout: connectTimeoutMs } })
    : new Agent({ connect: { timeout: connectTimeoutMs } });

  const isAllowedNovelAiEndpoint = (endpointUrl: URL) => {
    if (allowAnyNovelAiEndpoint)
      return true;

    const host = String(endpointUrl.hostname || "").toLowerCase();
    if (host === "image.novelai.net")
      return true;
    if (host === "api.novelai.net")
      return true;
    if (host.endsWith(".tenant-novelai.knative.chi.coreweave.com"))
      return true;
    if (/\.tenant-novelai\.knative\.[0-9a-z]+\.coreweave\.cloud$/i.test(host))
      return true;

    return false;
  };

  const readBody = async (req: any) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  };

  return {
    name: "tc-novelapi-proxy",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        try {
          const reqUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
          const pathname = decodeURIComponent(reqUrl.pathname);

          if (!(pathname === "/api/novelapi" || pathname.startsWith("/api/novelapi/"))) {
            next();
            return;
          }

          if (req.method === "OPTIONS") {
            res.statusCode = 204;
            res.end();
            return;
          }

          const endpointHeader = String(req.headers["x-novelapi-endpoint"] || "").trim();
          const endpointBase = (endpointHeader || defaultNovelAiEndpoint).replace(/\/+$/, "");

          let endpointUrl: URL;
          try {
            endpointUrl = new URL(endpointBase);
          }
          catch {
            res.statusCode = 400;
            res.setHeader("Content-Type", "text/plain; charset=utf-8");
            res.end("Invalid x-novelapi-endpoint");
            return;
          }

          if (endpointUrl.protocol !== "https:") {
            res.statusCode = 400;
            res.setHeader("Content-Type", "text/plain; charset=utf-8");
            res.end("NovelAPI endpoint must be https");
            return;
          }

          if (!isAllowedNovelAiEndpoint(endpointUrl)) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "text/plain; charset=utf-8");
            res.end("NovelAPI endpoint is not allowed");
            return;
          }

          const upstreamPath = pathname.replace(/^\/api\/novelapi/, "") || "/";
          const upstreamUrl = new URL(upstreamPath + (reqUrl.search || ""), endpointUrl.toString());

          const headers = new Headers();
          const auth = String(req.headers.authorization || "").trim();
          if (auth)
            headers.set("authorization", auth);

          const contentType = String(req.headers["content-type"] || "").trim();
          if (contentType)
            headers.set("content-type", contentType);

          const accept = String(req.headers.accept || "").trim();
          if (accept)
            headers.set("accept", accept);

          headers.set("referer", "https://novelai.net/");
          headers.set("user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

          let body: Buffer | undefined;
          if (req.method && !["GET", "HEAD"].includes(req.method.toUpperCase())) {
            body = await readBody(req);
          }

          const upstreamRes = await undiciFetch(upstreamUrl.toString(), {
            method: req.method || "GET",
            headers,
            body,
            dispatcher: upstreamDispatcher,
          });

          const upstreamContentType = upstreamRes.headers.get("content-type");
          const upstreamDisposition = upstreamRes.headers.get("content-disposition");
          if (upstreamContentType)
            res.setHeader("Content-Type", upstreamContentType);
          if (upstreamDisposition)
            res.setHeader("Content-Disposition", upstreamDisposition);

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
            // Avoid crashing the dev server on stream errors (connection reset, aborted, etc.).
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
          res.end(`NovelAPI proxy failed: ${message}${causeMessage ? ` (cause: ${causeMessage})` : ""}`);
        }
      });
    },
  };
}

function resolveWindowsSystemProxyUrl(): string {
  if (process.platform !== "win32")
    return "";

  const queryValue = (value: string) => {
    const out = execSync(`reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ${value}`, {
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
    });
    return String(out || "");
  };

  const parseRegSz = (text: string) => {
    const line = String(text || "")
      .split(/\r?\n/)
      .map(s => s.trimEnd())
      .find(s => s.includes("REG_SZ"));
    if (!line)
      return "";
    const idx = line.indexOf("REG_SZ");
    if (idx < 0)
      return "";
    return line.slice(idx + "REG_SZ".length).trim();
  };

  const parseRegDwordEnabled = (text: string) => {
    const line = String(text || "")
      .split(/\r?\n/)
      .map(s => s.trimEnd())
      .find(s => s.includes("REG_DWORD"));
    if (!line)
      return false;
    const idx = line.indexOf("0x");
    if (idx < 0)
      return false;
    const hex = line.slice(idx + 2).trim();
    if (!hex)
      return false;
    const value = Number.parseInt(hex, 16);
    return Number.isFinite(value) && value !== 0;
  };

  const parseProxyServer = (value: string) => {
    const raw = value.trim();
    if (!raw)
      return "";

    if (/^https?:\/\//i.test(raw))
      return raw;

    if (raw.includes("=")) {
      const parts = raw.split(";").map(s => s.trim()).filter(Boolean);
      const map = new Map<string, string>();
      for (const part of parts) {
        const idx = part.indexOf("=");
        if (idx <= 0)
          continue;
        map.set(part.slice(0, idx).trim().toLowerCase(), part.slice(idx + 1).trim());
      }
      const https = map.get("https");
      const http = map.get("http");
      const chosen = https || http || "";
      if (!chosen)
        return "";
      if (/^https?:\/\//i.test(chosen))
        return chosen;
      return `http://${chosen}`;
    }

    if (/^(?:socks|socks5)=/i.test(raw))
      return "";

    return `http://${raw}`;
  };

  try {
    const enabledText = queryValue("ProxyEnable");
    if (!parseRegDwordEnabled(enabledText))
      return "";

    const serverText = queryValue("ProxyServer");
    const server = parseRegSz(serverText);
    return parseProxyServer(server);
  }
  catch {
    return "";
  }
}

export default defineConfig(({ command, mode }) => {
  const _isDev = command === "serve";
  const env = loadEnv(mode, process.cwd(), "");

  const novelApiConnectTimeoutMsRaw = Number(env.NOVELAPI_CONNECT_TIMEOUT_MS || "");
  const novelApiConnectTimeoutMs = Number.isFinite(novelApiConnectTimeoutMsRaw) && novelApiConnectTimeoutMsRaw > 0
    ? novelApiConnectTimeoutMsRaw
    : 10_000;

  const novelApiConfig = {
    defaultEndpoint: String(env.NOVELAPI_DEFAULT_ENDPOINT || "https://image.novelai.net"),
    allowAnyEndpoint: String(env.NOVELAPI_ALLOW_ANY_ENDPOINT || "") === "1",
    proxyUrl: String(
      env.NOVELAPI_PROXY
      || env.HTTPS_PROXY
      || env.https_proxy
      || env.HTTP_PROXY
      || env.http_proxy
      || env.ALL_PROXY
      || env.all_proxy
      || resolveWindowsSystemProxyUrl()
      || "",
    ),
    connectTimeoutMs: novelApiConnectTimeoutMs,
  };

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
      novelApiProxyPlugin(novelApiConfig),

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

          // iframe host + runtime loader
          "app/components/chat/shared/components/blocksuiteDescriptionEditor.tsx",

          // runtime dynamic imports (from loadBlocksuiteRuntime)
          "app/components/chat/infra/blocksuite/embedded/createEmbeddedAffineEditor.ts",
          "app/components/chat/infra/blocksuite/spaceWorkspaceRegistry.ts",

          // core custom elements registration
          "app/components/chat/infra/blocksuite/spec/coreElements.ts",

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
