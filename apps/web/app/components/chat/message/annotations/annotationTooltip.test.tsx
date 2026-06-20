import { describe, expect, it } from "vitest";

import type { AnnotationDefinition } from "./annotationCatalog";

import { getAnnotationTooltipDoc } from "./annotationTooltip";

function annotation(id: string, label = id): AnnotationDefinition {
  return {
    id,
    label,
    tone: "neutral",
    source: "builtin",
  };
}

describe("annotationTooltip", () => {
  it("沿用 WebGAL 文档解释 dialog.next", () => {
    const doc = getAnnotationTooltipDoc(annotation("dialog.next", "立即执行后续"));
    const details = doc.details?.join("\n") ?? "";

    expect(doc.summary).toContain("同步执行接下来的语句");
    expect(details).toContain("直至找到 `next` 为 `false` 的语句为止");
    expect(details).toContain("wait");
    expect(doc.webgal).toContain("角色名: 文本 -next;");
  });

  it("普通立绘位置标注只显示简短作用", () => {
    const doc = getAnnotationTooltipDoc(annotation("figure.pos.right-center", "右中"));

    expect(doc.summary).toContain("右中位置");
    expect(doc.details).toBeUndefined();
    expect(doc.webgal).toBeUndefined();
  });

  it("普通角色动作标注不暴露底层 setAnimation 输出", () => {
    const doc = getAnnotationTooltipDoc(annotation("figure.anim.ba-shake", "摇晃"));

    expect(doc.summary).toContain("动作动画");
    expect(doc.details).toBeUndefined();
    expect(doc.webgal).toBeUndefined();
  });

  it("普通角色特效只显示摘要和资源信息", () => {
    const doc = getAnnotationTooltipDoc({
      ...annotation("effect.en_hmm.webp", "hmm"),
      category: "特效",
      effectFrames: 36,
    });

    expect(doc.summary).toContain("表情特效");
    expect(doc.details).toBeUndefined();
    expect(doc.webgal).toBeUndefined();
    expect(doc.notes?.join("\n")).toContain("资源帧数：36");
    expect(doc.notes?.join("\n")).toContain("播放时长约 1968ms");
  });

  it("清除类标注不暴露底层 WebGAL 输出", () => {
    const doc = getAnnotationTooltipDoc(annotation("figure.clear", "清除立绘"));

    expect(doc.summary).toContain("清除当前角色立绘");
    expect(doc.details).toBeUndefined();
    expect(doc.webgal).toBeUndefined();
  });

  it("未知标注只显示保存用途", () => {
    const doc = getAnnotationTooltipDoc(annotation("custom:foo", "自定义"));

    expect(doc.summary).toContain("自定义");
    expect(doc.details).toBeUndefined();
    expect(doc.webgal).toBeUndefined();
  });
});
