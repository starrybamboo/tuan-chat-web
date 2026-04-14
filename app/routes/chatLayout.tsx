import type { Route } from "./+types/chatLayout";

import ChatPage from "@/components/chat/chatPage";
import { createSeoMeta } from "@/utils/seo";

export function meta(_args: Route.MetaArgs) {
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
