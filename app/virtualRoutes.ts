import {
  index,
  layout,
  rootRoute,
  route,
} from "@tanstack/virtual-file-routes";

export const routes = rootRoute("__root.tsx", [
  route("/blocksuite-frame", "blocksuiteFrame.tsx"),
  route("/room-map/$spaceId/$roomId", "roomMapFrame.tsx"),
  route("/scroll-sequence-demo", "scrollSequenceDemo.tsx"),
  route("/scroll-sequence-motion-demo", "scrollSequenceMotionDemo.tsx"),
  route("/login", "login.tsx"),
  route("/invite/$code", "invite.tsx"),
  layout("dashboard", "_dashboard.tsx", [
    index("home.tsx"),
    route("/activities", "activities.tsx"),
    route("/role", "role/route.tsx", [
      index("role/index.tsx"),
      route("/{-$roleId}", "role/$roleId.tsx"),
    ]),
    route("/profile/$userId", "profile/route.tsx", [
      index("profile/index.tsx"),
      route("/works", "profile/works.tsx"),
      route("/activities", "profile/activitiesTab.tsx"),
    ]),
    route("/repository", "repository/index.tsx"),
    route("/repository/detail/{-$id}", "repository/detail/index.tsx"),
    route("/repository/commit-chain/{-$id}", "repository/commit-chain.tsx"),
    route("/repository/create", "repository/create.tsx"),
    route("/chat", [
      route("/discover/my", "chat/discover/my.tsx"),
      route("/discover/material/my", "chat/discover/material/my.tsx"),
      route("/discover/material", "chat/discover/material/index.tsx"),
      route("/discover", "chat/discover/index.tsx"),
      layout("chat-layout", "chat/route.tsx", [
        index("chat/index.tsx"),
        route("/$spaceId/doc/$docId", "chat/doc.tsx"),
        route("/$spaceId/$roomId/setting", "chat/room-setting.tsx"),
        route("/$spaceId/{-$roomId}/{-$messageId}", "chat/space.tsx"),
      ]),
    ]),
    route("/settings", "settings.tsx"),
    route("/notifications", "notifications.tsx"),
    route("/collection", "collection.tsx"),
    route("/material", "material.tsx"),
    route("/material/space/$spaceId", "spaceMaterial.tsx"),
    route("/resource", "resource.tsx"),
    route("/doc/$spaceId/$docId", "doc.tsx"),
    route("/feedback/{-$issueId}", "feedback.tsx"),
    route("/ai-image", "aiImage.tsx"),
  ]),
]);
