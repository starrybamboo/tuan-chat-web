/**
 * --- 轮询服务可用性的辅助函数 ---
 * 它会反复尝试请求指定目标（端口或 URL），直到成功或超时
 * @param target 端口号或完整 URL
 * @param timeout
 * @param interval
 */
function resolvePollTarget(target: number | string): string {
  if (typeof target === "number") {
    return `http://localhost:${target}`;
  }
  const normalized = target.trim();
  if (!normalized) {
    throw new Error("pollPort target is empty");
  }
  if (/^https?:\/\//i.test(normalized)) {
    return normalized.replace(/\/$/, "");
  }
  return `http://${normalized.replace(/\/$/, "")}`;
}

export function pollPort(target: number | string, timeout = 15000, interval = 500): Promise<void> {
  const targetUrl = resolvePollTarget(target);
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const check = () => {
      if (Date.now() - startTime > timeout) {
        reject(new Error(`等待 ${targetUrl} 响应超时 (${timeout / 1000} 秒)`));
        return;
      }
      // 尝试 fetch。只要服务器开始监听，即便是 404 也会成功。
      // 只有在服务器未监听时才会进入 catch 块。
      fetch(targetUrl)
        .then(() => resolve()) // 连接成功，服务器已就绪
        .catch(() => setTimeout(check, interval)); // 连接失败，稍后重试
    };
    check();
  });
}
