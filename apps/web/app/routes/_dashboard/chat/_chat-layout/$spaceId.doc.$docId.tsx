import { createFileRoute } from "@tanstack/react-router";

import { ChatPageDocContent } from "@/components/chat/chatPageMainContent";
import { preloadChatRouteData } from "@/components/chat/hooks/preloadChatRouteData";
import { queryClient } from "@/queryClient";

export const Route = createFileRoute("/_dashboard/chat/_chat-layout/$spaceId/doc/$docId")({
  loader: ({ params }) => preloadChatRouteData(queryClient, params),
  component: ChatDocRoute,
});

function ChatDocRoute() {
  return <ChatPageDocContent />;
}
