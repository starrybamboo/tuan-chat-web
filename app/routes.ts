import type { RouteConfig } from "@react-router/dev/routes";

import { index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("topbar", "../app/components/topbanner/Topbanner.tsx"),
] satisfies RouteConfig;
