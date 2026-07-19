export function getChatRootRedirect() {
  return {
    to: "/chat/$spaceId/{-$roomId}/{-$messageId}",
    params: { spaceId: "private" },
    replace: true,
  } as const;
}
