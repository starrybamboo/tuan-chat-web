import { describe, expect, it, vi } from "vitest";

import {
  buildRoleVoiceClearPatch,
  buildRoleVoiceUploadPatch,
  hasRoleVoiceMedia,
  resolveRoleVoiceUrl,
} from "./roleVoiceMedia";

vi.mock("@/utils/media/mediaUrl", () => ({
  mediaFileUrl: (fileId?: number | string | null, mediaType?: string | null, quality?: string | null) =>
    fileId ? `media:${mediaType}:${quality}:${fileId}` : undefined,
}));

describe("roleVoiceMedia", () => {
  it("语音槽位使用 voiceFileId 生成正式媒体地址", () => {
    expect(resolveRoleVoiceUrl({
      voiceFileId: 42,
    })).toBe("media:audio:original:42");
  });

  it("缺少 voiceFileId 时视为没有语音媒体", () => {
    expect(resolveRoleVoiceUrl({})).toBe("");
    expect(hasRoleVoiceMedia({})).toBe(false);
  });

  it("上传 patch 只写 voiceFileId", () => {
    expect(buildRoleVoiceUploadPatch({ voiceFileId: 88, mediaType: "audio" })).toEqual({
      voiceFileId: 88,
    });
  });

  it("清理 patch 只清空 voiceFileId", () => {
    expect(buildRoleVoiceClearPatch()).toEqual({
      voiceFileId: null,
    });
  });
});
