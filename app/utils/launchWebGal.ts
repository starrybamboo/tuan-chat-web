export default function launchWebGal() {
  // 调用 preload 脚本中暴露的函数
  if (window.electronAPI) {
    window.electronAPI.launchWebGAL();
  }
  else {
    console.error("electronAPI is not available. Check your preload script configuration.");
  }
};
