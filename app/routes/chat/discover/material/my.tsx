import type { RouteMetaArgs } from "@/router/routeTypes";

import DiscoverPage from "@/components/chat/discover/discoverPage";
import { createSeoMeta } from "@/utils/seo";

export function meta(_args: RouteMetaArgs) {
  return createSeoMeta({
    title: "我的素材包",
    description: "查看当前账号在团剧共创中的个人素材包。",
    path: "/chat/discover/material/my",
    index: false,
  });
}

export default function ChatDiscoverMaterialMyRoute() {
  return (
    <div className="bg-base-200 h-full w-full overflow-y-auto overflow-x-visible">
      <DiscoverPage section="material" mode="mine" />
    </div>
  );
}
