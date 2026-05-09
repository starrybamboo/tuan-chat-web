import { createFileRoute } from "@tanstack/react-router";
import { ChatPageDocContent } from "@/components/chat/chatPageMainContent";

export const Route = createFileRoute("/_dashboard/chat/_chat-layout/$spaceId/doc/$docId")({
  component: ChatDocRoute,
});

export default function ChatDocRoute() {
  return <ChatPageDocContent />;
}
