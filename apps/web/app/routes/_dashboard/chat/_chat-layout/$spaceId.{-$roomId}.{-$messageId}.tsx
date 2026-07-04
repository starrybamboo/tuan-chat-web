import { createFileRoute } from "@tanstack/react-router";

import ChatPageMainContent from "@/components/chat/chatPageMainContent";
import { preloadChatRouteData } from "@/components/chat/hooks/preloadChatRouteData";
import { queryClient } from "@/queryClient";

export const Route = createFileRoute("/_dashboard/chat/_chat-layout/$spaceId/{-$roomId}/{-$messageId}")({
  loader: ({ params }) => preloadChatRouteData(queryClient, params),
  component: ChatSpace,
});

function ChatSpace() {
  return <ChatPageMainContent />;
}
