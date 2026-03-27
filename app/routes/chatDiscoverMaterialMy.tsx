import type { Route } from "./+types/chatDiscoverMaterialMy";

import DiscoverPage from "@/components/chat/discover/discoverPage";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "发现" },
    { name: "description", content: "发现 · 我的素材包" },
  ];
}

export default function ChatDiscoverMaterialMyRoute() {
  return (
    <div className="bg-base-200 h-full w-full overflow-y-auto overflow-x-visible">
      <DiscoverPage section="material" mode="mine" />
    </div>
  );
}
