import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";

import { describe, expect, it } from "vitest";

import {
  getClueCardRenderData,
  getDiceTurnRenderData,
  getDocCardRenderData,
  getForwardMessageRenderData,
  getRoomJumpRenderData,
  getWebgalChooseRenderData,
} from "./message-render-data";
import { MESSAGE_TYPE } from "./messageType";

function createForwardItem(messageId: number, status = 0): ChatMessageResponse {
  return {
    message: {
      content: `消息 ${messageId}`,
      messageId,
      messageType: MESSAGE_TYPE.TEXT,
      roomId: 1,
      status,
      userId: 7,
    },
  };
}

describe("message-render-data", () => {
  it("builds forward summaries and hides deleted preview items", () => {
    const data = getForwardMessageRenderData({
      forwardMessage: {
        messageList: [
          createForwardItem(1),
          createForwardItem(2, 1),
          createForwardItem(3),
          createForwardItem(4),
        ],
      },
    }, 2);

    expect(data).toMatchObject({
      count: 4,
      hiddenDeletedCount: 1,
      remainingCount: 1,
      title: "转发消息",
    });
    expect(data.previewMessages.map(item => item.message.messageId)).toEqual([1, 3]);
  });

  it("builds WebGAL choice summaries from prompt and options", () => {
    expect(getWebgalChooseRenderData({
      webgalChoose: {
        prompt: "选择路线",
        options: [
          { text: "去图书馆", code: "library" },
          { text: "回旅馆" },
          { label: "继续观察" },
        ],
      },
    })).toEqual({
      options: [
        { text: "去图书馆", code: "library" },
        { text: "回旅馆" },
        { text: "继续观察" },
      ],
      prompt: "选择路线",
      summary: "选择路线：去图书馆 / 回旅馆 / 继续观察",
      title: "选择",
    });
  });

  it("builds dice turn render data and masks hidden replies", () => {
    const extra = {
      diceTurn: {
        command: ".r 1d20",
        replies: [{
          content: "D20=19",
          hidden: true,
          roleId: 7,
          avatarId: 8,
          customRoleName: "骰娘",
        }],
      },
    };

    expect(getDiceTurnRenderData(extra, "", false)).toMatchObject({
      command: ".r 1d20",
      replies: [{
        avatarId: 8,
        content: "掷骰结果已隐藏",
        customRoleName: "骰娘",
        hidden: true,
        roleId: 7,
      }],
      summary: ".r 1d20",
      title: "骰子",
    });

    expect(getDiceTurnRenderData(extra, "", true).summary).toBe("D20=19");
  });

  it("infers command display for imported historical dice turns", () => {
    expect(getDiceTurnRenderData({
      diceTurn: {
        command: "【1d20: 18+80=98】",
        replies: [{ content: "【1d20: 18+80=98】", customRoleName: "骰娘" }],
      },
    })).toMatchObject({
      command: "【1d20+80：】",
      replies: [{ content: "【1d20: 18+80=98】", customRoleName: "骰娘" }],
      summary: "【1d20: 18+80=98】",
    });

    expect(getDiceTurnRenderData({
      diceTurn: {
        command: "假腿：每轮战斗都需要进行一次【1d100】的假腿判定",
        replies: [{ content: "假腿：每轮战斗都需要进行一次【1d100】的假腿判定", customRoleName: "骰娘" }],
      },
    }).command).toBe("假腿：每轮战斗都需要进行一次【1d100】的假腿判定");
  });

  it("builds doc, clue, and room jump fallback data", () => {
    expect(getDocCardRenderData({
      docCard: {
        docId: "42",
        excerpt: "第一页摘要",
        imageFileId: 9,
        imageMediaType: "image",
        roomId: 12,
        spaceId: 3,
        title: "调查笔记",
      },
    })).toMatchObject({
      docId: "42",
      excerpt: "第一页摘要",
      imageFileId: 9,
      imageMediaType: "image",
      roomId: 12,
      spaceId: 3,
      title: "调查笔记",
    });

    expect(getClueCardRenderData({
      clueMessage: {
        snapshot: {
          messageType: "6",
          content: "1d20=18",
          extra: {
            diceResult: { result: "1d20=18" },
          },
        },
      },
    })).toEqual({
      snapshot: {
        messageType: 6,
        content: "1d20=18",
        extra: {
          diceResult: { result: "1d20=18" },
        },
      },
    });

    expect(getClueCardRenderData({
      clueMessage: {
        snapshot: {
          messageType: "12",
          content: "",
          extra: {
            commandRequest: {
              command: ".rc 射击",
            },
          },
        },
      },
    })).toEqual({
      snapshot: {
        messageType: 12,
        content: "[检定请求] .rc 射击",
        extra: {
          commandRequest: {
            command: ".rc 射击",
          },
        },
      },
    });

    expect(getRoomJumpRenderData({ roomJump: { roomId: 8, roomName: "作战频道" } })).toMatchObject({
      label: "作战频道",
      roomId: 8,
      roomName: "作战频道",
    });
  });

  it("does not expose legacy doc card imageUrl when a cover fileId exists", () => {
    expect(getDocCardRenderData({
      docCard: {
        docId: "42",
        imageUrl: "https://legacy.example.com/cover.png",
        imageFileId: 9,
        originalImageFileId: 10,
      },
    })).toMatchObject({
      docId: "42",
      imageFileId: 9,
      imageUrl: "",
      originalImageFileId: 10,
    });

    expect(getDocCardRenderData({
      docCard: {
        docId: "43",
        imageUrl: " https://legacy.example.com/cover.png ",
      },
    }).imageUrl).toBe("https://legacy.example.com/cover.png");
  });

  it("uses stable fallback labels for incomplete payloads", () => {
    expect(getDocCardRenderData(undefined).title).toBe("文档");
    expect(getClueCardRenderData(undefined).snapshot).toEqual({
      content: "",
      messageType: 1,
    });
    expect(getRoomJumpRenderData(undefined).label).toBe("群聊跳转");
    expect(getWebgalChooseRenderData(undefined).summary).toBe("选择消息");
  });
});
