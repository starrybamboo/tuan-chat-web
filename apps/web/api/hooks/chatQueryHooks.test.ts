import { QueryClient } from "@tanstack/react-query";
import { rollbackOptimisticQueryTransaction } from "@tuanchat/query/optimistic-cache";
import { describe, expect, it } from "vitest";

import { beginRoomUpdateOptimisticMutation, roomInfoQueryKey } from "./chatQueryHooks";

describe("chatQueryHooks", () => {
  it("房间更新同步详情和所有用户房间列表缓存", async () => {
    const queryClient = new QueryClient();
    const detailKey = roomInfoQueryKey(7);
    const listKey = ["getUserRooms", 1] as const;
    queryClient.setQueryData(detailKey, { success: true, data: { roomId: 7, name: "旧名称" } });
    queryClient.setQueryData(listKey, { success: true, data: { rooms: [{ roomId: 7, name: "旧名称" }] } });

    await beginRoomUpdateOptimisticMutation(queryClient, { roomId: 7, name: "新名称" });

    expect(queryClient.getQueryData<any>(detailKey)?.data.name).toBe("新名称");
    expect(queryClient.getQueryData<any>(listKey)?.data.rooms[0].name).toBe("新名称");
  });

  it("房间更新失败回滚不会覆盖后续推送的新详情", async () => {
    const queryClient = new QueryClient();
    const queryKey = roomInfoQueryKey(7);
    queryClient.setQueryData(queryKey, { success: true, data: { roomId: 7, name: "旧名称" } });

    const transaction = await beginRoomUpdateOptimisticMutation(queryClient, { roomId: 7, name: "乐观名称" });
    const pushedData = { success: true, data: { roomId: 7, name: "推送名称" } };
    queryClient.setQueryData(queryKey, pushedData);
    rollbackOptimisticQueryTransaction(queryClient, transaction);

    expect(queryClient.getQueryData(queryKey)).toEqual(pushedData);
  });
});
