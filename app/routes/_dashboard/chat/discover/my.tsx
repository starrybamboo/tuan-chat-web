import type { RouteMetaArgs } from "@/routes/routeTypes";
import { createFileRoute } from "@tanstack/react-router";

import DiscoverPage from "@/components/chat/discover/discoverPage";
import { createSeoMeta } from "@/utils/seo";

export function meta(_args: RouteMetaArgs) {
  return createSeoMeta({
    title: "我的归档",
    description: "查看当前账号在团剧共创中的个人归档内容。",
    path: "/chat/discover/my",
    index: false,
  });
}

export const Route = createFileRoute("/_dashboard/chat/discover/my")({
  head: () => ({
    meta: meta({ params: {} }),
  }),
  component: ChatDiscoverMyRoute,
});

export default function ChatDiscoverMyRoute() {
  return (
    <div className="bg-base-200 h-full w-full overflow-y-auto overflow-x-visible">
      <DiscoverPage section="repository" mode="my" />
    </div>
  );
}
