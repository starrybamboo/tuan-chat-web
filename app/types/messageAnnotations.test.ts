import { describe, expect, it } from "vitest";

import {
  getEffectDurationMs,
  getEffectFromAnnotations,
  getEffectSoundFileCandidates,
  normalizeAnnotations,
} from "@/types/messageAnnotations";

describe("messageAnnotations effect aliases", () => {
  it("把新增特效的数字别名归一化成文件名标注", () => {
    expect(normalizeAnnotations(["effect.15", "effect.16", "effect.17", "effect.18"])).toEqual([
      "effect.en_sleep.webp",
      "effect.en_cry.webp",
      "effect.en_dizzy.webp",
      "effect.en_heartbreak.webp",
    ]);
  });

  it("为新增特效返回稳定的 WebGAL 时长", () => {
    expect(getEffectDurationMs("effect.en_sleep.webp")).toBe(2448);
    expect(getEffectDurationMs("effect.en_cry.webp")).toBe(2448);
    expect(getEffectDurationMs("effect.en_dizzy.webp")).toBe(2448);
    expect(getEffectDurationMs("effect.en_heartbreak.webp")).toBe(1920);
  });

  it("从 annotation 集里提取新增特效时仍返回内部 effect id", () => {
    expect(getEffectFromAnnotations(["effect.en_sleep.webp"])).toBe("effect.15");
    expect(getEffectFromAnnotations(["effect.en_cry.webp"])).toBe("effect.16");
    expect(getEffectFromAnnotations(["effect.en_dizzy.webp"])).toBe("effect.17");
    expect(getEffectFromAnnotations(["effect.en_heartbreak.webp"])).toBe("effect.18");
  });

  it("为新增特效推导音效候选文件名", () => {
    expect(getEffectSoundFileCandidates("effect.en_sleep.webp")).toEqual(["en_sleep.mp3", "en_sleep.webm"]);
    expect(getEffectSoundFileCandidates("effect.en_heartbreak.webp")).toEqual(["en_heartbreak.mp3", "en_heartbreak.webm"]);
  });
});
