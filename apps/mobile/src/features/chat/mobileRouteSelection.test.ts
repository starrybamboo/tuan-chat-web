import { buildClueFolderExtraValue, CLUE_FOLDER_EXTRA_KEY } from "@tuanchat/domain/clue-folder";
import { describe, expect, it } from "vitest";

import {
  getMobileNavigableRooms,
  getMobileVisibleClueRooms,
  resolveAutoSelectedSpaceId,
  shouldClearStaleRouteRoom,
} from "./mobileRouteSelection";

function clueExtra(scope: "private" | "public", ownerUserId?: number) {
  return JSON.stringify({
    [CLUE_FOLDER_EXTRA_KEY]: buildClueFolderExtraValue({
      ownerUserId,
      scope,
    }),
  });
}

describe("mobileRouteSelection", () => {
  it("无显式目标时保留仍存在的 space 选择", () => {
    expect(resolveAutoSelectedSpaceId({
      activeSpaces: [{ spaceId: 1 }, { spaceId: 2 }],
      hasExplicitTarget: false,
      selectedSpaceId: 2,
    })).toBeUndefined();
  });

  it("无显式目标且当前 space 缺失时选择第一个可见 space", () => {
    expect(resolveAutoSelectedSpaceId({
      activeSpaces: [{ spaceId: 3 }, { spaceId: 4 }],
      hasExplicitTarget: false,
      selectedSpaceId: 9,
    })).toBe(3);
  });

  it("没有可见 space 时清理旧选择，但显式目标不自动改写", () => {
    expect(resolveAutoSelectedSpaceId({
      activeSpaces: [],
      hasExplicitTarget: false,
      selectedSpaceId: 9,
    })).toBeNull();

    expect(resolveAutoSelectedSpaceId({
      activeSpaces: [{ spaceId: 3 }],
      hasExplicitTarget: true,
      selectedSpaceId: 9,
    })).toBeUndefined();
  });

  it("rooms 查询完成且当前 room 不可见时才清理 room 选择", () => {
    expect(shouldClearStaleRouteRoom({
      availableRooms: [{ roomId: 1 }, { roomId: 2 }],
      hasExplicitTarget: false,
      roomsQueryIsPending: false,
      selectedRoomId: 9,
      selectedSpaceId: 3,
    })).toBe(true);

    expect(shouldClearStaleRouteRoom({
      availableRooms: [{ roomId: 9 }],
      hasExplicitTarget: false,
      roomsQueryIsPending: false,
      selectedRoomId: 9,
      selectedSpaceId: 3,
    })).toBe(false);

    expect(shouldClearStaleRouteRoom({
      availableRooms: [],
      hasExplicitTarget: false,
      roomsQueryIsPending: true,
      selectedRoomId: 9,
      selectedSpaceId: 3,
    })).toBe(false);
  });

  it("移动端普通房间导航会过滤线索房间", () => {
    const rooms = [
      { roomId: 1, extra: clueExtra("private", 1001) },
      { roomId: 2, extra: clueExtra("private", 2002) },
      { roomId: 3, extra: clueExtra("public") },
      { roomId: 4 },
    ];

    expect(getMobileNavigableRooms(rooms, 1001).map(room => room.roomId)).toEqual([4]);
  });

  it("移动端线索列表按桌面端顺序返回当前用户可见线索房间", () => {
    const rooms = [
      { roomId: 3, extra: clueExtra("public") },
      { roomId: 2, extra: clueExtra("private", 2002) },
      { roomId: 1, extra: clueExtra("private", 1001) },
      { roomId: 4 },
    ];

    expect(getMobileVisibleClueRooms(rooms, 1001).map(room => room.roomId)).toEqual([1, 3]);
  });

  it("恢复到线索 room 时会按过滤后的普通房间列表清理选择", () => {
    const rooms = getMobileNavigableRooms([
      { roomId: 10, extra: clueExtra("private", 1001) },
      { roomId: 11 },
    ], 1001);

    expect(shouldClearStaleRouteRoom({
      availableRooms: rooms,
      hasExplicitTarget: false,
      roomsQueryIsPending: false,
      selectedRoomId: 10,
      selectedSpaceId: 3,
    })).toBe(true);
  });
});
