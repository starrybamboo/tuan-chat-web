import { describe, expect, it, vi } from "vitest";

import { syncDirectConversation } from "./direct-message-conversation-sync";

describe("direct conversation sync transport", () => {
  it("通过生成的私聊 controller 请求会话 syncId 增量", async () => {
    const syncConversation = vi.fn<(
      input: { syncId?: number; targetUserId: number },
    ) => Promise<unknown>>().mockResolvedValue({ data: { latestSyncId: 9, messages: [] }, success: true });
    const client = { messageDirectController: { syncConversation } };

    await syncDirectConversation(client as never, { syncId: 7, targetUserId: 42 });

    expect(syncConversation).toHaveBeenCalledWith({ syncId: 7, targetUserId: 42 });
  });
});
