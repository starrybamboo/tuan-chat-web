import type { RouteConfig } from "@react-router/dev/routes";

import { index, layout, route } from "@react-router/dev/routes";

export default [
  // index("routes/dashBoard.tsx"),
  layout("routes/dashBoard.tsx", [
    // 临时举措
    // index("../app/routes/chat.tsx"),
    index("routes/home.tsx"),
    route("feed/:feedId?", "routes/feed.tsx"),
    route("role", "routes/role.tsx"),
    route("create", "routes/create.tsx"),
    route("profile", "routes/profile.tsx"),
    route("module", "routes/module.tsx"),
    route("chat/:spaceId?/:roomId?", "routes/chat.tsx"),
    route("community", "routes/community.tsx"),
    route("settings", "routes/settings.tsx"),
  ]),
] satisfies RouteConfig;
