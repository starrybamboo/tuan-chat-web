import type { Route } from "./+types/chatDiscoverMaterial";

import DiscoverPage from "@/components/chat/discover/discoverPage";
import { createSeoMeta } from "@/utils/seo";

export function meta(_args: Route.MetaArgs) {
  return createSeoMeta({
    title: "素材广场",
    description: "浏览团剧共创公开素材包与创作资源，为你的模组和设定寻找可复用素材。",
    path: "/chat/discover/material",
    index: true,
  });
}

export default function ChatDiscoverMaterialRoute() {
  return (
    <div className="bg-base-200 h-full w-full overflow-y-auto overflow-x-visible">
      <DiscoverPage section="material" mode="public" />
    </div>
  );
}
