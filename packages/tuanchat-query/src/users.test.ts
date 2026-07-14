import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import { rollbackOptimisticQueryTransaction } from "./optimistic-cache";
import { beginUserInfoUpdateOptimisticMutation } from "./users";

describe("user optimistic cache", () => {
  it("资料更新即时同步公开资料、本人资料、元数据和私聊消息", async () => {
    const queryClient = new QueryClient();
    const originalProfile = { success: true, data: { userId: 7, username: "旧名", description: "旧签名", extra: { theme: "dark" } } };
    queryClient.setQueryData(["getMyUserInfo"], originalProfile);
    queryClient.setQueryData(["clientMetadataBatch", [], [7], []], {
      users: { 7: { userId: 7, username: "旧名" } },
    });
    queryClient.setQueryData(["dmInbox", 7], [{ messageId: 1, senderId: 7, senderUsername: "旧名" }]);

    const transaction = await beginUserInfoUpdateOptimisticMutation(queryClient, {
      userId: 7,
      username: "新名",
      description: "新签名",
      extra: { locale: "zh-CN" },
    });

    expect(queryClient.getQueryData<any>(["getMyUserInfo"])?.data).toMatchObject({
      userId: 7,
      username: "新名",
      description: "新签名",
      extra: { theme: "dark", locale: "zh-CN" },
    });
    expect(queryClient.getQueryData<any>(["clientMetadataBatch", [], [7], []])?.users[7].username).toBe("新名");
    expect(queryClient.getQueryData<any[]>(["dmInbox", 7])?.[0].senderUsername).toBe("新名");

    rollbackOptimisticQueryTransaction(queryClient, transaction);
    expect(queryClient.getQueryData(["getMyUserInfo"])).toEqual(originalProfile);
  });
});
