import type { Config } from "@react-router/dev/config";
// 他妈的不要命名成reactRouter！！！！！！！！！！！！！！！！！！！ 会失效

export default {
  // Config options...
  // 传统 SSR 模式（稳定可靠）
  ssr: false,
  // 预渲染配置 - 构建时生成静态 HTML
  prerender: [
    "/",
    "/chat",
    "/community",
    "/create",
    "/activities",
    "/feed",
    "/module/create",
    "/role",
    "/module/detail",
    "/collection",
  ],
} satisfies Config;
