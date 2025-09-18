import type { RouteConfig } from "@react-router/dev/routes";

import { index, layout, route } from "@react-router/dev/routes";

export default [
  // index("routes/dashBoard.tsx"),
  layout("routes/dashBoard.tsx", [
    // 临时举措
    // index("../app/routes/chat.tsx"),
    index("routes/home.tsx"),
    route("feed/:feedId?", "routes/feed.tsx"),
    layout("routes/role.tsx", [
      // 当 URL 是 /role 时，渲染这个索引路由
      route("role", "routes/role/entry.tsx"),
      // 当 URL 是 /role/123 这种形式时，渲染这个动态路由
      route("role/:roleId?", "routes/role/roleId.tsx"),
    ]),
    route("create/:editingStageId?", "routes/create.tsx"),
    route("activities", "routes/activities.tsx"),
    route("profile/:userId", "routes/profile.tsx"),
    route("module", "routes/module/index.tsx"),
    route("module/create", "routes/module/create.tsx"),
    route("module/detail/:id?", "routes/module/detail.tsx"),
    route("chat/:spaceId?/:roomId?", "routes/chat.tsx"),
    route("community/:communityId?", "routes/community.tsx"),
    route("community/create", "routes/communityCreatePost.tsx"),
    route("community/:communityId/:postId", "routes/communityPost.tsx"),
    route("settings", "routes/settings.tsx"),
    route("collection", "routes/collection.tsx"),
  ]),
] satisfies RouteConfig;
