import type { Route } from "./+types/chatDiscoverMy";

import DiscoverPage from "@/components/chat/discover/discoverPage";
import { createSeoMeta } from "@/utils/seo";

export function meta(_args: Route.MetaArgs) {
  return createSeoMeta({
    title: "我的归档",
    description: "查看当前账号在团剧共创中的个人归档内容。",
    path: "/chat/discover/my",
    index: false,
  });
}

export default function ChatDiscoverMyRoute() {
  return (
    <div className="bg-base-200 h-full w-full overflow-y-auto overflow-x-visible">
      <DiscoverPage section="repository" mode="my" />
    </div>
  );
}
