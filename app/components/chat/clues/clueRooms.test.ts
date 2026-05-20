import { describe, expect, it } from "vitest";

import type { Message, Room, SpaceMember } from "../../../../api";

import {
  buildClueFolderExtraValue,
  buildClueMessageCopyRequest,
  canCopyMessageToClueFolder,
  CLUE_FOLDER_EXTRA_KEY,
  getClueFolderMeta,
  getPublicClueFolderMemberIds,
  partitionClueFolderRooms,
} from "./clueRooms";

function room(params: {
  extra?: unknown;
  roomId: number;
  spaceId?: number;
}): Room {
  return {
    roomId: params.roomId,
    spaceId: params.spaceId ?? 1,
    name: `room-${params.roomId}`,
    extra: typeof params.extra === "string" ? params.extra : JSON.stringify(params.extra ?? {}),
  };
}

function message(overrides: Partial<Message> = {}): Message {
  return {
    messageId: 1,
    syncId: 1,
    roomId: 10,
    userId: 100,
    content: "重要线索",
    status: 0,
    messageType: 1,
    position: 1,
    ...overrides,
  };
}

describe("clueRooms", () => {
  it("能解析 room.extra 中字符串化的线索夹元数据", () => {
    const metaValue = buildClueFolderExtraValue({
      createdAt: "2026-05-20T00:00:00.000Z",
      ownerUserId: 1001,
      scope: "private",
    });
    const parsed = getClueFolderMeta(room({
      roomId: 1,
      extra: {
        [CLUE_FOLDER_EXTRA_KEY]: metaValue,
      },
    }));

    expect(parsed).toEqual({
      v: 1,
      scope: "private",
      ownerUserId: 1001,
      createdAt: "2026-05-20T00:00:00.000Z",
    });
  });

  it("会把线索房间从普通房间中分离，并只展示当前用户可见的个人线索", () => {
    const privateForCurrent = room({
      roomId: 2,
      extra: { [CLUE_FOLDER_EXTRA_KEY]: buildClueFolderExtraValue({ ownerUserId: 1001, scope: "private" }) },
    });
    const privateForOther = room({
      roomId: 3,
      extra: { [CLUE_FOLDER_EXTRA_KEY]: buildClueFolderExtraValue({ ownerUserId: 1002, scope: "private" }) },
    });
    const publicRoom = room({
      roomId: 4,
      extra: { [CLUE_FOLDER_EXTRA_KEY]: buildClueFolderExtraValue({ scope: "public" }) },
    });
    const normalRoom = room({ roomId: 5 });

    const result = partitionClueFolderRooms([
      privateForCurrent,
      privateForOther,
      publicRoom,
      normalRoom,
    ], 1001);

    expect(result.mainRooms.map(item => item.roomId)).toEqual([5]);
    expect(result.clueRooms.map(item => item.roomId)).toEqual([2, 4]);
    expect(result.privateClueRoom?.roomId).toBe(2);
    expect(result.publicClueRoom?.roomId).toBe(4);
  });

  it("公共线索夹只邀请活跃跑团成员，并兜底包含当前用户", () => {
    const members: SpaceMember[] = [
      { userId: 1, memberType: 1 },
      { userId: 2, memberType: 2 },
      { userId: 3, memberType: 3 },
      { userId: 4, memberType: 4 },
      { userId: 5, memberType: 5 },
      { userId: 2, memberType: 2 },
    ];

    expect(getPublicClueFolderMemberIds(members, 6)).toEqual([1, 2, 5, 6]);
  });

  it("复制线索消息不沿用源消息角色和头像，只使用当前房间兜底角色", () => {
    const source = message({
      roleId: 99,
      avatarId: 88,
      customRoleName: "侦探",
      annotations: ["sys:bgm"],
      webgal: { figure: { id: 1 } },
      extra: {
        imageMessage: { imageUrl: "https://example.com/a.png" },
      } as any,
    });

    const request = buildClueMessageCopyRequest({
      fallbackRoleId: 42,
      sourceMessage: source,
      targetRoomId: 100,
    });

    expect(request).toMatchObject({
      roomId: 100,
      messageType: 1,
      roleId: 42,
      content: "重要线索",
      customRoleName: "侦探",
      annotations: ["sys:bgm"],
      extra: {
        imageMessage: { imageUrl: "https://example.com/a.png" },
      },
      webgal: { figure: { id: 1 } },
    });
    expect("avatarId" in request).toBe(false);
  });

  it("复制旁白来源消息时会补旁白显示名", () => {
    const request = buildClueMessageCopyRequest({
      sourceMessage: message({ roleId: -1, customRoleName: undefined }),
      targetRoomId: 100,
    });

    expect(request.customRoleName).toBe("旁白");
    expect("roleId" in request).toBe(false);
  });

  it("排除删除消息、已读线和 thread root", () => {
    expect(canCopyMessageToClueFolder(message({ status: 1 }))).toBe(false);
    expect(canCopyMessageToClueFolder(message({ messageType: 10000 }))).toBe(false);
    expect(canCopyMessageToClueFolder(message({ messageType: 10001 }))).toBe(false);
    expect(canCopyMessageToClueFolder(message({ messageType: 1, status: 0 }))).toBe(true);
  });
});
