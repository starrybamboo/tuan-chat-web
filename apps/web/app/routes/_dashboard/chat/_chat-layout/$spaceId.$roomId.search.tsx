import { createFileRoute, useRouter } from "@tanstack/react-router";

import ChatMessageSearchPage from "@/components/chat/search/chatMessageSearchPage";
import { preloadChatRouteData } from "@/components/chat/hooks/preloadChatRouteData";
import { queryClient } from "@/queryClient";

type ChatSearchRouteSearch = {
  q: string;
};

function normalizeSearch(search: Record<string, unknown>): ChatSearchRouteSearch {
  return {
    q: typeof search.q === "string" ? search.q.slice(0, 120) : "",
  };
}

export const Route = createFileRoute("/_dashboard/chat/_chat-layout/$spaceId/$roomId/search")({
  validateSearch: normalizeSearch,
  loader: ({ params }) => preloadChatRouteData(queryClient, params),
  component: ChatMessageSearchRoute,
});

function ChatMessageSearchRoute() {
  const { spaceId: rawSpaceId, roomId: rawRoomId } = Route.useParams();
  const { q } = Route.useSearch();
  const router = useRouter();
  const spaceId = Number(rawSpaceId);
  const roomId = Number(rawRoomId);
  const roomPath = `/chat/${spaceId}/${roomId}`;

  return (
    <ChatMessageSearchPage
      spaceId={spaceId}
      roomId={roomId}
      query={q}
      onBack={() => router.history.push(roomPath)}
      onQueryChange={(nextQuery) => {
        const searchParams = new URLSearchParams();
        if (nextQuery) {
          searchParams.set("q", nextQuery);
        }
        const searchString = searchParams.toString();
        router.history.replace(`${roomPath}/search${searchString ? `?${searchString}` : ""}`);
      }}
      onSelectMessage={messageId => router.history.push(`${roomPath}/${messageId}`)}
    />
  );
}
