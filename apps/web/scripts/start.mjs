import { existsSync, promises as fs, readFileSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import process from "node:process";
import url from "node:url";

const projectRoot = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..");
const workspaceRoot = path.resolve(projectRoot, "..", "..");

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

// Keep static-server env loading aligned with Vite's monorepo envDir.
for (const envFile of [".env", ".env.local", ".env.production", ".env.production.local"]) {
  applyEnvFile(path.join(workspaceRoot, envFile));
}

const port = Number(process.env.PORT || process.env.VITE_PORT || 5177);
const host = process.env.HOST || "0.0.0.0";
const clientRoot = path.join(workspaceRoot, "build", "client");
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
  [".wasm", "application/wasm"],
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

function isHashedAssetPath(filePath) {
  const segments = filePath.replaceAll("\\", "/").split("/");
  if (segments.length < 2 || segments.at(-2) !== "assets") {
    return false;
  }

  const fileName = segments.at(-1) ?? "";
  const extensionStart = fileName.lastIndexOf(".");
  const hashStart = fileName.lastIndexOf("-", extensionStart);
  if (extensionStart <= 0 || hashStart <= 0) {
    return false;
  }

  const hash = fileName.slice(hashStart + 1, extensionStart);
  const extension = fileName.slice(extensionStart + 1);
  return hash.length >= 6
    && /^[\w-]+$/.test(hash)
    && /^\w+$/.test(extension);
}

function resolveCacheControl(filePath, ext) {
  if (ext === ".html") {
    return "no-cache";
  }

  if (isHashedAssetPath(filePath)) {
    return "public, max-age=31536000, immutable";
  }

  return "public, max-age=3600";
}

async function serveFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = contentTypeByExt.get(ext) || "application/octet-stream";
  const buf = await fs.readFile(filePath);
  res.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control": resolveCacheControl(filePath, ext),
  });
  res.end(buf);
}

function isPathInside(root, target) {
  const relative = path.relative(root, target);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

const server = createServer(async (req, res) => {
  try {
    const reqUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const pathname = decodeURIComponent(reqUrl.pathname);

    // Normalize and prevent path traversal.
    const rel = pathname.replace(/^\/+/, "");
    const fileCandidate = path.join(clientRoot, rel);
    const normalized = path.resolve(fileCandidate);
    if (!isPathInside(clientRoot, normalized)) {
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
