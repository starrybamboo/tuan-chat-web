import type { Config } from "@react-router/dev/config";
// 他妈的不要命名成reactRouter！！！！！！！！！！！！！！！！！！！ 会失效

export default {
  // Config options...
  // Server-side render by default, to enable SPA mode set this to `false`
  ssr: false,
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
  // prerender: true,
} satisfies Config;
