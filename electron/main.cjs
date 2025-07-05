const path = require("node:path");
const process = require("node:process");
// 控制应用生命周期和创建原生浏览器窗口的模组
const { app, BrowserWindow } = require("electron");

function createWindow() {
  // 创建浏览器窗口
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      // 书写渲染进程中的配置
      nodeIntegration: true, // 开启true这一步很重要,目的是为了vue文件中可以引入node和electron相关的API
      contextIsolation: false, // 可以使用require方法
      enableRemoteModule: true, // 可以使用remote方法
    },
  });

  const env = "pro2";
  // 配置热更新
  if (env === "pro") {
    const elePath = path.join(__dirname, "../node_modules/electron");
    require("electron-reload")("../", {
      electron: require(elePath),
    });
    // 热更新监听窗口
    mainWindow.loadURL("http://localhost:5173");
    // 打开开发工具
    mainWindow.webContents.openDevTools();
  }
  else {
    // 生产环境中要加载文件，打包的版本
    // Menu.setApplicationMenu(null)
    // 加载 index.html
    mainWindow.loadFile(path.resolve(__dirname, "../build/client/index.html")); // 新增
  }
}
// 这段程序将会在 Electron 结束初始化
// 和创建浏览器窗口的时候调用
// 部分 API 在 ready 事件触发后才能使用。
app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    // 通常在 macOS 上，当点击 dock 中的应用程序图标时，如果没有其他
    // 打开的窗口，那么程序会重新创建一个窗口。
    if (BrowserWindow.getAllWindows().length === 0)
      createWindow();
  });
});

// 除了 macOS 外，当所有窗口都被关闭的时候退出程序。 因此，通常对程序和它们在
// 任务栏上的图标来说，应当保持活跃状态，直到用户使用 Cmd + Q 退出。
app.on("window-all-closed", () => {
  if (process.platform !== "darwin")
    app.quit();
});
