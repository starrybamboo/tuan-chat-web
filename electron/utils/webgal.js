/* eslint-disable no-console */
import electron from "electron";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const { BrowserWindow } = electron;

const WEBGAL_EXE_CANDIDATES = ["WebGAL_Terre.exe", "WebGAL_Teree.exe"];
const WEBGAL_PORT = 3001;
const WEBGAL_HEALTHCHECK_PATH = "/api/test";
const WEBGAL_BOOT_TIMEOUT_MS = 20_000;
const WEBGAL_HEALTHCHECK_INTERVAL_MS = 200;
const WEBGAL_HEALTHCHECK_REQUEST_TIMEOUT_MS = 800;

let webgalProcess = null;
let webgalWindow = null;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getWebGALHealthcheckUrl(port) {
  return `http://localhost:${port}${WEBGAL_HEALTHCHECK_PATH}`;
}

function normalizeGameDir(gameDir) {
  if (typeof gameDir !== "string")
    return "";

  const normalized = gameDir.trim();
  if (!normalized)
    return "";

  // 限制为一级目录名，避免通过参数拼接到任意 hash 路径。
  if (normalized.includes("/") || normalized.includes("\\"))
    return "";

  return normalized;
}

function getWebGALLaunchUrl(port, options = {}) {
  const baseUrl = new URL(`http://localhost:${port}`);
  const gameDir = normalizeGameDir(options.gameDir);
  if (gameDir) {
    baseUrl.hash = `/game/${encodeURIComponent(gameDir)}`;
  }
  return baseUrl.toString();
}

function getErrorMessage(error) {
  if (error instanceof Error)
    return error.message;
  return String(error);
}

function isPortAvailable(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const server = createServer();

    const finalize = (result) => {
      try {
        server.close();
      }
      catch {
        // ignore
      }
      resolve(result);
    };

    server.once("error", () => {
      finalize(false);
    });

    server.once("listening", () => {
      server.close(() => resolve(true));
    });

    try {
      server.listen(port, host);
    }
    catch {
      finalize(false);
    }
  });
}

async function isWebGALHealthy(port) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WEBGAL_HEALTHCHECK_REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(getWebGALHealthcheckUrl(port), {
      method: "GET",
      signal: controller.signal,
    });
    return res.ok;
  }
  catch {
    return false;
  }
  finally {
    clearTimeout(timer);
  }
}

async function waitForWebGALHealthy(
  port,
  { timeoutMs = WEBGAL_BOOT_TIMEOUT_MS, intervalMs = WEBGAL_HEALTHCHECK_INTERVAL_MS } = {},
) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isWebGALHealthy(port))
      return true;
    await delay(intervalMs);
  }
  return false;
}

function getWebGALBaseDir(app) {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "extraResources");
  }
  // __dirname = electron/utils，所以回退两级到项目根目录
  return path.join(__dirname, "..", "..", "extraResources");
}

function getWebGALPath(app) {
  const baseDir = getWebGALBaseDir(app);
  for (const exeName of WEBGAL_EXE_CANDIDATES) {
    const candidatePath = path.join(baseDir, exeName);
    if (existsSync(candidatePath))
      return candidatePath;
  }

  // 默认返回标准命名，便于报错信息更直观。
  return path.join(baseDir, WEBGAL_EXE_CANDIDATES[0]);
}

