const { contextBridge, ipcRenderer } = require("electron");

// 在 window 对象上暴露一个安全的方法，而不是直接暴露整个 ipcRenderer
contextBridge.exposeInMainWorld("electronAPI", {
  launchWebGAL: () => ipcRenderer.send("launch-webgal"),
  novelaiGenerateImage: payload => ipcRenderer.invoke("novelai:generate-image", payload),
});
