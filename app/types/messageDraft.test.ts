import { describe, expect, it } from "vitest";

import { buildChatMessageRequestFromDraft, normalizeMessageExtraForMatch } from "@/types/messageDraft";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

describe("messageDraft request normalization", () => {
  it("把嵌套图片草稿转换成后端要求的非扁平 extra", () => {
    const request = buildChatMessageRequestFromDraft({
      content: "图片说明",
      messageType: MESSAGE_TYPE.IMG,
      extra: {
        imageMessage: {
          url: " https://static.example.com/a.png ",
          fileName: " cover.png ",
          width: "1920",
          height: 1080,
          size: "2048",
          background: "true",
        },
      },
    } as any, {
      roomId: 1,
      roleId: 2,
      avatarId: 3,
      customRoleName: " 旁白 ",
    });

    expect(request.extra).toEqual({
      imageMessage: {
        url: "https://static.example.com/a.png",
        fileName: "cover.png",
        width: 1920,
        height: 1080,
        size: 2048,
        background: true,
      },
    });
    expect(request.customRoleName).toBe("旁白");
  });

  it("音频草稿在缺少 second 时回退到 1 秒，避免后端校验失败", () => {
    const request = buildChatMessageRequestFromDraft({
      messageType: MESSAGE_TYPE.SOUND,
      extra: {
        soundMessage: {
          url: "https://static.example.com/a.mp3",
          fileName: "a.mp3",
          size: 4096,
          purpose: "BGM",
        },
      },
    } as any, {
      roomId: 1,
    });

    expect(request.extra).toEqual({
      soundMessage: {
        url: "https://static.example.com/a.mp3",
        fileName: "a.mp3",
        size: 4096,
        second: 1,
        purpose: "bgm",
      },
    });
  });

  it("保留 roomJump 的包装层，但内部字段统一裁剪", () => {
    const request = buildChatMessageRequestFromDraft({
      messageType: MESSAGE_TYPE.ROOM_JUMP,
      extra: {
        roomJump: {
          roomId: "12",
          spaceId: "34",
          label: " 去大厅 ",
        },
      },
    } as any, {
      roomId: 1,
    });

    expect(request.extra).toEqual({
      roomJump: {
        roomId: 12,
        spaceId: 34,
        label: "去大厅",
      },
    });
  });

  it("thread root 请求也统一走 threadRoot 包装层", () => {
    const request = buildChatMessageRequestFromDraft({
      messageType: MESSAGE_TYPE.THREAD_ROOT,
      content: "子区标题",
      extra: {
        threadRoot: {
          title: " 子区标题 ",
        },
      },
    } as any, {
      roomId: 1,
    });

    expect(request.extra).toEqual({
      threadRoot: {
        title: "子区标题",
      },
    });
  });

  it("stateEvent 请求会保留结构化包装层并规范字段", () => {
    const request = buildChatMessageRequestFromDraft({
      messageType: MESSAGE_TYPE.STATE_EVENT,
      content: ".st hp -2",
      extra: {
        stateEvent: {
          source: {
            kind: " command ",
            commandName: " st ",
            parserVersion: " state-event-v1 ",
          },
          events: [{
            type: "varOp",
            scope: {
              kind: "role",
              roleId: "3",
            },
            key: " hp ",
            op: "sub",
            value: "2",
          }],
        },
      },
    } as any, {
      roomId: 1,
      roleId: 3,
      avatarId: 5,
    });

    expect(request.extra).toEqual({
      stateEvent: {
        source: {
          kind: "command",
          commandName: "st",
          parserVersion: "state-event-v1",
        },
        events: [{
          type: "varOp",
          scope: {
            kind: "role",
            roleId: 3,
          },
          key: "hp",
          op: "sub",
          value: 2,
        }],
      },
    });
  });

  it("乐观匹配也只接受非扁平 extra", () => {
    expect(normalizeMessageExtraForMatch(MESSAGE_TYPE.IMG, {
      imageMessage: {
        url: "https://static.example.com/a.png",
        fileName: "a.png",
        width: 512,
        height: 512,
        size: 1024,
        background: false,
      },
    })).toEqual({
      imageMessage: {
        url: "https://static.example.com/a.png",
        fileName: "a.png",
        width: 512,
        height: 512,
        size: 1024,
        background: false,
      },
    });
  });

  it("扁平图片 extra 不再参与统一发送", () => {
    expect(() => buildChatMessageRequestFromDraft({
      messageType: MESSAGE_TYPE.IMG,
      extra: {
        url: "https://static.example.com/a.png",
        fileName: "a.png",
        width: 512,
        height: 512,
        size: 1024,
      },
    } as any, {
      roomId: 1,
    })).toThrow("图片素材缺少必要字段");
  });

  it("在图片素材缺少必要字段时直接抛出前端错误", () => {
    expect(() => buildChatMessageRequestFromDraft({
      messageType: MESSAGE_TYPE.IMG,
      extra: {
        imageMessage: {
          url: "https://static.example.com/a.png",
        },
      },
    } as any, {
      roomId: 1,
    })).toThrow("图片素材缺少必要字段");
  });

  it("stateEvent 缺少有效事件时直接抛出前端错误", () => {
    expect(() => buildChatMessageRequestFromDraft({
      messageType: MESSAGE_TYPE.STATE_EVENT,
      extra: {
        stateEvent: {
          source: {
            kind: "command",
            parserVersion: "state-event-v1",
          },
          events: [],
        },
      },
    } as any, {
      roomId: 1,
    })).toThrow("状态事件消息缺少有效 stateEvent");
  });
});
