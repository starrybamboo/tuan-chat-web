import { beforeEach, describe, expect, it, vi } from "vitest";

import type { GalAuthoringContext, GalPatchValidationError, GalStoryPatch } from "@tuanchat/galgame-ai-contract";

const fetchWithUnifiedAuthMock = vi.hoisted(() => vi.fn());

vi.mock("../../../../api/unifiedAuthFetch", () => ({
  fetchWithUnifiedAuth: fetchWithUnifiedAuthMock,
}));

const {
  extractJsonObjectText,
  normalizeGalStoryPatchInput,
  requestGalCopilotPatch,
  requestGalCopilotPatchRepair,
  requestGalCopilotPatchStream,
  resolveAiGatewayBaseUrl,
} = await import("./copilotClient");
const { buildGalCopilotPrompt } = await import("./copilotPrompts");

const context: GalAuthoringContext = {
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
  attachmentRefs: [],
};

const patch: GalStoryPatch = {
  operations: [
    {
      op: "replace_content",
      messageId: "100",
      content: "门被风猛地推开。",
    },
  ],
};

function createStreamResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  return new Response(new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  }), {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
    },
  });
}

function createCompletionResponse(content: string): Response {
  return new Response(JSON.stringify({
    model: "gpt-5.4-mini",
    choices: [
      {
        message: {
          role: "assistant",
          content,
        },
      },
    ],
    usage: {
      prompt_tokens: 10,
      completion_tokens: 4,
      total_tokens: 14,
    },
  }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function toOpenAiChunk(content: string) {
  return {
    id: "chatcmpl-test",
    object: "chat.completion.chunk",
    choices: [
      {
        index: 0,
        delta: {
          content,
        },
      },
    ],
  };
}

function toSseData(items: Array<string | object>): string {
  return items
    .map(item => `data: ${typeof item === "string" ? item : JSON.stringify(item)}\n\n`)
    .join("");
}

describe("copilotClient", () => {
  beforeEach(() => {
    fetchWithUnifiedAuthMock.mockReset();
  });

  it("resolves and trims Java AI gateway base URLs", () => {
    expect(resolveAiGatewayBaseUrl(undefined)).not.toMatch(/\/$/);
    expect(resolveAiGatewayBaseUrl(" http://localhost:8081/// ")).toBe("http://localhost:8081");
  });

  it("extracts JSON objects from fenced model output", () => {
    expect(extractJsonObjectText("```json\n{\"operations\": []}\n```")).toBe("{\"operations\": []}");
    expect(extractJsonObjectText("说明文字 {\"operations\": []} 结束")).toBe("{\"operations\": []}");
    expect(extractJsonObjectText("没有 JSON")).toBeNull();
  });

  it("posts validation repair prompts to the Java AI gateway", async () => {
    const validationErrors: GalPatchValidationError[] = [
      {
        code: "message_not_found",
        message: "找不到 messageId: 404",
        operationIndex: 0,
        messageId: "404",
      },
    ];
    fetchWithUnifiedAuthMock.mockResolvedValueOnce(createCompletionResponse(JSON.stringify(patch)));

    const result = await requestGalCopilotPatchRepair({
      instruction: "修复草稿",
      context,
      patch,
      validationErrors,
      baseUrl: "http://localhost:8081/",
    });

    expect(result.patch.operations).toHaveLength(1);
    expect(fetchWithUnifiedAuthMock).toHaveBeenCalledWith(
      "http://localhost:8081/ai/gateway/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
      }),
      expect.objectContaining({
        recoveryBaseUrl: "http://localhost:8081/",
      }),
    );
    const [, init] = fetchWithUnifiedAuthMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({
      scene: "galgame_authoring",
      model: "gpt-5.4-mini",
      stream: false,
    });
    expect(body.messages[1].content).toContain("message_not_found");
  });

  it("repairs malformed non-stream JSON through the Java AI gateway", async () => {
    fetchWithUnifiedAuthMock
      .mockResolvedValueOnce(createCompletionResponse("不是 JSON"))
      .mockResolvedValueOnce(createCompletionResponse(JSON.stringify(patch)));

    const result = await requestGalCopilotPatch({
      instruction: "改第一句",
      context,
      baseUrl: "http://localhost:8081",
    });

    expect(result.patch.operations).toEqual(patch.operations);
    expect(fetchWithUnifiedAuthMock).toHaveBeenCalledTimes(2);
    const [, repairInit] = fetchWithUnifiedAuthMock.mock.calls[1] as [string, RequestInit];
    const repairBody = JSON.parse(String(repairInit.body));
    expect(repairBody.messages[1].content).toContain("解析/校验错误");
  });

  it("compiles semantic intent responses before returning patches", async () => {
    const modelIntentResponse = {
      intents: [
        {
          action: "insert_after",
          anchor: { messageId: "100" },
          message: {
            speaker: "林夏",
            content: "我不会再躲了。",
          },
        },
      ],
    };
    fetchWithUnifiedAuthMock.mockResolvedValueOnce(createCompletionResponse(JSON.stringify(modelIntentResponse)));

    const result = await requestGalCopilotPatch({
      instruction: "在第一句后插入一句林夏台词",
      context,
      baseUrl: "http://localhost:8081",
    });

    expect(fetchWithUnifiedAuthMock).toHaveBeenCalledTimes(1);
    expect(result.patch.operations).toEqual([
      {
        op: "insert_after",
        afterMessageId: "100",
        message: {
          messageType: 1,
          purpose: "dialogue",
          roleId: "20",
          content: "我不会再躲了。",
          annotations: [],
        },
      },
    ]);
  });

  it("keeps legacy patch aliases compatible", () => {
    expect(normalizeGalStoryPatchInput({
      operations: [
        {
          op: "insert_after",
          messageId: "100",
          message: {
            roleName: "沙",
            content: "嗯。",
          },
        },
      ],
    }, context)).toEqual({
      operations: [
        {
          op: "insert_after",
          afterMessageId: "100",
          message: {
            messageType: 1,
            customRoleName: "沙",
            content: "嗯。",
          },
        },
      ],
    });
  });

  it("parses fragmented OpenAI-compatible SSE patch streams", async () => {
    const body = toSseData([
      toOpenAiChunk("{\"operations\""),
      toOpenAiChunk(`:${JSON.stringify(patch.operations)}`),
      toOpenAiChunk("}"),
      "[DONE]",
    ]);
    fetchWithUnifiedAuthMock.mockResolvedValueOnce(createStreamResponse([
      body.slice(0, 37),
      body.slice(37, 80),
      body.slice(80),
    ]));
    const eventTypes: string[] = [];

    const result = await requestGalCopilotPatchStream({
      instruction: "改第一句",
      context,
      baseUrl: "http://localhost:8081",
      onEvent: event => eventTypes.push(event.type === "status" ? `status:${event.status}` : event.type),
    });

    expect(result.patch.operations).toEqual(patch.operations);
    expect(fetchWithUnifiedAuthMock).toHaveBeenCalledWith(
      "http://localhost:8081/ai/gateway/v1/chat/stream",
      expect.objectContaining({
        method: "POST",
      }),
      expect.objectContaining({
        recoveryBaseUrl: "http://localhost:8081",
      }),
    );
    expect(eventTypes).toEqual([
      "status:analyzing_context",
      "status:drafting_patch",
      "text_delta",
      "text_delta",
      "text_delta",
      "status:validating_patch",
      "patch",
      "done",
    ]);
  });

  it("repairs malformed stream JSON through the Java AI gateway", async () => {
    const body = toSseData([
      toOpenAiChunk("不是 JSON"),
      "[DONE]",
    ]);
    fetchWithUnifiedAuthMock
      .mockResolvedValueOnce(createStreamResponse([body]))
      .mockResolvedValueOnce(createCompletionResponse(JSON.stringify(patch)));
    const eventTypes: string[] = [];

    const result = await requestGalCopilotPatchStream({
      instruction: "改第一句",
      context,
      baseUrl: "http://localhost:8081",
      onEvent: event => eventTypes.push(event.type === "status" ? `status:${event.status}` : event.type),
    });

    expect(result.patch.operations).toEqual(patch.operations);
    expect(fetchWithUnifiedAuthMock).toHaveBeenCalledTimes(2);
    expect(eventTypes).toContain("status:repairing_patch");
  });

  it("rejects when the OpenAI-compatible stream emits an error event", async () => {
    fetchWithUnifiedAuthMock.mockResolvedValueOnce(createStreamResponse([
      toSseData([
        {
          error: {
            message: "模型生成失败",
          },
        },
      ]),
    ]));

    await expect(requestGalCopilotPatchStream({
      instruction: "改第一句",
      context,
    })).rejects.toThrow("模型生成失败");
  });

  it("renders dragged reference rooms as read-only referenceId attachments", () => {
    const prompt = buildGalCopilotPrompt({
      instruction: "参考雨夜前奏，改当前房间最后一句",
      context: {
        ...context,
        attachmentRefs: [
          {
            kind: "room",
            roomId: "11",
            label: "雨夜前奏",
          },
        ],
        referenceRooms: [
          {
            refId: "room:11",
            room: {
              spaceId: "1",
              roomId: "11",
              name: "雨夜前奏",
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
      },
    });

    expect(prompt).toContain("referenceRooms 是只读参考资料");
    expect(prompt).toContain("顶层只能包含 intents 字段");
    expect(prompt).toContain("\"referenceId\": \"room:11/message:200\"");
    expect(prompt).not.toContain("\"messageId\": \"200\"");
  });
});
