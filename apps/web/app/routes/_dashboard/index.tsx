import { createFileRoute, redirect } from "@tanstack/react-router";

import type { RouteMetaArgs } from "@/routes/routeTypes";

import { createSeoMeta } from "@/utils/seo";

export function meta(_args: RouteMetaArgs) {
  return createSeoMeta({
    title: "进入团剧共创",
    description: "团剧共创首页会根据当前登录状态跳转到对应的工作区。",
    path: "/",
    index: false,
  });
}

export const Route = createFileRoute("/_dashboard/")({
  beforeLoad: () => {
    throw redirect({
      to: "/chat/$spaceId/{-$roomId}/{-$messageId}",
      params: { spaceId: "private" },
      replace: true,
    });
  },
  head: () => ({
    meta: meta({ params: {} }),
  }),
});
