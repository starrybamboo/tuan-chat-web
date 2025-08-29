/* eslint-disable no-console */
const { spawn } = require("node:child_process"); // 用于创建子进程
const fs = require("node:fs");
const path = require("node:path");
const process = require("node:process");
const detectPort = require("detect-port").default; // 用于检测端口占用

// 控制应用生命周期和创建原生浏览器窗口的模组
const { app, BrowserWindow, protocol, ipcMain, Menu } = require("electron");
// // --- 忽略证书错误以解决 SSL handshake failed 问题 ---
// app.commandLine.appendSwitch("ignore-certificate-errors");

// 用于管理 WebGAL 子进程和窗口 ---
let webgalProcess = null; // 存放 WebGAL 子进程的引用
let webgalWindow = null; // 存放 WebGAL 窗口的引用
const WebGAL_EXE_NAME = "WebGAL_Terre.exe";
const WebGAL_PORT = 3001;

// 在 app ready 之前注册自定义协议
// 这使得我们能像处理 http 请求一样处理应用内的文件请求
protocol.registerSchemesAsPrivileged([
  {
    scheme: "app",
    privileges: {
      secure: true, // 将协议注册为安全协议
      standard: true, // 遵循 URL 规范
      supportFetchAPI: true, // 支持 Fetch API
    },
  },
]);

function createWindow() {
  // 创建浏览器窗口
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      // 书写渲染进程中的配置
      contextIsolation: true, // 可以使用require方法
      enableRemoteModule: true, // 可以使用remote方法
      preload: path.join(__dirname, "preload.js"), // 指定 preload 脚本
    },
  });

  Menu.setApplicationMenu(null);

  const env = "pro2";
  // 配置热更新
  if (env === "pro") {
    const elePath = path.join(__dirname, "../node_modules/electron");
    require("electron-reload")("../", {
      electron: require(elePath),
    });
    // 热更新监听窗口
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  }
  else {
    // 生产环境中要加载文件，打包的版本
    // Menu.setApplicationMenu(null)
    // 使用自定义协议加载应用的根目录，而不是具体的 index.html 文件
    mainWindow.loadURL("app://./");
  }
}

// 区分开发环境和生产（打包后）环境
function getWebGALPath() {
  // 在生产环境中，extraResources 被放在应用根目录的 resources 文件夹下
  if (app.isPackaged) {
    // process.resourcesPath 指向 .../app.asar 所在的目录
    return path.join(process.resourcesPath, "extraResources", WebGAL_EXE_NAME);
  }
  // 在开发环境中，直接指向项目根目录下的 extraResources 文件夹
  // __dirname 是 electron/main.cjs 所在的目录，所以需要回退一级
  return path.join(__dirname, "..", "extraResources", WebGAL_EXE_NAME);
}

// 启动 WebGAL 子进程的函数 ---
// 在 electron/main.cjs 文件中

