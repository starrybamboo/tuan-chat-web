import { getChatRootRedirect } from "./chatRootRoute";

describe("chat root route", () => {
  it("redirects the context-free /chat entry to private chat", () => {
    expect(getChatRootRedirect()).toEqual({
      to: "/chat/$spaceId/{-$roomId}/{-$messageId}",
      params: { spaceId: "private" },
      replace: true,
    });
  });
});
