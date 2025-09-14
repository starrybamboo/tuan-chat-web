/**
 * --- 轮询端口的辅助函数 ---
 * 它会反复尝试连接指定端口，直到成功或超时
 * @param port
 * @param timeout
 * @param interval
 */
export function pollPort(port: number, timeout = 15000, interval = 500): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const check = () => {
      if (Date.now() - startTime > timeout) {
        reject(new Error(`等待 ${port} 端口响应超时 (${timeout / 1000} 秒)`));
        return;
      }
      // 尝试 fetch。只要服务器开始监听，即便是 404 也会成功。
      // 只有在服务器未监听时才会进入 catch 块。
      fetch(`http://localhost:${port}`)
        .then(() => resolve()) // 连接成功，服务器已就绪
        .catch(() => setTimeout(check, interval)); // 连接失败，稍后重试
    };
    check();
  });
}
