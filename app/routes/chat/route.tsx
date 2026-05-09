import type { RouteMetaArgs } from "@/router/routeTypes";

import ChatPage from "@/components/chat/chatPage";
import { createSeoMeta } from "@/utils/seo";
import "@/components/chat/chatRouteStyles.css";
import "@/components/common/scrollbar.css";

export function meta(_args: RouteMetaArgs) {
  return createSeoMeta({
    title: "聊天空间",
    description: "团剧共创内部聊天与协作空间。",
    path: "/chat",
    index: false,
  });
}

export default function ChatLayoutRoute() {
  return (
    <div className="bg-base-200 h-full w-full overflow-y-auto overflow-x-visible">
      <ChatPage />
    </div>
  );
}
