import { describe, expect, it } from "vitest";

import type { RoleAvatar } from "@tuanchat/openapi-client/models/RoleAvatar";

import { buildAvatarGridItems } from "./avatarGridItems";

const avatars = [
  { avatarId: 1, avatarFileId: 11 },
  { avatarId: 2, avatarFileId: 22 },
] satisfies RoleAvatar[];

describe("buildAvatarGridItems", () => {
  it("非管理态不暴露上传入口", () => {
    expect(buildAvatarGridItems(avatars, false, false).map(item => item.type)).toEqual(["avatar", "avatar"]);
  });

  it("进入管理态后显示上传入口", () => {
    expect(buildAvatarGridItems(avatars, true, false).map(item => item.type)).toEqual(["avatar", "avatar", "add"]);
  });

  it("多选删除模式下隐藏上传入口", () => {
    expect(buildAvatarGridItems(avatars, true, true).map(item => item.type)).toEqual(["avatar", "avatar"]);
  });
});
