import type { Route } from "./+types/chatDiscover";

import ChatPage from "@/components/chat/chatPage";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "发现" },
    { name: "description", content: "发现 · 已归档群聊" },
  ];
}

export default function ChatDiscoverRoute() {
  return (
    <div className="bg-base-200 h-full w-full overflow-y-auto overflow-x-hidden">
      <ChatPage initialMainView="discover" discoverMode="square" />
    </div>
  );
}
