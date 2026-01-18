import { Buffer } from "node:buffer";
import { execSync, spawn } from "node:child_process";
import { existsSync, promises as fs, readFileSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import process from "node:process";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import url from "node:url";
import { Agent, ProxyAgent, fetch as undiciFetch } from "undici";

const projectRoot = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..");
const ssrEntry = path.join(projectRoot, "build", "server", "index.js");

function resolveWindowsSystemProxyUrl() {
  if (process.platform !== "win32")
    return "";

  const queryValue = (value) => {
    const out = execSync(`reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ${value}`, {
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
    });
    return String(out || "");
  };

  const parseRegSz = (text) => {
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

  const parseRegDwordEnabled = (text) => {
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

  const parseProxyServer = (value) => {
    const raw = String(value || "").trim();
    if (!raw)
      return "";

    if (/^https?:\/\//i.test(raw))
      return raw;

    if (raw.includes("=")) {
      const parts = raw.split(";").map(s => s.trim()).filter(Boolean);
      const map = new Map();
      for (const part of parts) {
        const idx = part.indexOf("=");
        if (idx <= 0)
          continue;
        map.set(part.slice(0, idx).trim().toLowerCase(), part.slice(idx + 1).trim());
      }
      const chosen = map.get("https") || map.get("http") || "";
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
    return parseProxyServer(parseRegSz(serverText));
  }
  catch {
    return "";
  }
}

function applyEnvFile(filePath) {
  if (!existsSync(filePath))
    return;

  const text = readFileSync(filePath, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#"))
      continue;

    const idx = line.indexOf("=");
    if (idx <= 0)
      continue;

    const key = line.slice(0, idx).trim();
    if (!key)
      continue;

    let value = line.slice(idx + 1).trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'")))
      value = value.slice(1, -1);

    if (process.env[key] === undefined)
      process.env[key] = value;
  }
}

// Allow local override via .env files (useful when Node cannot reach NovelAI without a proxy).
for (const envFile of [".env", ".env.local", ".env.production", ".env.production.local"]) {
  applyEnvFile(path.join(projectRoot, envFile));
}

const port = Number(process.env.PORT || process.env.VITE_PORT || 5177);
const host = process.env.HOST || "0.0.0.0";

if (existsSync(ssrEntry)) {
  const bin = process.platform === "win32"
    ? path.join(projectRoot, "node_modules", ".bin", "react-router-serve.cmd")
    : path.join(projectRoot, "node_modules", ".bin", "react-router-serve");

  const child = spawn(bin, [ssrEntry], {
    stdio: "inherit",
    env: { ...process.env, PORT: String(port), HOST: host },
  });

  child.on("exit", code => process.exit(code ?? 0));
  child.on("error", (err) => {
    console.error(err);
    process.exit(1);
  });

  process.on("SIGINT", () => child.kill("SIGINT"));
  process.on("SIGTERM", () => child.kill("SIGTERM"));
}
else {
  const clientRoot = path.join(projectRoot, "build", "client");
  const spaFallback = path.join(clientRoot, "__spa-fallback.html");
  const indexHtml = path.join(clientRoot, "index.html");

  if (!existsSync(clientRoot)) {
    console.error("[start] build/client not found. Run pnpm build first.");
    process.exit(1);
  }

  const contentTypeByExt = new Map([
    [".html", "text/html; charset=utf-8"],
    [".js", "text/javascript; charset=utf-8"],
    [".mjs", "text/javascript; charset=utf-8"],
    [".css", "text/css; charset=utf-8"],
    [".json", "application/json; charset=utf-8"],
    [".svg", "image/svg+xml"],
    [".png", "image/png"],
    [".jpg", "image/jpeg"],
    [".jpeg", "image/jpeg"],
    [".gif", "image/gif"],
    [".webp", "image/webp"],
    [".woff", "font/woff"],
    [".woff2", "font/woff2"],
    [".ttf", "font/ttf"],
    [".ico", "image/x-icon"],
  ]);

  const serveFile = async (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = contentTypeByExt.get(ext) || "application/octet-stream";
    const buf = await fs.readFile(filePath);
    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-cache",
    });
    res.end(buf);
  };

  const defaultNovelAiEndpoint = String(process.env.NOVELAPI_DEFAULT_ENDPOINT || "https://image.novelai.net").replace(/\/+$/, "");
  const allowAnyNovelAiEndpoint = String(process.env.NOVELAPI_ALLOW_ANY_ENDPOINT || "") === "1";

  const connectTimeoutMsRaw = Number(process.env.NOVELAPI_CONNECT_TIMEOUT_MS || "");
  const connectTimeoutMs = Number.isFinite(connectTimeoutMsRaw) && connectTimeoutMsRaw > 0 ? connectTimeoutMsRaw : 10_000;

  const proxyUrl = String(
    process.env.NOVELAPI_PROXY
    || process.env.HTTPS_PROXY
    || process.env.https_proxy
    || process.env.HTTP_PROXY
    || process.env.http_proxy
    || process.env.ALL_PROXY
    || process.env.all_proxy
    || resolveWindowsSystemProxyUrl()
    || "",
  ).trim();

  const upstreamDispatcher = proxyUrl
    ? new ProxyAgent({ uri: proxyUrl, connect: { timeout: connectTimeoutMs } })
    : new Agent({ connect: { timeout: connectTimeoutMs } });

  const isAllowedNovelAiEndpoint = (endpointUrl) => {
    if (allowAnyNovelAiEndpoint)
      return true;

    const host = String(endpointUrl.hostname || "").toLowerCase();
    if (host === "image.novelai.net")
      return true;
    if (host === "api.novelai.net")
      return true;

    // allow NovelAI tenant endpoints (pattern aligned with OpenAPI spec in api/novelai/api.json)
    if (host.endsWith(".tenant-novelai.knative.chi.coreweave.com"))
      return true;
    if (/\.tenant-novelai\.knative\.[0-9a-z]+\.coreweave\.cloud$/i.test(host))
      return true;

    return false;
  };

  const readBody = async (req) => {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  };

  const proxyNovelApi = async (req, res, reqUrl) => {
    try {
      const pathname = decodeURIComponent(reqUrl.pathname || "/");

      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      const endpointHeader = String(req.headers["x-novelapi-endpoint"] || "").trim();
      const endpointBase = (endpointHeader || defaultNovelAiEndpoint).replace(/\/+$/, "");

      let endpointUrl;
      try {
        endpointUrl = new URL(endpointBase);
      }
      catch {
        res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Invalid x-novelapi-endpoint");
        return;
      }

      if (endpointUrl.protocol !== "https:") {
        res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("NovelAPI endpoint must be https");
        return;
      }

      if (!isAllowedNovelAiEndpoint(endpointUrl)) {
        res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
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

      // NovelAI may require these headers for some environments.
      headers.set("referer", "https://novelai.net/");
      headers.set("user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

      let body;
      if (req.method && !["GET", "HEAD"].includes(req.method.toUpperCase())) {
        body = await readBody(req);
      }

      const upstreamRes = await undiciFetch(upstreamUrl.toString(), {
        method: req.method || "GET",
        headers,
        body,
        dispatcher: upstreamDispatcher,
      });

      const outHeaders = {};
      const upstreamContentType = upstreamRes.headers.get("content-type");
      const upstreamDisposition = upstreamRes.headers.get("content-disposition");
      if (upstreamContentType)
        outHeaders["Content-Type"] = upstreamContentType;
      if (upstreamDisposition)
        outHeaders["Content-Disposition"] = upstreamDisposition;

      res.writeHead(upstreamRes.status, outHeaders);

      if (!upstreamRes.body) {
        res.end();
        return;
      }

      // Stream response body to the client (avoids buffering large ZIP/images).
      try {
        await pipeline(Readable.fromWeb(upstreamRes.body), res);
      }
      catch (e) {
        try {
          res.destroy(e);
        }
        catch {
          // ignore
        }
      }
    }
    catch (e) {
      const err = e;
      const message = err instanceof Error ? err.message : String(err);
      const cause = err?.cause;
      const causeMessage = cause instanceof Error ? cause.message : (cause ? String(cause) : "");
      try {
        if (!res.headersSent)
          res.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
      }
      catch {
        // ignore
      }
      try {
        res.end(`NovelAPI proxy failed: ${message}${causeMessage ? ` (cause: ${causeMessage})` : ""}`);
      }
      catch {
        // ignore
      }
    }
  };

  const server = createServer(async (req, res) => {
    try {
      const reqUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
      const pathname = decodeURIComponent(reqUrl.pathname);

      if (pathname === "/api/novelapi" || pathname.startsWith("/api/novelapi/")) {
        await proxyNovelApi(req, res, reqUrl);
        return;
      }

      // Normalize and prevent path traversal.
      const rel = pathname.replace(/^\/+/, "");
      const fileCandidate = path.join(clientRoot, rel);
      const normalized = path.normalize(fileCandidate);
      if (!normalized.startsWith(clientRoot)) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }

      // If file exists, serve it.
      if (existsSync(normalized) && (await fs.stat(normalized)).isFile()) {
        await serveFile(res, normalized);
        return;
      }

      // If directory, try its index.html
      if (existsSync(normalized) && (await fs.stat(normalized)).isDirectory()) {
        const dirIndex = path.join(normalized, "index.html");
        if (existsSync(dirIndex)) {
          await serveFile(res, dirIndex);
          return;
        }
      }

      // SPA fallback.
      if (existsSync(spaFallback)) {
        await serveFile(res, spaFallback);
        return;
      }
      if (existsSync(indexHtml)) {
        await serveFile(res, indexHtml);
        return;
      }

      res.writeHead(404);
      res.end("Not Found");
    }
    catch (e) {
      res.writeHead(500);
      res.end("Internal Server Error");
      console.error(e);
    }
  });

  server.listen(port, host, () => {
    console.log(`[start] SPA server running at http://localhost:${port}/ (serving build/client)`);
  });
}
