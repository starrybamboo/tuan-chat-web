import type { RouteConfig } from "@react-router/dev/routes";

import { index, route } from "@react-router/dev/routes";

export default [
  index("routes/chat.tsx"),
  route("feed", "../app/routes/feed.tsx"),
  route("role", "../app/routes/role.tsx"),
  route("create", "../app/routes/create.tsx"),
  route("profile", "../app/routes/profile.tsx"),
  route("home", "../app/routes/home.tsx"),
  route("module", "../app/routes/module.tsx"),
  route("chat", "../app/routes/chat.tsx"),
  route("community", "../app/routes/community.tsx"),
] satisfies RouteConfig;
