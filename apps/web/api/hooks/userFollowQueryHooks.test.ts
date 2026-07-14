import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import { rollbackOptimisticQueryTransaction } from "@tuanchat/query/optimistic-cache";
import { beginUserFollowOptimisticMutation } from "./userFollowQueryHooks";

describe("user follow optimistic cache", () => {
  it("关注状态即时切换并支持失败回滚", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["userIsFollowed", 7], { success: true, data: false });

    const transaction = await beginUserFollowOptimisticMutation(queryClient, 7, true);
    expect(queryClient.getQueryData(["userIsFollowed", 7])).toEqual({ success: true, data: true });

    rollbackOptimisticQueryTransaction(queryClient, transaction);
    expect(queryClient.getQueryData(["userIsFollowed", 7])).toEqual({ success: true, data: false });
  });
});
