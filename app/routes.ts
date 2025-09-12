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
    route("create/:editingStageId?", "routes/create.tsx"),
    route("activities", "routes/activities.tsx"),
    route("profile/:userId", "routes/profile.tsx"),
    route("module", "routes/module/index.tsx"),
    route("module/create", "routes/module/create.tsx"),
    route("module/detail/:id?", "routes/module/detail.tsx"),
    route("chat/:spaceId?/:roomId?", "routes/chat.tsx"),
    route("community/:communityId?", "routes/community.tsx"),
    route("community/create", "routes/communityCreatePost.tsx"),
    route("community/:communityId/post/:postId", "routes/communityPost.tsx"),
    route("post/:postId", "routes/post.tsx"),
    route("settings", "routes/settings.tsx"),
    route("collection", "routes/collection.tsx"),
  ]),
] satisfies RouteConfig;
