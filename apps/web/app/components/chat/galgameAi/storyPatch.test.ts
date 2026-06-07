import { describe, expect, it } from "vitest";

import type { GalMessageView, GalPatchValidationContext } from "./authoringTypes";

import { GAL_NARRATOR } from "./authoringProjection";
import { applyGalStoryPatch, createGalPatchProposal } from "./storyPatch";

function createMessage(overrides: Partial<GalMessageView>): GalMessageView {
  return {
    messageId: "1",
    position: 1,
    roomId: "10",
    messageType: 1,
    purpose: "dialogue",
    roleId: "7",
    roleName: "千夏",
    content: "原文",
    annotations: [],
    ...overrides,
  };
}

const context: GalPatchValidationContext = {
  roomId: "10",
  narrator: GAL_NARRATOR,
  roles: [
    {
      roleId: "7",
      roleName: "千夏",
      avatarId: "70",
      avatarVariants: [
        { roleId: "7", avatarId: "71", avatarTitle: { zh: "微笑" } },
      ],
    },
    {
      roleId: "8",
      roleName: "雨宫",
      avatarVariants: [],
    },
  ],
  annotations: [
    { id: "dialog.next", label: "立即下一句", source: "builtin" },
    { id: "figure.pos.left", label: "左", source: "builtin" },
  ],
};

describe("galgame story patch", () => {
  it("应用内容替换、插入和 annotation 更新并生成 diff 摘要", () => {
    const base = [
      createMessage({ messageId: "1", position: 1, content: "旧对白" }),
      createMessage({ messageId: "2", position: 2, content: "下一句" }),
    ];

    const result = applyGalStoryPatch(base, {
      operations: [
        {
          op: "replace_content",
          messageId: "1",
          content: "新对白",
        },
        {
          op: "insert_after",
          afterMessageId: "1",
          message: {
            messageType: 1,
            purpose: "narration",
            roleId: "narrator",
            content: "雨声压低了脚步。",
            annotations: ["dialog.next"],
          },
        },
        {
          op: "update_annotations",
          messageId: "2",
          annotations: ["figure.pos.left"],
        },
      ],
    }, context);

    expect(result.validationErrors).toEqual([]);
    expect(result.projectedSnapshot.map(message => message.content)).toEqual([
      "新对白",
      "雨声压低了脚步。",
      "下一句",
    ]);
    expect(result.summary).toMatchObject({
      added: 1,
      modified: 2,
      metadataChanged: 1,
    });
  });

  it("应用角色更新并把角色变化计入 metadata diff", () => {
    const result = applyGalStoryPatch([
      createMessage({ messageId: "1", roleId: "7", customRoleName: "千夏" }),
    ], {
      operations: [
        {
          op: "update_role",
          messageId: "1",
          roleId: "8",
          customRoleName: "雨中的人",
        },
      ],
    }, context);

    expect(result.validationErrors).toEqual([]);
    expect(result.projectedSnapshot[0]).toMatchObject({
      roleId: "8",
      customRoleName: "雨中的人",
    });
    expect(result.diff.items).toEqual([
      expect.objectContaining({
        kind: "modified",
        fields: expect.arrayContaining(["roleId", "customRoleName"]),
      }),
    ]);
    expect(result.summary).toMatchObject({
      modified: 1,
      metadataChanged: 1,
    });
  });

  it("按 operation 顺序投影角色与差分更新", () => {
    const result = applyGalStoryPatch([
      createMessage({ messageId: "1", roleId: "narrator", purpose: "narration", avatarId: "-1" }),
    ], {
      operations: [
        {
          op: "update_role",
          messageId: "1",
          roleId: "7",
          customRoleName: "千夏",
        },
        {
          op: "update_avatar",
          messageId: "1",
          avatarId: "70",
        },
      ],
    }, context);

    expect(result.validationErrors).toEqual([]);
    expect(result.projectedSnapshot[0]).toMatchObject({
      roleId: "7",
      customRoleName: "千夏",
      avatarId: "70",
    });
  });

  it("角色切换不在客户端校验旧差分是否属于新角色", () => {
    const result = applyGalStoryPatch([
      createMessage({ messageId: "1", roleId: "7", avatarId: "70" }),
    ], {
      operations: [
        {
          op: "update_role",
          messageId: "1",
          roleId: "8",
        },
      ],
    }, context);

    expect(result.validationErrors).toEqual([]);
    expect(result.projectedSnapshot[0]).toMatchObject({
      roleId: "8",
      avatarId: "70",
    });
  });

  it("不在客户端校验房间外角色和未知 annotation", () => {
    const result = applyGalStoryPatch([
      createMessage({ messageId: "1" }),
    ], {
      operations: [
        {
          op: "insert_after",
          afterMessageId: "1",
          message: {
            messageType: 1,
            roleId: "99",
            content: "越权对白",
            annotations: ["cust:not-exists"],
          },
        },
      ],
    }, context);

    expect(result.validationErrors).toEqual([]);
    expect(result.projectedSnapshot.map(message => message.content)).toEqual([
      "原文",
      "越权对白",
    ]);
  });

  it("不在客户端校验 avatarId 是否属于同一个角色", () => {
    const result = applyGalStoryPatch([
      createMessage({ messageId: "1", avatarId: "70" }),
    ], {
      operations: [
        {
          op: "update_avatar",
          messageId: "1",
          avatarId: "999",
        },
      ],
    }, context);

    expect(result.validationErrors).toEqual([]);
    expect(result.projectedSnapshot[0]?.avatarId).toBe("999");
  });

  it("创建 proposal 时记录 base fingerprint 和 validation errors", () => {
    const proposal = createGalPatchProposal({
      proposalId: "p1",
      spaceId: "5",
      roomId: "10",
      baseSnapshot: [createMessage({ messageId: "1" })],
      patch: {
        operations: [
          {
            op: "delete",
            messageId: "404",
          },
        ],
      },
      context,
      now: new Date("2026-04-28T00:00:00.000Z"),
    });

    expect(proposal.status).toBe("draft");
    expect(proposal.baseFingerprint.messageIds).toEqual(["1"]);
    expect(proposal.validationErrors).toEqual([
      expect.objectContaining({
        code: "message_not_found",
      }),
    ]);
  });
});
