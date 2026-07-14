import { notFound } from "@tanstack/react-router";

export const DESIGN_SYSTEM_PATH = "/design-system";

/** 阻止仅供开发调试的路由在生产环境渲染。 */
export function requireDevelopmentRoute(isDevelopment: boolean) {
  if (!isDevelopment) {
    throw notFound();
  }
}
