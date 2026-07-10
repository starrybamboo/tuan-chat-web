const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");
const { URL } = require("node:url");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");
const workspacePackagesRoot = path.resolve(workspaceRoot, "packages");
const workspaceNodeModulesRoot = path.resolve(workspaceRoot, "node_modules");
const emptyNodeModuleShim = path.resolve(projectRoot, "src/lib/empty-node-module.js");
const workspacePackageAliases = {
  "@tuanchat/domain": path.resolve(workspacePackagesRoot, "tuanchat-domain"),
  "@tuanchat/local-db": path.resolve(workspacePackagesRoot, "tuanchat-local-db"),
  "@tuanchat/openapi-client": path.resolve(workspacePackagesRoot, "tuanchat-openapi-client"),
  "@tuanchat/query": path.resolve(workspacePackagesRoot, "tuanchat-query"),
};

const config = getDefaultConfig(projectRoot);

const MOBILE_MEDIA_PROXY_PATH = "/__tuanchat_mobile_media_proxy__";

function isAllowedMediaProxyTarget(targetUrl) {
  const hostname = targetUrl.hostname.toLowerCase();
  return hostname === "media.tuan.chat" || hostname.endsWith(".media.tuan.chat");
}

function copyProxyResponseHeaders(upstream) {
  const headers = {};
  const contentType = upstream.headers.get("content-type");
  const cacheControl = upstream.headers.get("cache-control");
  if (contentType)
    headers["content-type"] = contentType;
  headers["cache-control"] = cacheControl || "public, max-age=31536000, immutable";
  return headers;
}

async function handleMobileMediaProxyRequest(req, res) {
  try {
    const requestUrl = new URL(req.url, "http://localhost");
    const rawTarget = requestUrl.searchParams.get("url");
    if (!rawTarget) {
      res.writeHead(400);
      res.end("Missing url");
      return;
    }

    const targetUrl = new URL(rawTarget);
    if (targetUrl.protocol !== "https:" || !isAllowedMediaProxyTarget(targetUrl)) {
      res.writeHead(403);
      res.end("Forbidden media target");
      return;
    }

    const upstream = await fetch(targetUrl.toString(), {
      headers: {
        referer: "https://tuan.chat/",
        "user-agent": req.headers["user-agent"] || "Mozilla/5.0",
      },
      method: "GET",
      redirect: "follow",
    });
    const body = Buffer.from(await upstream.arrayBuffer());
    res.writeHead(upstream.status, copyProxyResponseHeaders(upstream));
    res.end(body);
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.writeHead(502);
    res.end(`Mobile media proxy failed: ${message}`);
  }
}

config.resolver.assetExts = [...config.resolver.assetExts, "wasm"];
config.resolver.blockList = [/.*\.test\.[jt]sx?$/];

const defaultEnhanceMiddleware = config.server?.enhanceMiddleware;
config.server = {
  ...config.server,
  enhanceMiddleware(middleware, server) {
    const nextMiddleware = defaultEnhanceMiddleware
      ? defaultEnhanceMiddleware(middleware, server)
      : middleware;
    return (req, res, next) => {
      if (req.url?.startsWith(MOBILE_MEDIA_PROXY_PATH)) {
        void handleMobileMediaProxyRequest(req, res);
        return;
      }
      return nextMiddleware(req, res, next);
    };
  },
};

// 只监听移动端实际依赖的 workspace 包与根依赖目录，避免 Windows 上 Metro 扫描整仓导致 EMFILE。
config.watchFolders = [workspacePackagesRoot, workspaceNodeModulesRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  workspaceNodeModulesRoot,
];

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  fs: emptyNodeModuleShim,
  module: emptyNodeModuleShim,
  "node:fs": emptyNodeModuleShim,
  "node:module": emptyNodeModuleShim,
  "node:path": emptyNodeModuleShim,
  "node:url": emptyNodeModuleShim,
  path: emptyNodeModuleShim,
  url: emptyNodeModuleShim,
  ...workspacePackageAliases,
};

module.exports = config;
