import { describe, expect, it, vi } from "vitest";

import {
  buildRoleVoiceClearPatch,
  buildRoleVoiceUploadPatch,
  hasRoleVoiceMedia,
  normalizeLegacyVoiceUrl,
  resolveRoleVoiceUrl,
} from "./roleVoiceMedia";

vi.mock("@/utils/mediaUrl", () => ({
  mediaFileUrl: (fileId?: number | string | null, mediaType?: string | null, quality?: string | null) =>
    fileId ? `media:${mediaType}:${quality}:${fileId}` : "",
}));

describe("roleVoiceMedia", () => {
  it("语音槽位优先使用 voiceFileId，不让旧 voiceUrl 覆盖正式媒体", () => {
    expect(resolveRoleVoiceUrl({
      voiceFileId: 42,
      voiceUrl: "https://legacy.example/ref.wav",
    })).toBe("media:audio:original:42");
  });

  it("只在缺少 voiceFileId 时读取同槽位 legacy voiceUrl", () => {
    expect(resolveRoleVoiceUrl({
      voiceUrl: " https://legacy.example/ref.wav ",
    })).toBe("https://legacy.example/ref.wav");
    expect(hasRoleVoiceMedia({ voiceUrl: "   " })).toBe(false);
  });

  it("上传 patch 只写 voiceFileId，并显式清空 legacy URL", () => {
    expect(buildRoleVoiceUploadPatch({ voiceFileId: 88, mediaType: "audio" })).toEqual({
      voiceFileId: 88,
      voiceUrl: null,
    });
  });

  it("清理 patch 同时清空 voiceFileId 和 legacy URL", () => {
    expect(buildRoleVoiceClearPatch()).toEqual({
      voiceFileId: null,
      voiceUrl: null,
    });
  });

  it("legacy voiceUrl 只做 trim", () => {
    expect(normalizeLegacyVoiceUrl(" https://legacy.example/ref.wav ")).toBe("https://legacy.example/ref.wav");
    expect(normalizeLegacyVoiceUrl(null)).toBe("");
  });
});
