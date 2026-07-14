import { notFound } from "@tanstack/react-router";

export const DESIGN_SYSTEM_PATH = "/design-system";

/** 识别需要保持纯净视觉基准的 Design System 页面。 */
export function isDesignSystemPath(pathname: string) {
  return pathname === DESIGN_SYSTEM_PATH || pathname === `${DESIGN_SYSTEM_PATH}/`;
}

/** 阻止仅供开发调试的路由在生产环境渲染。 */
export function requireDevelopmentRoute(isDevelopment: boolean) {
  if (!isDevelopment) {
    throw notFound();
  }
}
