import { createFileRoute } from "@tanstack/react-router";

import { ChatPageRoomSettingContent } from "@/components/chat/chatPageMainContent";
import { preloadChatRouteData } from "@/components/chat/hooks/preloadChatRouteData";
import { queryClient } from "@/queryClient";

export const Route = createFileRoute("/_dashboard/chat/_chat-layout/$spaceId/$roomId/setting")({
  loader: ({ params }) => preloadChatRouteData(queryClient, params),
  component: ChatRoomSettingRoute,
});

function ChatRoomSettingRoute() {
  return <ChatPageRoomSettingContent />;
}
