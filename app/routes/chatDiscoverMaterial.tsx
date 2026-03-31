import type { Route } from "./+types/chatDiscoverMaterial";

import DiscoverPage from "@/components/chat/discover/discoverPage";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "发现" },
    { name: "description", content: "发现 · 素材广场" },
  ];
}

export default function ChatDiscoverMaterialRoute() {
  return (
    <div className="bg-base-200 h-full w-full overflow-y-auto overflow-x-visible">
      <DiscoverPage section="material" mode="public" />
    </div>
  );
}
