import type { Route } from "./+types/chatDiscover";

import DiscoverPage from "@/components/chat/discover/discoverPage";
import { createSeoMeta } from "@/utils/seo";

export function meta(_args: Route.MetaArgs) {
  return createSeoMeta({
    title: "公开归档发现",
    description: "浏览团剧共创公开归档的团剧模组与共创内容，快速发现适合开团的作品。",
    path: "/chat/discover",
    index: true,
  });
}

export default function ChatDiscoverRoute() {
  return (
    <div className="bg-base-200 h-full w-full overflow-y-auto overflow-x-visible">
      <DiscoverPage section="repository" mode="square" />
    </div>
  );
}
