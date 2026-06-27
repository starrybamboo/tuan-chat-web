import type { App, BrowserWindow } from "electron";

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { buildCandidatePorts, resolveDevServerUrl } from "./utils/devServerUrl";

export type RendererLoaderState = {
  resolvedDevServerUrl: string;
};

function rewriteUnexpectedLocalhostNavigationUrl(url: string, devServerUrl: string) {
  if (!url || !devServerUrl) {
    return "";
  }

  try {
    const target = new URL(url);
    const devServer = new URL(devServerUrl);
    const isLocalhostHost = (host: string) =>
      host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]";

    if (!isLocalhostHost(target.hostname) || !isLocalhostHost(devServer.hostname)) {
      return "";
    }
    if (target.origin === devServer.origin) {
      return "";
    }

    target.protocol = devServer.protocol;
    target.hostname = devServer.hostname;
    target.port = devServer.port;
    return target.toString();
  }
  catch {
    return "";
  }
}

export function getRendererRoot(app: App) {
  return path.join(app.getAppPath(), "build", "client");
}

export async function loadRenderer(app: App, mainWindow: BrowserWindow, state: RendererLoaderState) {
  const isDev = !app.isPackaged;
  const preferredDevServerUrl = String(
    process.env.ELECTRON_START_URL
    || process.env.VITE_DEV_SERVER_URL
    || "",
  ).trim();

  const devServerCachePath = path.join(app.getPath("userData"), "devserver.json");
  let cachedDevServerUrl = "";
  try {
    const raw = fs.readFileSync(devServerCachePath, "utf8");
    const json = JSON.parse(raw) as { url?: string };
    if (json && typeof json.url === "string")
      cachedDevServerUrl = json.url.trim();
  }
  catch {
    // ignore
  }

  const defaultPortRaw = Number(process.env.PORT || process.env.VITE_PORT || 5177);
  const defaultPort = Number.isFinite(defaultPortRaw) && defaultPortRaw > 0 ? defaultPortRaw : 5177;

  if (isDev) {
    mainWindow.webContents.on("did-fail-load", (_e, errorCode, errorDescription, validatedURL) => {
      console.error("[mainWindow] did-fail-load", { errorCode, errorDescription, validatedURL });
    });
    mainWindow.webContents.on("render-process-gone", (_e, details) => {
      console.error("[mainWindow] render-process-gone", details);
    });
    mainWindow.webContents.on("will-navigate", (event, url) => {
      const rewritten = rewriteUnexpectedLocalhostNavigationUrl(
        url,
        state.resolvedDevServerUrl || preferredDevServerUrl,
      );
      if (!rewritten) {
        return;
      }
      event.preventDefault();
      console.warn("[electron] rewrite unexpected localhost navigation", { from: url, to: rewritten });
      void mainWindow.loadURL(rewritten);
    });

    const candidatePorts = buildCandidatePorts({
      preferredPorts: [process.env.PORT, process.env.VITE_PORT].filter(Boolean),
      defaultPort,
      scanRange: 25,
    });

    state.resolvedDevServerUrl = await resolveDevServerUrl({
      preferredUrl: preferredDevServerUrl || cachedDevServerUrl || (defaultPort ? `http://localhost:${defaultPort}` : ""),
      host: "localhost",
      ports: candidatePorts,
      timeoutMs: 500,
      concurrency: 10,
    });

    if (!state.resolvedDevServerUrl && preferredDevServerUrl) {
      state.resolvedDevServerUrl = preferredDevServerUrl.replace(/\/+$/, "");
      console.warn("[electron] fallback to preferred dev server url", { preferredDevServerUrl });
    }

    if (!state.resolvedDevServerUrl) {
      const msg = `未能连接到前端 dev server。\n\n你可以：\n1) 先运行 pnpm dev\n2) 或设置环境变量 VITE_DEV_SERVER_URL / ELECTRON_START_URL\n\n尝试过的端口范围：${candidatePorts[0]}-${candidatePorts[candidatePorts.length - 1]}`;
      console.error("[electron] dev server not reachable", { preferredDevServerUrl, defaultPort, candidatePorts });
      await mainWindow.loadURL(`data:text/plain;charset=utf-8,${encodeURIComponent(msg)}`);
      return;
    }

    try {
      await mainWindow.loadURL(state.resolvedDevServerUrl);
    }
    catch (err) {
      const msg = `加载 dev server 失败：\n${state.resolvedDevServerUrl}\n\n${err instanceof Error ? err.message : String(err)}`;
      console.error("[electron] load dev server failed", { resolvedDevServerUrl: state.resolvedDevServerUrl, err });
      await mainWindow.loadURL(`data:text/plain;charset=utf-8,${encodeURIComponent(msg)}`);
      return;
    }

    try {
      fs.writeFileSync(devServerCachePath, JSON.stringify({ url: state.resolvedDevServerUrl, ts: Date.now() }, null, 2), "utf8");
    }
    catch {
      // ignore
    }
    return;
  }

  const indexPath = path.join(getRendererRoot(app), "index.html");
  try {
    if (!fs.existsSync(indexPath)) {
      const msg = `未找到前端构建产物：\n${indexPath}\n\n这通常表示打包前没有先执行前端构建。\n\n请在项目根目录执行：\n- pnpm build\n然后再执行：\n- pnpm electron:build:win:zip（或 nsis）`;
      console.error("[electron] missing build artifacts", { indexPath });
      await mainWindow.loadURL(`data:text/plain;charset=utf-8,${encodeURIComponent(msg)}`);
      return;
    }
  }
  catch (err) {
    console.error("[electron] failed to validate build artifacts", err);
  }

  await mainWindow.loadURL("app://./");
}
