/* eslint-disable no-console */
import detectPort from "detect-port";
import { BrowserWindow } from "electron";
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const WEBGAL_EXE_NAME = "WebGAL_Teree.exe";
export const WEBGAL_PORT = 3001;

let webgalProcess = null;
let webgalWindow = null;

function getWebGALPath(app) {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "extraResources", WEBGAL_EXE_NAME);
  }
  // __dirname = electron/utils，所以回退两级到项目根目录
  return path.join(__dirname, "..", "..", "extraResources", WEBGAL_EXE_NAME);
}

export function startWebGAL(app) {
  const webgalPath = getWebGALPath(app);

  if (webgalProcess) {
    console.log("WebGAL 进程已在运行中。");
    return;
  }

  console.log(`正在从以下路径启动 WebGAL: ${webgalPath}`);
  const webgalDir = path.dirname(webgalPath);

  webgalProcess = spawn(webgalPath, [], {
    cwd: webgalDir,
  });

  webgalProcess.on("error", (err) => {
    console.error("启动 WebGAL 子进程失败!", err);
  });

  webgalProcess.stdout.on("data", (data) => {
    console.log(`[WebGAL stdout]: ${data}`);
  });
  webgalProcess.stderr.on("data", (data) => {
    console.error(`[WebGAL stderr]: ${data}`);
  });
  webgalProcess.on("close", (code) => {
    console.log(`WebGAL 进程已退出，退出码: ${code}`);
    webgalProcess = null;
  });
}

export function stopWebGAL() {
  if (webgalProcess) {
    console.log("正在关闭 WebGAL 进程...");
    webgalProcess.kill();
    webgalProcess = null;
  }
}

export function registerWebGalIpc({ ipcMain, app }) {
  ipcMain.on("launch-webgal", async () => {
    const port = WEBGAL_PORT;

    if (webgalWindow && !webgalWindow.isDestroyed()) {
      webgalWindow.focus();
      return;
    }

    const openWebGALWindowWithRetry = (retries = 5) => {
      if (retries <= 0) {
        console.error("无法连接到 WebGAL 服务器。请检查其是否正常运行或被其他程序占用。");
        return;
      }

      webgalWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        title: "WebGAL",
      });

      webgalWindow.loadURL(`http://localhost:${port}`).catch(() => {
        console.log(`连接失败，1秒后重试... (剩余 ${retries - 1} 次)`);
        if (webgalWindow && !webgalWindow.isDestroyed()) {
          webgalWindow.close();
        }
        webgalWindow = null;
        setTimeout(() => openWebGALWindowWithRetry(retries - 1), 1000);
      });

      webgalWindow.on("closed", () => {
        webgalWindow = null;
      });
    };

    try {
      const occupiedPort = await detectPort(port);

      if (port === occupiedPort) {
        console.log(`端口 ${port} 未被占用，正在启动 WebGAL...`);
        startWebGAL(app);
        setTimeout(openWebGALWindowWithRetry, 3000);
      }
      else {
        console.log(`端口 ${port} 已被占用，直接打开窗口。`);
        openWebGALWindowWithRetry();
      }
    }
    catch (err) {
      console.error("检查端口或启动 WebGAL 时出错:", err);
    }
  });
}