function startWebGAL(app) {
  const webgalPath = getWebGALPath(app);
  if (!existsSync(webgalPath)) {
    const message = `未找到 WebGAL 可执行文件：${webgalPath}`;
    console.error(message);
    return { ok: false, error: message };
  }

  if (webgalProcess) {
    console.log("WebGAL 进程已在运行中。");
    return { ok: true, alreadyRunning: true };
  }

  console.log(`正在从以下路径启动 WebGAL: ${webgalPath}`);
  const webgalDir = path.dirname(webgalPath);

  try {
    webgalProcess = spawn(webgalPath, [], {
      cwd: webgalDir,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
  }
  catch (error) {
    const message = `启动 WebGAL 子进程失败: ${getErrorMessage(error)}`;
    console.error(message);
    return { ok: false, error: message };
  }

  webgalProcess.on("error", (err) => {
    console.error("启动 WebGAL 子进程失败!", err);
  });

  webgalProcess.stdout?.on("data", (data) => {
    console.log(`[WebGAL stdout]: ${data}`);
  });
  webgalProcess.stderr?.on("data", (data) => {
    console.error(`[WebGAL stderr]: ${data}`);
  });
  webgalProcess.on("close", (code) => {
    console.log(`WebGAL 进程已退出，退出码: ${code}`);
    webgalProcess = null;
  });

  return { ok: true, started: true };
}

async function openWebGALWindow(port, options = {}) {
  const launchUrl = getWebGALLaunchUrl(port, options);

  if (webgalWindow && !webgalWindow.isDestroyed()) {
    try {
      const currentUrl = webgalWindow.webContents.getURL();
      if (currentUrl !== launchUrl) {
        await webgalWindow.loadURL(launchUrl);
      }
    }
    catch (error) {
      const message = `切换 WebGAL 窗口地址失败: ${getErrorMessage(error)}`;
      console.error(message);
      return { ok: false, error: message };
    }

    webgalWindow.focus();
    return { ok: true, focused: true, openedUrl: launchUrl };
  }

  webgalWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    title: "WebGAL",
  });

  try {
    await webgalWindow.loadURL(launchUrl);
  }
  catch (error) {
    const message = `打开 WebGAL 窗口失败: ${getErrorMessage(error)}`;
    console.error(message);
    if (webgalWindow && !webgalWindow.isDestroyed())
      webgalWindow.close();
    webgalWindow = null;
    return { ok: false, error: message };
  }

  webgalWindow.on("closed", () => {
    webgalWindow = null;
  });

  return { ok: true, openedUrl: launchUrl };
}

async function launchWebGALAndOpen(app, options = {}) {
  const port = WEBGAL_PORT;

  try {
    let healthy = await isWebGALHealthy(port);
    if (!healthy) {
      const availablePort = await isPortAvailable(port);
      if (!availablePort) {
        const message = `端口 ${port} 已被占用，且未检测到 WebGAL 服务。请释放端口后重试。`;
        console.error(`[webgal] ${message}`);
        return { ok: false, port, error: message };
      }

      const startResult = startWebGAL(app);
      if (!startResult.ok) {
        return { ok: false, port, error: startResult.error || "启动 WebGAL 进程失败" };
      }

      healthy = await waitForWebGALHealthy(port);
      if (!healthy) {
        const message = `WebGAL 启动超时（${Math.round(WEBGAL_BOOT_TIMEOUT_MS / 1000)} 秒）`;
        console.error(`[webgal] ${message}`);
        return { ok: false, port, error: message };
      }
    }

    const openResult = await openWebGALWindow(port, options);
    if (!openResult.ok) {
      return { ok: false, port, error: openResult.error || "打开 WebGAL 窗口失败" };
    }

    return { ok: true, port, openedUrl: openResult.openedUrl };
  }
  catch (error) {
    const message = `启动 WebGAL 失败: ${getErrorMessage(error)}`;
    console.error(`[webgal] ${message}`);
    return { ok: false, port, error: message };
  }
}

export function stopWebGAL() {
  if (webgalProcess) {
    console.log("正在关闭 WebGAL 进程...");
    webgalProcess.kill();
    webgalProcess = null;
  }
}

export function registerWebGalIpc({ ipcMain, app }) {
  const handleLaunchWebGAL = async (_event, options) => launchWebGALAndOpen(app, options);

  // 向后兼容旧的 send 用法（不关心返回值）。
  ipcMain.on("launch-webgal", (_event, options) => {
    void handleLaunchWebGAL(_event, options);
  });
  // 新调用方式：invoke，可让渲染进程拿到明确错误原因。
  ipcMain.handle("launch-webgal", handleLaunchWebGAL);
}
