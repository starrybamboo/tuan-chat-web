export default function launchWebGal(): boolean {
  // 调用 preload 脚本中暴露的函数；Web 环境不报错，直接跳过。
  if (window.electronAPI) {
    window.electronAPI.launchWebGAL();
    return true;
  }
  return false;
}
