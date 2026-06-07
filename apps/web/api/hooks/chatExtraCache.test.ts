import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  addRoomRoleWithSuccessGuard,
  fetchSpaceExtraWithCache,
  roomExtraQueryKey,
  setRoomExtraWithCache,
  setSpaceExtraWithCache,
  spaceExtraQueryKey,
  spaceInfoQueryKey,
  updateSpaceMemberTypeWithSuccessGuard,
} from "./chatQueryHooks";

const {
  addRoleMock,
  getSpaceExtraMock,
  updateMemberTypeMock,
  setSpaceExtraMock,
  setRoomExtraMock,
} = vi.hoisted(() => ({
  addRoleMock: vi.fn(),
  getSpaceExtraMock: vi.fn(),
  updateMemberTypeMock: vi.fn(),
  setSpaceExtraMock: vi.fn(),
  setRoomExtraMock: vi.fn(),
}));

vi.mock("../instance", () => ({
  tuanchat: {
    roomRoleController: {
      addRole: addRoleMock,
    },
    roomController: {
      setRoomExtra: setRoomExtraMock,
    },
    spaceMemberController: {
      updateMemberType: updateMemberTypeMock,
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

    await setSpaceExtraWithCache(queryClient, {
      spaceId: 7,
      key: "webgalRealtimeRenderSettings",
      value: "{\"enabled\":true}",
    });

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

    await setRoomExtraWithCache(queryClient, {
      roomId: 12,
      key: "initiativeList",
      value: "[1,2,3]",
    });

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

  it("updateSpaceMemberTypeWithSuccessGuard 会把 success:false 转成错误路径", async () => {
    const request = { spaceId: 7, uidList: [11], memberType: 2 };
    updateMemberTypeMock.mockResolvedValueOnce({ success: false, errMsg: "denied" });

    await expect(updateSpaceMemberTypeWithSuccessGuard(request)).rejects.toThrow("denied");
    expect(updateMemberTypeMock).toHaveBeenCalledWith(request);
  });

  it("addRoomRoleWithSuccessGuard 会把 success:false 转成错误路径", async () => {
    const request = { roomId: 9, roleIdList: [101] };
    addRoleMock.mockResolvedValueOnce({ success: false, errMsg: "role denied" });

    await expect(addRoomRoleWithSuccessGuard(request)).rejects.toThrow("role denied");
    expect(addRoleMock).toHaveBeenCalledWith(request);
  });
});
