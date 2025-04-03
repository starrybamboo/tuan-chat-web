import type { RouteConfig } from "@react-router/dev/routes";

import { index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("auth", "view/auth.tsx"),
] satisfies RouteConfig;
