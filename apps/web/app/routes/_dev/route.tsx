import { createFileRoute, Outlet } from "@tanstack/react-router";

import { requireDevelopmentRoute } from "@/utils/devRouteAccess";

export const Route = createFileRoute("/_dev")({
  beforeLoad: () => requireDevelopmentRoute(import.meta.env.DEV),
  component: DevRouteLayout,
});

function DevRouteLayout() {
  return <Outlet />;
}
