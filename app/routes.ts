import type { RouteConfig } from "@react-router/dev/routes";

import { index, layout, route } from "@react-router/dev/routes";

export default [
  // index("routes/dashBoard.tsx"),

  layout("routes/dashBoard.tsx", [
    // 临时举措
    index("../app/routes/chat.tsx"),
    route("feed", "routes/feed.tsx"),
    route("role", "routes/role.tsx"),
    route("create", "routes/create.tsx"),
    route("profile", "routes/profile.tsx"),
    route("home", "routes/home.tsx"),
    route("module", "routes/module.tsx"),
    route("chat", "routes/chat.tsx"),
    route("community", "routes/community.tsx"),
    route("test", "components/newCharacter/CharacterAvatar.tsx"),
  ]),
] satisfies RouteConfig;
