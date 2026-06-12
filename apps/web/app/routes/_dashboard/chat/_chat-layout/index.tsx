import { createFileRoute } from "@tanstack/react-router";

import ChatPageMainContent from "@/components/chat/chatPageMainContent";

export const Route = createFileRoute("/_dashboard/chat/_chat-layout/")({
  component: Chat,
});

function Chat() {
  return <ChatPageMainContent />;
}
