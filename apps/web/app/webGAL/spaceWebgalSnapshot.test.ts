import { describe, expect, it } from "vitest";

import { buildSpaceWebgalInputSnapshot } from "./spaceWebgalSnapshot";

describe("buildSpaceWebgalInputSnapshot", () => {
  it("会过滤、排序并保留统一快照字段", () => {
    const snapshot = buildSpaceWebgalInputSnapshot({
      spaceId: 42,
      spaceName: "测试空间",
      rooms: [
        { roomId: 20, name: "B", status: 0 },
        { roomId: 10, name: "A", status: 0 },
        { roomId: 30, name: "已归档", status: 1 },
      ],
      messagesByRoomId: {
        10: [
          { message: { messageId: 2, position: 2 } } as any,
          { message: { messageId: 1, position: 1 } } as any,
        ],
      },
      roles: [
        { roleId: 2, roleName: "R2" } as any,
        { roleId: 2, roleName: "重复" } as any,
        { roleId: 1, roleName: "R1" } as any,
      ],
      avatars: [
        { avatarId: 8, spriteFileId: 80 } as any,
        { avatarId: 8, spriteFileId: 81 } as any,
      ],
      gameConfig: { baseTemplate: "black" },
      coverAvatarFileId: 99,
      coverAvatarMediaType: "image",
    });

    expect(snapshot.renderableRooms.map(room => room.roomId)).toEqual([10, 20]);
    expect(snapshot.messagesByRoomId[10].map(message => message.message.messageId)).toEqual([1, 2]);
    expect(snapshot.roles.map(role => role.roleId)).toEqual([2, 1]);
    expect(snapshot.avatars.map(avatar => avatar.avatarId)).toEqual([8]);
    expect(snapshot.hydratedGameConfig).toMatchObject({ baseTemplate: "black" });
    expect(snapshot.coverAvatarSource).toMatchObject({
      fileId: 99,
      mediaType: "image",
    });
  });
});
