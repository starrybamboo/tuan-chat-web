import { describe, expect, it } from "vitest";

import { ANNOTATION_IDS } from "@/types/messageAnnotations";

import {
  getNextSyncedSoundMessagePurpose,
  resolveRenderedSoundMessagePurpose,
} from "./audioMessagePurpose";

describe("audioMessagePurpose", () => {
  it("渲染用途优先使用 annotation，而不是残留 payload", () => {
    expect(resolveRenderedSoundMessagePurpose({
      annotations: [ANNOTATION_IDS.SE],
      payloadPurpose: "bgm",
      content: "[播放BGM]",
    })).toBe("se");
  });

  it("删除 BGM annotation 时同步清除 payload purpose", () => {
    expect(getNextSyncedSoundMessagePurpose({
      previousAnnotations: [ANNOTATION_IDS.BGM],
      nextAnnotations: [],
      currentPurpose: "bgm",
    })).toBeUndefined();
  });

  it("旧消息没有音频 annotation 时，编辑无关注释不改动 payload purpose", () => {
    expect(getNextSyncedSoundMessagePurpose({
      previousAnnotations: ["dialog.concat"],
      nextAnnotations: ["dialog.concat", "figure.mini-avatar"],
      currentPurpose: "bgm",
    })).toBe("bgm");
  });

  it("切换音频 annotation 时同步为新的 purpose", () => {
    expect(getNextSyncedSoundMessagePurpose({
      previousAnnotations: [ANNOTATION_IDS.BGM],
      nextAnnotations: [ANNOTATION_IDS.SE],
      currentPurpose: "bgm",
    })).toBe("se");
  });
});
