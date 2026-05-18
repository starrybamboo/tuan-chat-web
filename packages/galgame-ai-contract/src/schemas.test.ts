import { describe, expect, it } from "vitest";

import {
  galCopilotIntentResponseSchema,
  galCopilotPatchRepairRequestSchema,
  galCopilotPatchResponseSchema,
  galCopilotPatchStreamEventSchema,
  galStoryPatchSchema,
} from "./schemas";

const authoringContext = {
  staticGuide: {
    schemaVersion: "1",
    fieldGuide: "",
    patchGuide: "",
    validationGuide: "",
  },
  space: {
    spaceId: "1",
    rooms: [{ roomId: "10", name: "序章" }],
    annotationCatalog: [],
  },
  room: {
    spaceId: "1",
    roomId: "10",
    name: "序章",
  },
  messages: [
    {
      messageId: "100",
      position: 1,
      roomId: "10",
      messageType: 1,
      purpose: "dialogue",
      roleId: "20",
      roleName: "林夏",
      content: "门开了。",
      annotations: [],
    },
  ],
  roles: {
    roomRoles: [
      {
        roleId: "20",
        roleName: "林夏",
        avatarVariants: [],
      },
    ],
    narrator: {
      roleId: "narrator",
      roleName: "旁白",
      kind: "narrator",
    },
  },
  annotations: [],
  attachmentRefs: [
    { kind: "message", messageId: "100", mode: "target", label: "修改范围" },
    { kind: "doc", docId: "doc-1", title: "设定", excerpt: "禁止夜行。" },
  ],
  referenceRooms: [
    {
      refId: "room:11",
      room: {
        spaceId: "1",
        roomId: "11",
        name: "参考房间",
      },
      messages: [
        {
          messageId: "200",
          position: 1,
          roomId: "11",
          messageType: 1,
          purpose: "narration",
          content: "雨声压低了脚步。",
          annotations: [],
        },
      ],
      roles: {
        roomRoles: [],
        narrator: {
          roleId: "narrator",
          roleName: "旁白",
          kind: "narrator",
        },
      },
    },
  ],
};

describe("galgame-ai-contract schemas", () => {
  it("accepts supported GalStoryPatch operations", () => {
    const patch = galStoryPatchSchema.parse({
      operations: [
        {
          op: "replace_content",
          messageId: "1001",
          content: "新的台词",
        },
        {
          op: "insert_after",
          afterMessageId: "1001",
          message: {
            messageType: 1,
            purpose: "narration",
            content: "雨声忽然变密。",
            annotations: ["narration"],
          },
        },
      ],
    });

    expect(patch.operations).toHaveLength(2);
  });

  it("accepts semantic GalCopilotIntent responses", () => {
    const response = galCopilotIntentResponseSchema.parse({
      intents: [
        {
          action: "rewrite",
          target: { ordinal: "last_dialogue", roleName: "林夏" },
          content: "门被风猛地推开。",
        },
        {
          action: "insert_after",
          anchor: { textIncludes: "门" },
          message: {
            speaker: "旁白",
            content: "雨声忽然变密。",
          },
        },
      ],
    });

    expect(response.intents).toHaveLength(2);
  });

  it("rejects unsupported patch operation names", () => {
    const result = galCopilotPatchResponseSchema.safeParse({
      patch: {
        operations: [
          {
            op: "rewrite_everything",
            messageId: "1001",
            content: "bad",
          },
        ],
      },
    });

    expect(result.success).toBe(false);
  });

  it("accepts patch repair requests with validation errors", () => {
    const request = galCopilotPatchRepairRequestSchema.parse({
      instruction: "修复第一句的角色引用",
      context: authoringContext,
      patch: {
        operations: [
          {
            op: "replace_content",
            messageId: "404",
            content: "新的台词",
          },
        ],
      },
      validationErrors: [
        {
          code: "message_not_found",
          message: "找不到 messageId: 404",
          operationIndex: 0,
          messageId: "404",
        },
      ],
    });

    expect(request.validationErrors[0]?.code).toBe("message_not_found");
  });

  it("accepts stream status and final patch events", () => {
    const status = galCopilotPatchStreamEventSchema.parse({
      type: "status",
      status: "drafting_patch",
      message: "正在生成结构化修改草稿",
    });
    const patch = galCopilotPatchStreamEventSchema.parse({
      type: "patch",
      response: {
        patch: {
          operations: [
            {
              op: "replace_content",
              messageId: "100",
              content: "门被风猛地推开。",
            },
          ],
        },
        model: "gpt-5.4-mini",
      },
    });

    expect(status.type).toBe("status");
    expect(patch.type).toBe("patch");
  });
});
