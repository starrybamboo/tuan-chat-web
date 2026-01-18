import type { Config } from "@react-router/dev/config";
// 他妈的不要命名成reactRouter！！！！！！！！！！！！！！！！！！！ 会失效

export default {
  // Config options...
  // 关闭 SSR（SPA Mode）
  ssr: false,
  // 关闭构建期 prerender，避免构建期执行路由（等同 SSR 执行）
  prerender: false,
} satisfies Config;
