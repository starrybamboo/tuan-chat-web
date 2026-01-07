import {TuanChat} from "./TuanChat";

let tuanchat = new TuanChat();

function resolveApiBaseUrl(envBaseUrl: string | undefined): string | undefined {
  if (typeof window === 'undefined') {
    return envBaseUrl;
  }

  const fallback = window.location.origin;
  if (!envBaseUrl || envBaseUrl.trim().length === 0) {
    return fallback;
  }

  try {
    const url = new URL(envBaseUrl, window.location.href);
    const isLoopback = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]';
    const isSecureContext = window.isSecureContext;

    // 说明：如果产品设计就是要调用“用户本机 localhost 服务”，不要在这里自动改写 hostname。
    // 但需要注意：从非安全上下文（http 页面）请求 loopback，现代浏览器会触发 PNA 限制并拦截。
    if (isLoopback && !isSecureContext) {
      console.warn(
        '[TuanChat] 当前页面不是安全上下文(HTTPS)，请求本机 loopback(例如 localhost) 可能被浏览器 PNA 拦截。' +
        '建议将站点切换为 HTTPS，并确保本机服务支持 PNA 预检/跨域头。',
      );
    }

    return url.toString().replace(/\/$/, "");
  }
  catch {
    return fallback;
  }
}

if (typeof window !== 'undefined') {
  tuanchat = new TuanChat({
    BASE: resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL),
    WITH_CREDENTIALS: true,
    CREDENTIALS: "include",
    // 注意：TOKEN 需要是“动态读取”，否则登录后 tuanchat 仍会使用旧 token
    TOKEN: async () => localStorage?.getItem('token') || '',
  });
}

export { tuanchat };
