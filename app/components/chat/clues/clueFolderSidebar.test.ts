import { describe, expect, it } from "vitest";

import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import type { ChatMessageResponse, Message } from "../../../../api";

import {
  buildClueDragPayload,
  getClueAttachmentKind,
  getAutoJoinPublicClueSpaceId,
  getReorderedCluePosition,
  hasRenderableClueImage,
} from "./clueFolderSidebar";

function createMessage(overrides: Partial<Message>): Message {
  return {
    messageId: 1,
    syncId: 1,
    roomId: 1,
    userId: 1,
    content: "",
    status: 0,
    messageType: MESSAGE_TYPE.TEXT,
    position: 0,
    ...overrides,
  };
}

function createResponse(messageId: number, position: number): ChatMessageResponse {
  return {
    message: createMessage({
      messageId,
      syncId: messageId,
      content: `线索 ${messageId}`,
      position,
    }),
  };
}

describe("clueFolderSidebar", () => {
  it("拖拽图片线索时保留原消息快照", () => {
    const message = createMessage({
      messageType: MESSAGE_TYPE.IMG,
      content: "现场照片",
      extra: {
        imageMessage: {
          fileId: 12,
          mediaType: "image",
        },
      } as any,
    });

    expect(buildClueDragPayload(message)).toMatchObject({
      snapshot: {
        messageType: MESSAGE_TYPE.IMG,
        content: "现场照片",
        extra: {
          imageMessage: {
            fileId: 12,
            mediaType: "image",
          },
        },
      },
    });
  });

  it("计算线索拖到顶部时的新 position", () => {
    const messages = [
      createResponse(1, 10),
      createResponse(2, 20),
      createResponse(3, 30),
    ];

    expect(getReorderedCluePosition(messages, {
      draggedMessageId: 1,
      targetMessageId: 3,
      placement: "before",
    })).toBe(31);
  });

  it("计算线索拖到两条之间时的新 position", () => {
    const messages = [
      createResponse(1, 10),
      createResponse(2, 20),
      createResponse(3, 30),
    ];

    expect(getReorderedCluePosition(messages, {
      draggedMessageId: 1,
      targetMessageId: 3,
      placement: "after",
    })).toBe(25);
  });

  it("线索拖到自身时不产生新 position", () => {
    const messages = [
      createResponse(1, 10),
      createResponse(2, 20),
    ];

    expect(getReorderedCluePosition(messages, {
      draggedMessageId: 1,
      targetMessageId: 1,
      placement: "after",
    })).toBeNull();
  });

  it("会按文件类型识别线索附件类型", () => {
    expect(getClueAttachmentKind(new File(["img"], "scene.png", { type: "image/png" }))).toBe("image");
    expect(getClueAttachmentKind(new File(["audio"], "bgm.mp3", { type: "audio/mpeg" }))).toBe("audio");
    expect(getClueAttachmentKind(new File(["video"], "clip.mp4", { type: "video/mp4" }))).toBe("video");
    expect(getClueAttachmentKind(new File(["doc"], "note.txt", { type: "text/plain" }))).toBe("file");
  });

  it("图片 payload 缺少类型时也应视作可渲染图片线索", () => {
    const message = createMessage({
      messageType: MESSAGE_TYPE.TEXT,
      extra: {
        imageMessage: {
          fileId: 12,
          mediaType: "image",
        },
      } as any,
    });

    expect(hasRenderableClueImage(message)).toBe(true);
  });

  it("非图片消息且没有图片 payload 时不应显示图片预览", () => {
    const message = createMessage({
      messageType: MESSAGE_TYPE.TEXT,
      extra: {},
    });

    expect(hasRenderableClueImage(message)).toBe(false);
  });

  it("仅在非主持且公共线索房间缺失时自动加入公共线索", () => {
    expect(getAutoJoinPublicClueSpaceId({
      canManagePublicClueMembers: false,
      clueRoom: null,
      scope: "public",
      spaceId: 12,
    })).toBe(12);
    expect(getAutoJoinPublicClueSpaceId({
      canManagePublicClueMembers: true,
      clueRoom: null,
      scope: "public",
      spaceId: 12,
    })).toBeNull();
    expect(getAutoJoinPublicClueSpaceId({
      canManagePublicClueMembers: false,
      clueRoom: createMessage({ roomId: 3 }) as any,
      scope: "public",
      spaceId: 12,
    })).toBeNull();
    expect(getAutoJoinPublicClueSpaceId({
      canManagePublicClueMembers: false,
      clueRoom: null,
      scope: "private",
      spaceId: 12,
    })).toBeNull();
  });
});
