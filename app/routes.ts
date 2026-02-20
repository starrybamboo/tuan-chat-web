import type { RouteConfig } from "@react-router/dev/routes";

import { index, layout, prefix, route } from "@react-router/dev/routes";

const ENABLE_AI_IMAGE_ROUTE = import.meta.env.DEV || import.meta.env.MODE === "test";

export default [
  // Blocksuite iframe: used for strong style isolation.
  route("blocksuite-frame", "routes/blocksuiteFrame.tsx"),
  route("room-map/:spaceId/:roomId", "routes/roomMapFrame.tsx"),

  // Dedicated login page (avoid wrapping by dashboard layout to prevent double modals).
  route("login", "routes/login.tsx"),

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
    route("activities", "routes/activities.tsx"),

    ...prefix("profile/:userId", [
      layout("routes/profile/profile.tsx", [
        index("routes/profile/homeTab.tsx"),
        route("activities", "routes/profile/activitiesTab.tsx"),
        route("works", "routes/profile/profileWorks.tsx"),
      ]),
    ]),

    route("repository", "routes/repository/index.tsx"),
    route("repository/detail/:id?", "routes/repository/detail.tsx"),
    route("repository/create", "routes/repository/create.tsx"),
    ...prefix("chat", [
      route("discover/my", "routes/chatDiscoverMy.tsx"),
      route("discover", "routes/chatDiscover.tsx"),
      layout("routes/chatLayout.tsx", [
        index("routes/chat.tsx"),
        route(":spaceId/doc/:docId", "routes/chatDoc.tsx"),
        route(":spaceId/:roomId/setting", "routes/chatRoomSetting.tsx"),
        route(":spaceId/:roomId?/:messageId?", "routes/chatSpace.tsx"),
      ]),
    ]),
    route("community/:communityId?", "routes/community.tsx"),
    route("community/create", "routes/communityCreatePost.tsx"),
    route("community/:communityId/:postId", "routes/communityPost.tsx"),
    route("settings", "routes/settings.tsx"),
    route("collection", "routes/collection.tsx"),
    route("resource", "routes/resource.tsx"),
    route("doc/:spaceId/:docId", "routes/doc.tsx"),
    ...(ENABLE_AI_IMAGE_ROUTE ? [route("ai-image", "routes/aiImage.tsx")] : []),
    route("invite/:code", "routes/invite.tsx"),
  ]),
] satisfies RouteConfig;
