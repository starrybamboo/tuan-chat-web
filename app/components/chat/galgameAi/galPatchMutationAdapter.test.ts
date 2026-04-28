import type { Message } from "@tuanchat/openapi-client/models/Message";

import { describe, expect, it } from "vitest";

import { MessageType } from "../../../../api/wsModels";

import { GAL_NARRATOR, projectGalMessages } from "./authoringProjection";
import { buildGalPatchMutationPlan } from "./galPatchMutationAdapter";
import { createGalPatchProposal } from "./storyPatch";

function createMessage(overrides: Partial<Message>): Message {
  return {
    messageId: 1,
    syncId: 1,
    roomId: 10,
    userId: 99,
    roleId: 7,
    content: "旧",
    status: 0,
    messageType: MessageType.TEXT,
    position: 1,
    ...overrides,
  };
}

describe("gal patch mutation adapter", () => {
  it("把 proposal 转换为现有 insert/update/delete mutation 输入", () => {
    const currentMessages = [
      createMessage({ messageId: 1, position: 1, content: "旧" }),
      createMessage({ messageId: 2, position: 2, content: "删除我" }),
    ];
    const baseSnapshot = projectGalMessages(currentMessages, []);
    const proposal = createGalPatchProposal({
      proposalId: "p1",
      spaceId: "5",
      roomId: "10",
      baseSnapshot,
      patch: {
        operations: [
          {
            op: "replace_content",
            messageId: "1",
            content: "新",
          },
          {
            op: "insert_after",
            afterMessageId: "1",
            message: {
              messageType: MessageType.TEXT,
              roleId: "narrator",
              purpose: "narration",
              content: "旁白",
            },
          },
          {
            op: "delete",
            messageId: "2",
          },
        ],
      },
      context: {
        roomId: "10",
        narrator: GAL_NARRATOR,
        roles: [{ roleId: "7", avatarVariants: [] }],
        annotations: [],
      },
      now: new Date("2026-04-28T00:00:00.000Z"),
    });

    const plan = buildGalPatchMutationPlan({ proposal, currentMessages });

    expect(plan.conflict).toBe(false);
    expect(plan.updateMessages).toEqual([
      expect.objectContaining({
        messageId: 1,
        content: "新",
      }),
    ]);
    expect(plan.insertMessages).toEqual([
      expect.objectContaining({
        roomId: 10,
        roleId: 0,
        content: "旁白",
        position: 1.5,
      }),
    ]);
    expect(plan.deleteMessageIds).toEqual([2]);
  });

  it("当前消息变化时返回冲突而不生成 mutation", () => {
    const baseMessages = [createMessage({ messageId: 1, content: "旧" })];
    const proposal = createGalPatchProposal({
      proposalId: "p1",
      spaceId: "5",
      roomId: "10",
      baseSnapshot: projectGalMessages(baseMessages, []),
      patch: {
        operations: [
          {
            op: "replace_content",
            messageId: "1",
            content: "新",
          },
        ],
      },
      context: {
        roomId: "10",
        narrator: GAL_NARRATOR,
        roles: [{ roleId: "7", avatarVariants: [] }],
        annotations: [],
      },
      now: new Date("2026-04-28T00:00:00.000Z"),
    });

    const plan = buildGalPatchMutationPlan({
      proposal,
      currentMessages: [createMessage({ messageId: 1, content: "别人已改" })],
    });

    expect(plan).toMatchObject({
      conflict: true,
      insertMessages: [],
      updateMessages: [],
      deleteMessageIds: [],
    });
  });
});
