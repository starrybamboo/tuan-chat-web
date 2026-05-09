import { createRouter } from "@tanstack/react-router";
import { routeTree } from "@/routeTree.gen";

function createAppRouter() {
  return createRouter({
    routeTree,
    defaultPreload: "intent",
    scrollRestoration: true,
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}

export function getRouter() {
  return createAppRouter();
}
