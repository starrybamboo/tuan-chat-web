import { createRouter } from "@tanstack/react-router";

import { routeTree } from "./routeTree.gen";

function createAppRouter() {
  return createRouter({
    routeTree,
    defaultPreload: "intent",
    scrollRestoration: true,
  });
}

declare module "@tanstack/react-router" {
  // oxlint-disable-next-line typescript/consistent-type-definitions -- TanStack Router 注册依赖 interface 声明合并。
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}

export function getRouter() {
  return createAppRouter();
}
