import { describe, expect, it } from "vitest";

import { mergeRoleList, resolveRoleAvatarUrls } from "./roleListData";

describe("roleListData", () => {
  it("解析角色列表头像时只使用 fileId", () => {
    expect(resolveRoleAvatarUrls({
      avatarFileId: 2002,
    })).toEqual({
      avatarUrl: "https://media.tuan.chat/media/v1/files/002/2002/image/medium.webp",
      avatarThumbUrl: "https://media.tuan.chat/media/v1/files/002/2002/image/low.webp",
    });
  });

  it("会保留已有角色的本地字段，同时用最新列表覆盖基础资料", () => {
    const merged = mergeRoleList([
      {
        id: 10,
        name: "旧名字",
        description: "旧描述",
        avatarId: 99,
        avatar: "old-avatar",
        avatarThumb: "old-thumb",
        basic: { hp: "12" },
      },
    ], [
      {
        id: 10,
        name: "新名字",
        description: "新描述",
        avatarId: 99,
        avatar: "",
        avatarThumb: "",
      },
    ]);

    expect(merged).toEqual([
      expect.objectContaining({
        id: 10,
        name: "新名字",
        description: "新描述",
        avatar: "old-avatar",
        avatarThumb: "old-thumb",
        basic: { hp: "12" },
      }),
    ]);
  });

});
