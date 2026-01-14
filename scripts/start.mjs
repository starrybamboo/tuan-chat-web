import { Buffer } from "node:buffer";
import { spawn } from "node:child_process";
import { existsSync, promises as fs } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import process from "node:process";
import { Readable } from "node:stream";
import url from "node:url";

const projectRoot = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..");
const ssrEntry = path.join(projectRoot, "build", "server", "index.js");

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

  const isAllowedNovelAiEndpoint = (endpointUrl) => {
    if (allowAnyNovelAiEndpoint)
      return true;

    const host = String(endpointUrl.hostname || "").toLowerCase();
    if (host === "image.novelai.net")
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

    let upstreamRes;
    try {
      upstreamRes = await fetch(upstreamUrl.toString(), {
        method: req.method || "GET",
        headers,
        body,
      });
    }
    catch (e) {
      res.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(`NovelAPI proxy failed: ${e instanceof Error ? e.message : String(e)}`);
      return;
    }

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
      Readable.fromWeb(upstreamRes.body).pipe(res);
    }
    catch {
      const buf = Buffer.from(await upstreamRes.arrayBuffer());
      res.end(buf);
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
