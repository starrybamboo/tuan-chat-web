import { SPACE_MEMBER_TYPE } from "@tuanchat/domain/member-permissions";
import { describe, expect, it } from "vitest";

import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import type { ChatMessageResponse, Message } from "../../../../api";

import {
  buildClueDragPayload,
  getAutoJoinPublicClueSpaceId,
  getClueAttachmentKind,
  getClueListPreviewText,
  getReorderedCluePosition,
  hasUnsavedClueChanges,
  hasRenderableClueImage,
  normalizeClueDraftContent,
  resolveClueMessageSenderContext,
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
  it("线索草稿内容会按后端长度上限截断", () => {
    const contentAtLimit = "一".repeat(1024);
    const contentOverLimit = `${contentAtLimit}二`;

    expect(normalizeClueDraftContent(contentAtLimit)).toBe(contentAtLimit);
    expect(normalizeClueDraftContent(contentOverLimit)).toBe(contentAtLimit);
  });

  it("只在新建或编辑内容实际变化时标记未保存", () => {
    expect(hasUnsavedClueChanges({
      mode: "create",
      draftContent: "",
      initialContent: "",
    })).toBe(false);
    expect(hasUnsavedClueChanges({
      mode: "create",
      draftContent: "",
      initialContent: "",
      hasAttachment: true,
    })).toBe(true);
    expect(hasUnsavedClueChanges({
      mode: "edit",
      draftContent: "原内容",
      initialContent: "原内容",
    })).toBe(false);
    expect(hasUnsavedClueChanges({
      mode: "edit",
      draftContent: "修改后内容",
      initialContent: "原内容",
    })).toBe(true);
  });

  it("线索列表预览会压缩空白并截断长文本", () => {
    expect(getClueListPreviewText(createMessage({
      content: "  第一行\n第二行\t第三行  ",
    }))).toBe("第一行 第二行 第三行");

    expect(getClueListPreviewText(createMessage({
      content: "12345678901",
    }), 10)).toBe("1234567...");

    expect(getClueListPreviewText(createMessage({
      content: "   ",
    }))).toBe("线索");
  });

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

  it("玩家创建线索时使用当前角色和立绘发言", () => {
    expect(resolveClueMessageSenderContext({
      currentAvatarId: 7,
      currentRoleId: 3,
      memberType: SPACE_MEMBER_TYPE.PLAYER,
    })).toEqual({
      ok: true,
      requestContext: {
        avatarId: 7,
        roleId: 3,
      },
    });
  });

  it("玩家未选择角色时不能创建线索", () => {
    expect(resolveClueMessageSenderContext({
      currentAvatarId: -1,
      currentRoleId: 0,
      memberType: SPACE_MEMBER_TYPE.PLAYER,
    })).toEqual({
      ok: false,
      message: "请先选择一个可发言角色，再创建线索",
    });
  });

  it("主持使用旁白创建线索时不注入玩家角色", () => {
    expect(resolveClueMessageSenderContext({
      currentAvatarId: -1,
      currentRoleId: -1,
      memberType: SPACE_MEMBER_TYPE.LEADER,
    })).toEqual({
      ok: true,
      requestContext: {},
    });
  });
});
