import { describe, expect, it } from "vitest";

import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";
import type { Message } from "@tuanchat/openapi-client/models/Message";

import { MessageType } from "../../../../api/wsModels";
import { GAL_NARRATOR, projectGalMessages } from "./authoringProjection";
import { buildGalProposalMessagePreview } from "./galProposalMessagePreview";
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

function response(message: Message): ChatMessageResponse {
  return { message };
}

describe("buildGalProposalMessagePreview", () => {
  it("把 proposal 投影为可复用现有 full diff 的消息列表", () => {
    const historyMessages = [
      response(createMessage({ messageId: 1, position: 1, content: "旧" })),
      response(createMessage({ messageId: 2, position: 2, content: "删除我" })),
      response(createMessage({ messageId: 3, position: 3, content: "不变" })),
    ];

    const proposal = createGalPatchProposal({
      proposalId: "p1",
      spaceId: "5",
      roomId: "10",
      baseSnapshot: projectGalMessages(historyMessages.map(item => item.message), []),
      patch: {
        operations: [
          { op: "replace_content", messageId: "1", content: "新" },
          {
            op: "insert_after",
            afterMessageId: "1",
            message: {
              messageType: MessageType.TEXT,
              roleId: "narrator",
              purpose: "narration",
              content: "新增旁白",
            },
          },
          { op: "delete", messageId: "2" },
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

    const preview = buildGalProposalMessagePreview({ historyMessages, proposal });

    expect(preview?.messages.map(item => item.message.content)).toEqual([
      "新",
      "新增旁白",
      "",
      "不变",
    ]);
    expect(preview?.messages[1]?.message.messageId).toBeLessThan(0);
    expect(preview?.baseMessageByPreviewId.get(1)?.message.content).toBe("旧");
    expect(preview?.baseMessageByPreviewId.get(preview.messages[1].message.messageId)?.message.content).toBe("");
    expect(preview?.baseMessageByPreviewId.get(2)?.message.content).toBe("删除我");
    expect(preview?.baseMessageByPreviewId.has(3)).toBe(false);
  });

  it("有校验错误时不生成预览", () => {
    const historyMessages = [response(createMessage({ messageId: 1 }))];
    const proposal = createGalPatchProposal({
      proposalId: "p1",
      spaceId: "5",
      roomId: "10",
      baseSnapshot: projectGalMessages(historyMessages.map(item => item.message), []),
      patch: {
        operations: [
          { op: "delete", messageId: "404" },
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

    expect(buildGalProposalMessagePreview({ historyMessages, proposal })).toBeNull();
  });

  it("当前消息已变化时用当前内容作为 diff before", () => {
    const baseMessage = createMessage({ messageId: 1, content: "A" });
    const proposal = createGalPatchProposal({
      proposalId: "p1",
      spaceId: "5",
      roomId: "10",
      baseSnapshot: projectGalMessages([baseMessage], []),
      patch: {
        operations: [
          { op: "replace_content", messageId: "1", content: "B" },
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

    const preview = buildGalProposalMessagePreview({
      historyMessages: [response(createMessage({ messageId: 1, content: "C" }))],
      proposal,
    });

    expect(preview?.messages[0]?.message.content).toBe("B");
    expect(preview?.baseMessageByPreviewId.get(1)?.message.content).toBe("C");
  });
});
