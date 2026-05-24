import { describe, expect, it } from "vitest";

import { buildMessageEditorSpeakerAvatarClearMenuItems, buildMessageEditorSpeakerAvatarMenuItems } from "./messageEditorSpeakerAvatar";

describe("messageEditorSpeakerAvatar", () => {
  it("keeps the default avatar as the first candidate and preserves category order", () => {
    const items = buildMessageEditorSpeakerAvatarMenuItems({
      avatars: [
        {
          avatarId: 1,
          avatarTitle: { label: "开心" },
          category: "表情",
        },
        {
          avatarId: 2,
          avatarTitle: { label: "默认" },
          category: "动作",
        },
        {
          avatarId: 3,
          avatarTitle: { label: "生气" },
          category: "动作",
        },
      ],
      query: "",
      roleId: 7,
      selectedAvatarId: 3,
    });

    expect(items[0]).toMatchObject({
      avatarId: 2,
      selected: false,
    });
    expect(items.at(-1)).toMatchObject({
      kind: "clear",
      selected: false,
    });
    expect(items.map(item => item.kind === "avatar" ? item.avatarId : 0)).toEqual(expect.arrayContaining([1, 2, 3]));
    expect(items.find(item => item.kind === "avatar" && item.avatarId === 3)).toMatchObject({
      avatarId: 3,
      selected: true,
    });
  });

  it("filters avatar candidates by query", () => {
    const items = buildMessageEditorSpeakerAvatarMenuItems({
      avatars: [
        {
          avatarId: 1,
          avatarTitle: { label: "开心" },
          category: "表情",
        },
        {
          avatarId: 2,
          avatarTitle: { label: "默认" },
          category: "动作",
        },
      ],
      query: "kaixin",
      roleId: 7,
    });

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      avatarId: 1,
      avatarTitle: "开心",
    });
    expect(items[1]).toMatchObject({
      kind: "clear",
    });
  });

  it("builds the standalone clear candidate for the second speaker step", () => {
    expect(buildMessageEditorSpeakerAvatarClearMenuItems({
      roleId: 0,
      selected: true,
    })).toEqual([{
      avatarTitle: "无",
      category: "操作",
      kind: "clear",
      roleId: 0,
      selected: true,
    }]);
  });
});
