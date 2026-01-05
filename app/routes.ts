import type { RouteConfig } from "@react-router/dev/routes";

import { index, layout, prefix, route } from "@react-router/dev/routes";

export default [
  // index("routes/dashBoard.tsx"),
  layout("routes/dashBoard.tsx", [
    // 临时举措
    // index("../app/routes/chat.tsx"),
    index("routes/home.tsx"),
    route("feed/:feedId?", "routes/feed.tsx"),

    ...prefix("role", [
      // layout 提供了 element / <Outlet />，index 必须是它的子路由
      layout("routes/role.tsx", [
        index("routes/role/entry.tsx"), // -> /role
        route(":roleId?", "routes/role/roleId.tsx"), // -> /role/:roleId?
      ]),
    ]),
    route("create/:editingStageId?", "routes/create.tsx"),
    route("activities", "routes/activities.tsx"),

    ...prefix("profile/:userId", [
      layout("routes/profile/profile.tsx", [
        index("routes/profile/homeTab.tsx"),
        route("activities", "routes/profile/activitiesTab.tsx"),
        route("works", "routes/profile/profileWorks.tsx"),
      ]),
    ]),

    route("module", "routes/module/index.tsx"),
    route("module/create", "routes/module/create.tsx"),
    route("module/detail/:id?", "routes/module/detail.tsx"),
    route("chat/:spaceId?/:roomId?/:messageId?", "routes/chat.tsx"),
    route("community/:communityId?", "routes/community.tsx"),
    route("community/create", "routes/communityCreatePost.tsx"),
    route("community/:communityId/:postId", "routes/communityPost.tsx"),
    route("settings", "routes/settings.tsx"),
    route("collection", "routes/collection.tsx"),
    route("resource", "routes/resource.tsx"),
    route("doc-test", "routes/docTest.tsx"),
    route("invite/:code", "routes/invite.tsx"),
  ]),
] satisfies RouteConfig;
