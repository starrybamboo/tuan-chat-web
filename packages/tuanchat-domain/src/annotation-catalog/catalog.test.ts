import { describe, expect, it } from "vitest";

import { MESSAGE_TYPE } from "../messageType";
import { filterAnnotationsForMessageType, getAnnotationCatalog, getAnnotationsByCategory } from "./catalog";

function idsFor(messageType?: number | null) {
  return new Set(filterAnnotationsForMessageType(getAnnotationCatalog(), messageType).map(item => item.id));
}

describe("annotation catalog", () => {
  it("按图片消息类型只展示图片相关强绑定标注", () => {
    const ids = idsFor(MESSAGE_TYPE.IMG);

    expect(ids.has("sys:bg")).toBe(true);
    expect(ids.has("sys:cg")).toBe(true);
    expect(ids.has("image.show")).toBe(true);
    expect(ids.has("background.anim.enter-from-left")).toBe(true);
    expect(ids.has("background.anim.blur-in")).toBe(true);
    expect(ids.has("background.speed.slow")).toBe(true);
    expect(ids.has("scene.textbox.hide")).toBe(true);
    expect(ids.has("sys:bgm")).toBe(false);
    expect(ids.has("figure.anim.enter")).toBe(false);
  });

  it("按音频消息类型只展示音频目的标注", () => {
    const ids = idsFor(MESSAGE_TYPE.SOUND);

    expect(ids.has("sys:bgm")).toBe(true);
    expect(ids.has("sys:se")).toBe(true);
    expect(ids.has("sys:bg")).toBe(false);
    expect(ids.has("figure.anim.ba-jump")).toBe(false);
  });

  it("按文本消息类型展示立绘动画并隐藏媒体专用标注", () => {
    const ids = idsFor(MESSAGE_TYPE.TEXT);

    expect(ids.has("figure.pos.left")).toBe(true);
    expect(ids.has("figure.anim.ba-enter-from-left")).toBe(true);
    expect(ids.has("figure.anim.ba-shake")).toBe(true);
    expect(ids.has("figure.anim.ba-exit-to-right")).toBe(true);
    expect(ids.has("scene.textbox.hide")).toBe(true);
    expect(ids.has("scene.film.on")).toBe(true);
    expect(ids.has("background.anim.exit-to-right")).toBe(true);
    expect(ids.has("background.speed.fast")).toBe(true);
    expect(ids.has("background.anim.enter-from-left")).toBe(false);
    expect(ids.has("sys:bgm")).toBe(false);
    expect(ids.has("sys:bg")).toBe(false);
    expect(ids.has("video.skipoff")).toBe(false);
  });

  it("黑屏文字暂不展示场景控制和背景动画入口", () => {
    const ids = idsFor(MESSAGE_TYPE.INTRO_TEXT);

    expect(ids.has("scene.textbox.hide")).toBe(false);
    expect(ids.has("scene.film.on")).toBe(false);
    expect(ids.has("background.anim.exit-to-right")).toBe(false);
    expect(ids.has("background.speed.fast")).toBe(false);
  });

  it("立绘动画按进场、动作、出场分组", () => {
    const grouped = getAnnotationsByCategory(getAnnotationCatalog());

    expect(grouped.get("进场动画")?.map(item => item.id)).toEqual([
      "figure.anim.enter",
      "figure.anim.ba-enter-from-left",
      "figure.anim.ba-enter-from-right",
    ]);
    expect(grouped.get("动作")?.map(item => item.id)).toContain("figure.anim.ba-shake");
    expect(grouped.get("出场动画")?.map(item => item.id)).toEqual([
      "figure.anim.exit",
      "figure.anim.ba-exit-to-left",
      "figure.anim.ba-exit-to-right",
    ]);
  });

  it("未知消息类型上下文保持全量展示", () => {
    expect(idsFor(undefined).size).toBe(getAnnotationCatalog().length);
    expect(idsFor(null).size).toBe(getAnnotationCatalog().length);
  });
});
