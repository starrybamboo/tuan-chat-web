import { describe, expect, it } from "vitest";

import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import { filterAnnotationsForMessageType, mergeAnnotationCatalog } from "./annotationCatalog";
import { buildAnnotationPickerSections, getAnnotationPickerContextLabel } from "./annotationPickerLayout";

function sectionsFor(messageType: number) {
  const catalog = filterAnnotationsForMessageType(mergeAnnotationCatalog(), messageType);
  return buildAnnotationPickerSections(catalog, messageType);
}

describe("annotationPickerLayout", () => {
  it("文本消息在同一面板内按高密度行展示立绘、特效和控制", () => {
    const sections = sectionsFor(MESSAGE_TYPE.TEXT);

    expect(sections.map(section => `${section.group}:${section.title}`)).toEqual([
      "场景:文本框",
      "场景:电影",
      "立绘:位置",
      "立绘:进场",
      "立绘:动作",
      "立绘:出场",
      "特效:角色",
      "背景:出场",
      "背景:速度",
      "控制:对话",
      "控制:清理",
    ]);
    expect(sections.find(section => section.key === "figure-position")?.items.map(item => item.id)).toEqual([
      "figure.pos.left",
      "figure.pos.left-center",
      "figure.pos.center",
      "figure.pos.right-center",
      "figure.pos.right",
      "figure.mini-avatar",
    ]);
    expect(sections.find(section => section.key === "figure-action")?.items.map(item => item.id)).toContain("figure.anim.ba-shake");
    expect(sections.find(section => section.key === "figure-position")?.groupDescription).toContain("角色立绘相关标注");
    expect(sections.find(section => section.key === "figure-position")?.description).toBe("选择本条角色立绘在舞台上的位置，或显示小头像。");
    expect(sections.find(section => section.key === "dialog-control")?.description).toContain("自动续播下句、续接上文或立即执行后续");
  });

  it("图片消息只显示图片用途行", () => {
    const sections = sectionsFor(MESSAGE_TYPE.IMG);

    expect(sections.map(section => `${section.group}:${section.title}`)).toEqual([
      "媒体:图片用途",
      "背景:进场",
      "背景:出场",
      "背景:速度",
      "场景:文本框",
      "场景:电影",
    ]);
    expect(sections[0]?.items.map(item => item.id)).toEqual(["sys:cg", "sys:bg", "image.show"]);
    expect(sections[1]?.items.map(item => item.id)).toEqual([
      "background.anim.enter",
      "background.anim.enter-from-left",
      "background.anim.enter-from-right",
      "background.anim.blur-in",
    ]);
    expect(sections[1]?.groupDescription).toContain("背景图层的进场");
    expect(sections[0]?.description).toContain("CG、背景还是常驻展示图");
  });

  it("特效消息展示场景控制、场景特效、背景出场和清理行", () => {
    const sections = sectionsFor(MESSAGE_TYPE.EFFECT);

    expect(sections.map(section => `${section.group}:${section.title}`)).toEqual([
      "场景:文本框",
      "场景:电影",
      "场景:特效",
      "背景:出场",
      "背景:速度",
      "场景:清理",
    ]);
    expect(sections[0]?.items.map(item => item.id)).toEqual([
      "scene.textbox.hide",
      "scene.textbox.show",
    ]);
    expect(sections[2]?.items.map(item => item.id)).toEqual([
      "scene.effect.rain",
      "scene.effect.snow",
      "scene.effect.sakura",
      "scene.effect.stop",
    ]);
  });

  it("未知消息类型显示通用上下文标签", () => {
    expect(getAnnotationPickerContextLabel(undefined)).toBe("全部标注");
    expect(getAnnotationPickerContextLabel(999999)).toBe("当前消息");
  });
});
