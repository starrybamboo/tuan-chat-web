import { BrowserWindow, Menu, shell, type App, type MenuItemConstructorOptions } from "electron";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { loadRenderer, type RendererLoaderState } from "./rendererLoader";

type ApplicationMenuOptions = {
  onCheckForUpdates: () => void;
};

function resolveWindowIconPath(app: App) {
  const iconFile = process.platform === "win32" ? "icon.ico" : "icon.png";
  const iconPath = path.join(app.getAppPath(), "build", "icons", iconFile);
  return fs.existsSync(iconPath) ? iconPath : undefined;
}

function toggleDevTools(mainWindow: BrowserWindow) {
  const { webContents } = mainWindow;
  if (webContents.isDevToolsOpened()) {
    webContents.closeDevTools();
    return;
  }
  webContents.openDevTools({ mode: "detach" });
}

/**
 * 构建最小应用菜单，恢复复制/粘贴/重载/缩放等标准可访问入口。
 * macOS 额外提供应用菜单；Windows/Linux 通过窗口 autoHideMenuBar 隐藏菜单栏，
 * 用户按 Alt 可临时呼出，键盘加速键（复制/粘贴等）始终可用。
 */
function buildApplicationMenu(app: App, { onCheckForUpdates }: ApplicationMenuOptions): void {
  const isMac = process.platform === "darwin";
  const isDev = !app.isPackaged;
  const template: MenuItemConstructorOptions[] = [];
  const viewSubmenu: MenuItemConstructorOptions[] = [
    { role: "reload", label: "重新加载" },
    { role: "forceReload", label: "强制重新加载" },
    { type: "separator" },
    { role: "resetZoom", label: "重置缩放" },
    { role: "zoomIn", label: "放大" },
    { role: "zoomOut", label: "缩小" },
  ];

  if (isDev) {
    viewSubmenu.push(
      { type: "separator" },
      {
        label: "开发者工具",
        accelerator: isMac ? "Cmd+Alt+I" : "Ctrl+Shift+I",
        click: (_menuItem, browserWindow) => {
          if (browserWindow instanceof BrowserWindow) {
            toggleDevTools(browserWindow);
          }
        },
      },
    );
  }

  if (isMac) {
    template.push({
      label: app.name,
      submenu: [
        { role: "about", label: "关于" },
        { type: "separator" },
        { role: "services", label: "服务" },
        { type: "separator" },
        { role: "hide", label: "隐藏" },
        { role: "hideOthers", label: "隐藏其他" },
        { role: "unhide", label: "全部显示" },
        { type: "separator" },
        { role: "quit", label: "退出" },
      ],
    });
  }

  template.push(
    {
      label: "编辑",
      submenu: [
        { role: "undo", label: "撤销" },
        { role: "redo", label: "重做" },
        { type: "separator" },
        { role: "cut", label: "剪切" },
        { role: "copy", label: "复制" },
        { role: "paste", label: "粘贴" },
        { role: "selectAll", label: "全选" },
      ],
    },
    {
      label: "视图",
      submenu: viewSubmenu,
    },
    {
      label: "窗口",
      submenu: [
        { role: "minimize", label: "最小化" },
        { role: "close", label: "关闭" },
      ],
    },
    {
      label: "帮助",
      submenu: [
        {
          label: "检查更新",
          click: onCheckForUpdates,
        },
        { type: "separator" },
        {
          label: "打开官网",
          click: () => {
            void shell.openExternal("https://tuan.chat/");
          },
        },
      ],
    },
  );

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

export async function createMainWindow(app: App, rendererState: RendererLoaderState, menuOptions: ApplicationMenuOptions) {
  const preloadPath = path.join(app.getAppPath(), "electron", "preload", "index.cjs");
  const icon = resolveWindowIconPath(app);
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 800,
    // 应用默认暗色主题（见 apps/web/index.html 防 FOUC 脚本），用接近的背景色减少启动白屏。
    backgroundColor: "#030712",
    title: "团剧共创",
    ...(icon ? { icon } : {}),
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      preload: preloadPath,
      sandbox: false,
    },
  });

  buildApplicationMenu(app, menuOptions);

  mainWindow.webContents.on("before-input-event", (event, input) => {
    if (app.isPackaged) {
      return;
    }

    const key = String(input.key || "").toLowerCase();
    const isF12 = key === "f12";
    const isCtrlShiftI = key === "i" && input.control && input.shift;
    const isCmdShiftI = key === "i" && input.meta && input.shift;

    if (!isF12 && !isCtrlShiftI && !isCmdShiftI) {
      return;
    }

    event.preventDefault();
    toggleDevTools(mainWindow);
  });

  await loadRenderer(app, mainWindow, rendererState);
  return mainWindow;
}
