import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";

import { MESSAGE_TYPE } from "@tuanchat/domain/message-type";
import { describe, expect, it, vi } from "vitest";

import type { MobileMessageAttachment } from "./mobileMessageAttachment";

const MOBILE_MESSAGE_ATTACHMENT_KIND = vi.hoisted(() => ({
  AUDIO: "audio",
  FILE: "file",
  IMAGE: "image",
  VIDEO: "video",
} as const));

vi.mock("./mobileMessageAttachment", () => ({
  MOBILE_MESSAGE_ATTACHMENT_KIND,
}));

import {
  alignOptimisticMessagesToMediaDrafts,
  buildOptimisticAttachmentRequests,
  filterOptimisticMessagesForUploadedAttachments,
} from "./mobileMessageAttachmentOptimistic";

function imageAttachment(overrides: Partial<MobileMessageAttachment> = {}): MobileMessageAttachment {
  return {
    fileName: "scene.png",
    height: 300,
    id: "image-1",
    kind: MOBILE_MESSAGE_ATTACHMENT_KIND.IMAGE,
    mimeType: "image/png",
    size: 1024,
    uri: "file:///cache/scene.png",
    width: 400,
    ...overrides,
  };
}

function videoAttachment(overrides: Partial<MobileMessageAttachment> = {}): MobileMessageAttachment {
  return {
    fileName: "clip.mp4",
    id: "video-1",
    kind: MOBILE_MESSAGE_ATTACHMENT_KIND.VIDEO,
    mimeType: "video/mp4",
    size: 2048,
    uri: "file:///cache/clip.mp4",
    ...overrides,
  };
}

function createOptimisticMessage(messageId: number, attachmentId: string): ChatMessageResponse {
  return {
    message: {
      content: "",
      extra: {
        tcLocalAttachmentPreview: {
          attachmentId,
          kind: MOBILE_MESSAGE_ATTACHMENT_KIND.IMAGE,
          localUri: `file:///cache/${attachmentId}.png`,
          uploadState: "uploading",
        },
      } as any,
      messageId,
      messageType: MESSAGE_TYPE.IMG,
      position: Math.abs(messageId),
      roomId: 9,
      status: 0,
      syncId: messageId,
      userId: 7,
    },
  };
}

describe("mobileMessageAttachmentOptimistic", () => {
  it("为本地图片和视频生成可立即渲染的上传占位请求", () => {
    const requests = buildOptimisticAttachmentRequests(
      [
        videoAttachment(),
        imageAttachment(),
      ],
      {
        context: {
          avatarId: 5,
          customRoleName: "旁白",
          replayMessageId: 11,
          roleId: -1,
        },
        inputText: "看看这张图",
        roomId: 9,
      },
    );

    expect(requests.map(request => request.messageType)).toEqual([MESSAGE_TYPE.IMG, MESSAGE_TYPE.VIDEO]);
    expect(requests[0]).toMatchObject({
      avatarId: 5,
      content: "看看这张图",
      customRoleName: "旁白",
      replayMessageId: 11,
      roleId: -1,
      roomId: 9,
      extra: {
        imageMessage: {
          source: {
            kind: "external",
            url: "file:///cache/scene.png",
            provider: "mobile-local",
          },
          fileName: "scene.png",
          width: 400,
          height: 300,
        },
        tcLocalAttachmentPreview: {
          attachmentId: "image-1",
          localUri: "file:///cache/scene.png",
          uploadState: "uploading",
        },
      },
    });
    expect(requests[1].content).toBe("");
  });

  it("按上传结果和正式 draft 顺序对齐成功的本地占位消息", () => {
    const imageOptimistic = createOptimisticMessage(-1, "image-ok");
    const failedOptimistic = createOptimisticMessage(-2, "image-failed");
    const successfulOptimistics = filterOptimisticMessagesForUploadedAttachments(
      [imageOptimistic, failedOptimistic],
      {
        failedAttachments: [{ attachment: imageAttachment({ id: "image-failed" }) }],
      },
    );

    const aligned = alignOptimisticMessagesToMediaDrafts(successfulOptimistics, [
      { content: "text", extra: {}, messageType: MESSAGE_TYPE.TEXT },
      { content: "image", extra: {}, messageType: MESSAGE_TYPE.IMG },
      { content: "file", extra: {}, messageType: MESSAGE_TYPE.FILE },
    ]);

    expect(successfulOptimistics).toEqual([imageOptimistic]);
    expect(aligned).toEqual([undefined, imageOptimistic, undefined]);
  });
});
