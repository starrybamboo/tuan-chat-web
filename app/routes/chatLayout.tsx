import type { Route } from "./+types/chatLayout";

import ChatPage from "@/components/chat/chatPage";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "tuan-chat" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function ChatLayoutRoute() {
  return (
    <div className="bg-base-200 h-full w-full overflow-y-auto overflow-x-hidden">
      <ChatPage />
    </div>
  );
}
