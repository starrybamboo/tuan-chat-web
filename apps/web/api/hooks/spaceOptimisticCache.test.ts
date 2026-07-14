import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import {
  beginRoomRemovalOptimisticMutation,
  beginSpaceArchiveOptimisticMutation,
  beginSpaceUpdateOptimisticMutation,
  rollbackSpaceOptimisticMutation,
} from "./spaceOptimisticCache";

describe("space optimistic cache", () => {
  it("空间更新同步详情和列表并支持回滚", async () => {
    const queryClient = new QueryClient();
    const space = { spaceId: 7, name: "旧空间", status: 0 };
    queryClient.setQueryData(["getSpaceInfo", 7], { success: true, data: space });
    queryClient.setQueryData(["getUserSpaces"], { success: true, data: [space] });

    const transaction = await beginSpaceUpdateOptimisticMutation(queryClient, { spaceId: 7, name: "新空间" });
    expect(queryClient.getQueryData<any>(["getSpaceInfo", 7])?.data.name).toBe("新空间");
    expect(queryClient.getQueryData<any>(["getUserSpaces"])?.data[0].name).toBe("新空间");
    rollbackSpaceOptimisticMutation(queryClient, transaction);
    expect(queryClient.getQueryData<any>(["getSpaceInfo", 7])?.data).toEqual(space);
  });

  it("归档空间即时从活跃列表移入归档列表", async () => {
    const queryClient = new QueryClient();
    const space = { active: true, archived: false, spaceId: 7, status: 0 };
    queryClient.setQueryData(["getUserSpaces"], { success: true, data: [space] });
    queryClient.setQueryData(["getUserActiveSpaces"], { success: true, data: [space] });
    queryClient.setQueryData(["getMyArchivedSpaces"], { success: true, data: [] });

    await beginSpaceArchiveOptimisticMutation(queryClient, { spaceId: 7, archived: true, archiveRequested: true });
    expect(queryClient.getQueryData<any>(["getUserActiveSpaces"])?.data).toEqual([]);
    expect(queryClient.getQueryData<any>(["getMyArchivedSpaces"])?.data[0]).toMatchObject({
      spaceId: 7,
      archived: true,
      status: 2,
    });
  });

  it("解散房间即时移出空间房间列表", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["getUserRooms", 7], {
      success: true,
      data: { rooms: [{ roomId: 11 }, { roomId: 12 }], spaceId: 7 },
    });

    await beginRoomRemovalOptimisticMutation(queryClient, 11);
    expect(queryClient.getQueryData<any>(["getUserRooms", 7])?.data.rooms).toEqual([{ roomId: 12 }]);
  });
});