function startWebGAL() {
  const webgalPath = getWebGALPath();

  if (webgalProcess) {
    console.log("WebGAL 进程已在运行中。");
    return;
  }

  console.log(`正在从以下路径启动 WebGAL: ${webgalPath}`);
  const webgalDir = path.dirname(webgalPath);

  // 使用 spawn 启动子进程。
  // cwd (current working directory) 设置为 .exe 所在目录，以确保它可以正确找到资源文件
  webgalProcess = spawn(webgalPath, [], {
    cwd: webgalDir,
  });

  // 捕获启动失败
  webgalProcess.on("error", (err) => {
    console.error("启动 WebGAL 子进程失败!", err);
  });

  // 监听子进程输出
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

// 这段程序将会在 Electron 结束初始化和创建浏览器窗口的时候调用
app.whenReady().then(() => {
  // 实现自定义协议的具体逻辑
  protocol.registerFileProtocol("app", (request, callback) => {
    // 从请求 URL 中解析出需要加载的文件路径
    const url = request.url.substr("app://./".length);
    const filePath = path.join(__dirname, "../build/client", url);

    fs.stat(filePath, (err, stats) => {
      if (err) {
        // 如果文件或目录不存在 (err 不为 null), 说明这是一个前端路由的虚拟路径
        // 此时, 我们就返回根目录的 index.html, 这完美复刻了 Nginx 的 try_files 逻辑
        const indexPath = path.join(__dirname, "../build/client", "index.html");
        callback({ path: indexPath });
        return;
      }

      // 如果请求的是一个目录 (例如初始加载 'app://./')
      if (stats.isDirectory()) {
        // 加载该目录下的 index.html
        const indexPath = path.join(filePath, "index.html");
        callback({ path: indexPath });
      }
      else {
        // 如果请求的是一个文件 (例如 an asset like main.js or style.css), 直接返回该文件
        callback({ path: filePath });
      }
    });
  });

  createWindow();

  app.on("activate", () => {
    // 通常在 macOS 上，当点击 dock 中的应用程序图标时，如果没有其他
    // 打开的窗口，那么程序会重新创建一个窗口。
    if (BrowserWindow.getAllWindows().length === 0)
      createWindow();
  });

  // 设置 IPC 监听器，用于从渲染进程接收启动命令 ---
  ipcMain.on("launch-webgal", async () => {
    const port = WebGAL_PORT;

    // 检查 WebGAL 窗口是否已经打开，如果已打开则聚焦它
    if (webgalWindow && !webgalWindow.isDestroyed()) {
      webgalWindow.focus();
      return;
    }

    const openWebGALWindowWithRetry = (retries = 5) => {
      if (retries <= 0) {
        console.error("无法连接到 WebGAL 服务器。请检查其是否正常运行或被其他程序占用。");
        // 在这里可以添加一个对话框提示用户连接失败
        // dialog.showErrorBox('连接失败', '无法连接到 WebGAL 服务器。');
        return;
      }

      webgalWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        title: "WebGAL",
      });

      // 尝试加载 URL，如果失败，则进入 catch 块
      webgalWindow.loadURL(`http://localhost:${port}`).catch(() => {
        console.log(`连接失败，1秒后重试... (剩余 ${retries - 1} 次)`);
        if (webgalWindow && !webgalWindow.isDestroyed()) {
          webgalWindow.close();
        }
        webgalWindow = null;
        // 等待1秒后再次调用自己，并减少重试次数
        setTimeout(() => openWebGALWindowWithRetry(retries - 1), 1000);
      });

      webgalWindow.on("closed", () => {
        webgalWindow = null;
      });
    };

    try {
      // 使用 detectPort 检查 3001 端口是否被占用
      const occupiedPort = await detectPort(port);

      if (port === occupiedPort) {
        // 端口未被占用，说明 WebGAL 没有运行
        console.log(`端口 ${port} 未被占用，正在启动 WebGAL...`);
        startWebGAL();

        setTimeout(openWebGALWindowWithRetry, 3000);
      }
      else {
        // 端口已被占用，我们假设就是 WebGAL 在运行
        console.log(`端口 ${port} 已被占用，直接打开窗口。`);
        openWebGALWindowWithRetry();
      }
    }
    catch (err) {
      console.error("检查端口或启动 WebGAL 时出错:", err);
    }
  });
});

// 除了 macOS 外，当所有窗口都被关闭的时候退出程序。 因此，通常对程序和它们在
// 任务栏上的图标来说，应当保持活跃状态，直到用户使用 Cmd + Q 退出。
app.on("window-all-closed", () => {
  if (process.platform !== "darwin")
    app.quit();
});

// 在应用退出时，确保 WebGAL 子进程也被关闭 ---
app.on("will-quit", () => {
  if (webgalProcess) {
    console.log("正在关闭 WebGAL 进程...");
    webgalProcess.kill(); // 强制关闭子进程
  }
});
