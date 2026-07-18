import { QueryClient } from "@tanstack/react-query";
import { rollbackOptimisticQueryTransaction } from "@tuanchat/query/optimistic-cache";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  beginDeleteRoomExtraOptimisticMutation,
  beginSetRoomExtraOptimisticMutation,
  beginSetSpaceExtraOptimisticMutation,
  fetchSpaceExtraWithCache,
  roomExtraQueryKey,
  setRoomExtraWithCache,
  setSpaceExtraWithCache,
  spaceExtraQueryKey,
  spaceInfoQueryKey,
} from "./chatQueryHooks";

const {
  getSpaceExtraMock,
  setSpaceExtraMock,
  setRoomExtraMock,
} = vi.hoisted(() => ({
  getSpaceExtraMock: vi.fn(),
  setSpaceExtraMock: vi.fn(),
  setRoomExtraMock: vi.fn(),
}));

vi.mock("../instance", () => ({
  tuanchat: {
    roomController: {
      setRoomExtra: setRoomExtraMock,
    },
    spaceController: {
      getSpaceExtra: getSpaceExtraMock,
      setSpaceExtra: setSpaceExtraMock,
    },
  },
}));

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

describe("chat extra cache helpers", () => {
  it("空间和房间 extra 在提交时即时写入缓存并支持回滚", async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(spaceInfoQueryKey(7), {
      success: true,
      data: { extra: JSON.stringify({ old: "value" }), spaceId: 7 },
    });
    queryClient.setQueryData(spaceExtraQueryKey(7, "theme"), { success: true, data: "old" });
    queryClient.setQueryData(roomExtraQueryKey(9, "scene"), { success: true, data: "old" });

    const spaceTransaction = await beginSetSpaceExtraOptimisticMutation(queryClient, {
      key: "theme",
      spaceId: 7,
      value: "dark",
    });
    expect(queryClient.getQueryData(spaceExtraQueryKey(7, "theme"))).toEqual({ success: true, data: "dark" });
    expect(JSON.parse(queryClient.getQueryData<any>(spaceInfoQueryKey(7))?.data.extra)).toEqual({ old: "value", theme: "dark" });
    rollbackOptimisticQueryTransaction(queryClient, spaceTransaction);
    expect(queryClient.getQueryData(spaceExtraQueryKey(7, "theme"))).toEqual({ success: true, data: "old" });

    await beginSetRoomExtraOptimisticMutation(queryClient, { key: "scene", roomId: 9, value: "night" });
    expect(queryClient.getQueryData(roomExtraQueryKey(9, "scene"))).toEqual({ success: true, data: "night" });
    await beginDeleteRoomExtraOptimisticMutation(queryClient, { key: "scene", roomId: 9 });
    expect(queryClient.getQueryData(roomExtraQueryKey(9, "scene"))).toEqual({ success: true });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("setSpaceExtraWithCache 会同步 key 级 extra 与 spaceInfo.extra 缓存", async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(spaceInfoQueryKey(7), {
      success: true,
      data: {
        spaceId: 7,
        extra: JSON.stringify({ oldKey: "oldValue" }),
      },
    });
    setSpaceExtraMock.mockResolvedValueOnce({ success: true });

    await setSpaceExtraWithCache(queryClient, {
      spaceId: 7,
      key: "webgalRealtimeRenderSettings",
      value: "{\"enabled\":true}",
    });

    expect(setSpaceExtraMock).toHaveBeenCalledWith({
      spaceId: 7,
      key: "webgalRealtimeRenderSettings",
      value: "{\"enabled\":true}",
    });
    expect(queryClient.getQueryData(spaceExtraQueryKey(7, "webgalRealtimeRenderSettings"))).toMatchObject({
      success: true,
      data: "{\"enabled\":true}",
    });

    const spaceInfo = queryClient.getQueryData<any>(spaceInfoQueryKey(7));
    expect(JSON.parse(spaceInfo.data.extra)).toEqual({
      oldKey: "oldValue",
      webgalRealtimeRenderSettings: "{\"enabled\":true}",
    });
  });

  it("setRoomExtraWithCache 会同步 room extra key 缓存", async () => {
    const queryClient = createQueryClient();
    setRoomExtraMock.mockResolvedValueOnce({ success: true });
    queryClient.setQueryData(roomExtraQueryKey(12, "initiativeList"), {
      success: false,
      errMsg: "old error",
      data: "",
    });

    await setRoomExtraWithCache(queryClient, {
      roomId: 12,
      key: "initiativeList",
      value: "[1,2,3]",
    });

    expect(setRoomExtraMock).toHaveBeenCalledWith({
      roomId: 12,
      key: "initiativeList",
      value: "[1,2,3]",
    });
    expect(queryClient.getQueryData(roomExtraQueryKey(12, "initiativeList"))).toMatchObject({
      success: true,
      data: "[1,2,3]",
    });
    expect(queryClient.getQueryData(roomExtraQueryKey(12, "initiativeList"))).not.toMatchObject({
      errMsg: "old error",
    });
  });

  it("setSpaceExtraWithCache 在业务失败时不会写入成功缓存", async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(spaceExtraQueryKey(7, "webgalRealtimeRenderSettings"), {
      success: false,
      errMsg: "old error",
      data: "",
    });
    queryClient.setQueryData(spaceInfoQueryKey(7), {
      success: true,
      data: {
        spaceId: 7,
        extra: JSON.stringify({ oldKey: "oldValue" }),
      },
    });
    setSpaceExtraMock.mockResolvedValueOnce({ success: false, errMsg: "denied" });

    await expect(setSpaceExtraWithCache(queryClient, {
      spaceId: 7,
      key: "webgalRealtimeRenderSettings",
      value: "{\"enabled\":true}",
    })).rejects.toThrow("denied");

    expect(queryClient.getQueryData(spaceExtraQueryKey(7, "webgalRealtimeRenderSettings"))).toMatchObject({
      success: false,
      errMsg: "old error",
      data: "",
    });
    const spaceInfo = queryClient.getQueryData<any>(spaceInfoQueryKey(7));
    expect(JSON.parse(spaceInfo.data.extra)).toEqual({ oldKey: "oldValue" });
  });

  it("setRoomExtraWithCache 在业务失败时不会覆盖旧缓存", async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(roomExtraQueryKey(12, "initiativeList"), {
      success: true,
      data: "[0]",
    });
    setRoomExtraMock.mockResolvedValueOnce({ success: false, errMsg: "denied" });

    await expect(setRoomExtraWithCache(queryClient, {
      roomId: 12,
      key: "initiativeList",
      value: "[1,2,3]",
    })).rejects.toThrow("denied");

    expect(queryClient.getQueryData(roomExtraQueryKey(12, "initiativeList"))).toMatchObject({
      success: true,
      data: "[0]",
    });
  });

  it("fetchSpaceExtraWithCache 会复用同一个 React Query 缓存项", async () => {
    const queryClient = createQueryClient();
    getSpaceExtraMock.mockResolvedValue({
      success: true,
      data: "{\"enabled\":false}",
    });

    await fetchSpaceExtraWithCache(queryClient, 7, "webgalRealtimeRenderSettings");
    await fetchSpaceExtraWithCache(queryClient, 7, "webgalRealtimeRenderSettings");

    expect(getSpaceExtraMock).toHaveBeenCalledTimes(1);
  });

});
