import type { ApiResultListSpace } from "@tuanchat/openapi-client/models/ApiResultListSpace";
import type { ApiResultRoomListResponse } from "@tuanchat/openapi-client/models/ApiResultRoomListResponse";

import { describe, expect, it } from "vitest";

import { patchExistingUserRoomData, upsertUserActiveSpacesData, upsertUserRoomData } from "./spaces";

describe("space query cache helpers", () => {
  it("创建空间后追加到用户空间缓存，并保留已有字段", () => {
    const current: ApiResultListSpace = {
      success: true,
      data: [{ spaceId: 1, name: "旧空间" }],
    };

    expect(upsertUserActiveSpacesData(current, { spaceId: 2, name: "新空间" })).toEqual({
      success: true,
      data: [
        { spaceId: 1, name: "旧空间" },
        { spaceId: 2, name: "新空间" },
      ],
    });
  });

  it("创建房间后追加到对应空间的房间缓存", () => {
    const current: ApiResultRoomListResponse = {
      success: true,
      data: {
        spaceId: 1,
        rooms: [{ roomId: 10, spaceId: 1, name: "旧房间" }],
      },
    };

    expect(upsertUserRoomData(current, 1, { roomId: 11, spaceId: 1, name: "新房间" })).toEqual({
      success: true,
      data: {
        spaceId: 1,
        rooms: [
          { roomId: 10, spaceId: 1, name: "旧房间" },
          { roomId: 11, spaceId: 1, name: "新房间" },
        ],
      },
    });
  });

  it("重复返回同一空间或房间时更新缓存而不是产生重复项", () => {
    expect(upsertUserActiveSpacesData({
      success: true,
      data: [{ spaceId: 1, name: "旧名" }],
    }, { spaceId: 1, name: "新名" })?.data).toEqual([{ spaceId: 1, name: "新名" }]);

    expect(upsertUserRoomData({
      success: true,
      data: { spaceId: 1, rooms: [{ roomId: 10, name: "旧名" }] },
    }, 1, { roomId: 10, name: "新名" })?.data?.rooms).toEqual([{ roomId: 10, name: "新名" }]);
  });

  it("更新房间资料时只 patch 已缓存房间，不新增未知房间", () => {
    const current: ApiResultRoomListResponse = {
      success: true,
      data: {
        spaceId: 1,
        rooms: [
          { roomId: 10, spaceId: 1, name: "旧房间", description: "旧描述" },
          { roomId: 11, spaceId: 1, name: "其他房间" },
        ],
      },
    };

    expect(patchExistingUserRoomData(current, {
      roomId: 10,
      name: "新房间",
      description: "新描述",
    })?.data?.rooms).toEqual([
      { roomId: 10, spaceId: 1, name: "新房间", description: "新描述" },
      { roomId: 11, spaceId: 1, name: "其他房间" },
    ]);

    expect(patchExistingUserRoomData(current, { roomId: 99, name: "未知房间" })).toBe(current);
  });
});
