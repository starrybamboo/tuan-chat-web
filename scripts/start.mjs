import { spawn } from "node:child_process";
import { existsSync, promises as fs } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import process from "node:process";
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

  const server = createServer(async (req, res) => {
    try {
      const reqUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
      const pathname = decodeURIComponent(reqUrl.pathname);

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
