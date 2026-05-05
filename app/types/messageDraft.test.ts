import { describe, expect, it } from "vitest";

import {
  buildChatMessageRequestFromDraft,
  buildMessageDraftsFromUploadedMedia,
  buildMessageExtraForRequest,
  normalizeMessageExtraForMatch,
} from "@/types/messageDraft";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

describe("messageDraft request normalization", () => {
  it("把嵌套图片草稿转换成后端要求的非扁平 extra", () => {
    const request = buildChatMessageRequestFromDraft({
      content: "图片说明",
      messageType: MESSAGE_TYPE.IMG,
      extra: {
        imageMessage: {
          fileId: "42",
          mediaType: " image ",
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
        fileId: 42,
        mediaType: "image",
        fileName: "cover.png",
        width: 1920,
        height: 1080,
        size: 2048,
        background: true,
      },
    });
    expect(request.customRoleName).toBe("旁白");
  });

  it("音频草稿缺少 second 时直接抛出前端错误", () => {
    expect(() => buildChatMessageRequestFromDraft({
      messageType: MESSAGE_TYPE.SOUND,
      extra: {
        soundMessage: {
          fileId: 43,
          mediaType: "audio",
          fileName: "a.mp3",
          size: 4096,
          purpose: "BGM",
        },
      },
    } as any, {
      roomId: 1,
    })).toThrow("音频素材缺少必要字段");
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

  it("文件草稿请求会统一走 fileMessage 包装层", () => {
    const request = buildChatMessageRequestFromDraft({
      messageType: MESSAGE_TYPE.FILE,
      content: "资料包",
      extra: {
        fileMessage: {
          fileId: "44",
          mediaType: " document ",
          fileName: " rules.pdf ",
          size: "4096",
        },
      },
    } as any, {
      roomId: 1,
    });

    expect(request.extra).toEqual({
      fileMessage: {
        fileId: 44,
        mediaType: "document",
        fileName: "rules.pdf",
        size: 4096,
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
        fileId: 45,
        mediaType: "image",
        fileName: "a.png",
        width: 512,
        height: 512,
        size: 1024,
        background: false,
      },
    })).toEqual({
      imageMessage: {
        fileId: 45,
        mediaType: "image",
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
        fileId: 45,
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
          fileId: 45,
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

  it("保留暗骰的 hidden 元数据", () => {
    expect(buildMessageExtraForRequest(MESSAGE_TYPE.DICE, {
      diceResult: {
        result: "D100=42/80 成功",
        hidden: true,
      },
    })).toEqual({
      diceResult: {
        result: "D100=42/80 成功",
        hidden: true,
      },
    });
  });

  it("上传后的多媒体与文件素材会复用首条文本并按类型组装草稿", () => {
    expect(buildMessageDraftsFromUploadedMedia({
      baseMessage: {
        roleId: 2,
        avatarId: 3,
        customRoleName: " 旁白 ",
      },
      fileAnnotations: ["file-annotation"],
      inputText: "开场白",
      imageAnnotations: ["image-annotation"],
      soundAnnotations: ["sound-annotation"],
      textAnnotations: ["text-annotation"],
      videoAnnotations: ["video-annotation"],
      uploadedImages: [{
        fileId: 101,
        mediaType: "image",
        width: 640,
        height: 360,
        size: 2048,
        fileName: "cover.png",
        background: true,
      }],
      uploadedSoundMessage: {
        fileId: 102,
        mediaType: "audio",
        fileName: "voice.webm",
        size: 4096,
        second: 2,
        purpose: "bgm",
      },
      uploadedVideos: [{
        fileId: 103,
        mediaType: "video",
        fileName: "clip.mp4",
        size: 8192,
        second: 12,
      }],
      uploadedFiles: [{
        fileId: 104,
        mediaType: "document",
        fileName: "rules.pdf",
        size: 16384,
      }],
    })).toEqual([{
      roleId: 2,
      avatarId: 3,
      customRoleName: "旁白",
      annotations: ["image-annotation"],
      content: "开场白",
      messageType: MESSAGE_TYPE.IMG,
      extra: {
        imageMessage: {
          fileId: 101,
          mediaType: "image",
          width: 640,
          height: 360,
          size: 2048,
          fileName: "cover.png",
          background: true,
        },
      },
    }, {
      roleId: 2,
      avatarId: 3,
      customRoleName: "旁白",
      annotations: ["sound-annotation"],
      content: "",
      messageType: MESSAGE_TYPE.SOUND,
      extra: {
        soundMessage: {
          fileId: 102,
          mediaType: "audio",
          fileName: "voice.webm",
          size: 4096,
          second: 2,
          purpose: "bgm",
        },
      },
    }, {
      roleId: 2,
      avatarId: 3,
      customRoleName: "旁白",
      annotations: ["video-annotation"],
      content: "",
      messageType: MESSAGE_TYPE.VIDEO,
      extra: {
        videoMessage: {
          fileId: 103,
          mediaType: "video",
          fileName: "clip.mp4",
          size: 8192,
          second: 12,
        },
      },
    }, {
      roleId: 2,
      avatarId: 3,
      customRoleName: "旁白",
      annotations: ["file-annotation"],
      content: "",
      messageType: MESSAGE_TYPE.FILE,
      extra: {
        fileMessage: {
          fileId: 104,
          mediaType: "document",
          fileName: "rules.pdf",
          size: 16384,
        },
      },
    }]);
  });
});
