import { describe, expect, it } from "vitest";

import { ANNOTATION_IDS } from "@/types/messageAnnotations";

import { resolveAudioAutoPlayPurposeFromAnnotationTransition } from "./audioMessageAutoPlayPolicy";

describe("audioMessageAutoPlayPolicy", () => {
  it("第一次发送带 BGM annotation 的音频时触发自动播放", () => {
    expect(resolveAudioAutoPlayPurposeFromAnnotationTransition(undefined, {
      annotations: [ANNOTATION_IDS.BGM],
    })).toBe("bgm");
  });

  it("消息更新后新增 BGM annotation 时触发自动播放", () => {
    expect(resolveAudioAutoPlayPurposeFromAnnotationTransition({
      annotations: [],
    }, {
      annotations: [ANNOTATION_IDS.BGM],
    })).toBe("bgm");
  });

  it("删除 BGM annotation 时不触发自动播放", () => {
    expect(resolveAudioAutoPlayPurposeFromAnnotationTransition({
      annotations: [ANNOTATION_IDS.BGM],
    }, {
      annotations: [],
    })).toBeUndefined();
  });

  it("仅残留 payload purpose 时不触发自动播放", () => {
    expect(resolveAudioAutoPlayPurposeFromAnnotationTransition({
      annotations: [],
      extra: {
        soundMessage: {
          purpose: "bgm",
        },
      },
    } as any, {
      annotations: [],
      extra: {
        soundMessage: {
          purpose: "bgm",
        },
      },
    } as any)).toBeUndefined();
  });
});
