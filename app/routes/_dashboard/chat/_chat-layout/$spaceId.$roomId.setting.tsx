import { createFileRoute } from "@tanstack/react-router";
import { ChatPageRoomSettingContent } from "@/components/chat/chatPageMainContent";

export const Route = createFileRoute("/_dashboard/chat/_chat-layout/$spaceId/$roomId/setting")({
  component: ChatRoomSettingRoute,
});

export default function ChatRoomSettingRoute() {
  return <ChatPageRoomSettingContent />;
}
