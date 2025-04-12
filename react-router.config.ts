/* eslint-disable unicorn/filename-case */
// eslint会对react-router的路由文件报错，在这个文件内禁用
import type { Config } from "@react-router/dev/config";

export default {
  // Config options...
  // Server-side render by default, to enable SPA mode set this to `false`
  ssr: false, // 应用使用SPA模式
} satisfies Config;
