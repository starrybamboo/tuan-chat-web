import { createFileRoute, redirect } from "@tanstack/react-router";

import ChatPageMainContent from "@/components/chat/chatPageMainContent";
import { getChatRootRedirect } from "@/components/chat/hooks/chatRootRoute";
import { preloadChatRouteData } from "@/components/chat/hooks/preloadChatRouteData";
import { queryClient } from "@/queryClient";

export const Route = createFileRoute("/_dashboard/chat/_chat-layout/")({
  beforeLoad: () => {
    throw redirect(getChatRootRedirect());
  },
  loader: () => preloadChatRouteData(queryClient),
  component: Chat,
});

function Chat() {
  return <ChatPageMainContent />;
}
