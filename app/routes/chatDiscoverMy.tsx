import type { Route } from "./+types/chatDiscoverMy";

import ChatPage from "@/components/chat/chatPage";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "发现" },
    { name: "description", content: "发现 · 我的归档" },
  ];
}

export default function ChatDiscoverMyRoute() {
  return (
    <div className="bg-base-200 h-full w-full overflow-y-auto overflow-x-hidden">
      <ChatPage initialMainView="discover" discoverMode="my" />
    </div>
  );
}
