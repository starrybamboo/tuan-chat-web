import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { buildRoleStateEventScope } from "@/types/stateEvent";

import StateMessageCard, { buildStateRoleLabelReplacements } from "./stateMessageCard";

describe("stateMessageCard display helpers", () => {
  it("地图 token 文案优先替换完整的地图角色标签，避免显示裸 roleId", () => {
    const replacements = buildStateRoleLabelReplacements([
      {
        type: "mapTokenUpsert",
        roleId: 14244,
        rowIndex: 5,
        colIndex: 3,
      },
      {
        type: "varOp",
        scope: buildRoleStateEventScope(14244),
        key: "hp",
        op: "sub",
        value: 1,
      },
    ], {
      14244: "降星驰",
    });

    const displayText = replacements.reduce(
      (text, pair) => text.replaceAll(pair.rawLabel, pair.displayLabel),
      "地图角色 #14244 移动到 第 6 行 · 第 4 列",
    );

    expect(displayText).toBe("降星驰 移动到 第 6 行 · 第 4 列");
  });

  it("状态消息正文具备编辑入口时复用消息正文编辑样式", () => {
    const html = renderToStaticMarkup(createElement(StateMessageCard, {
      message: {
        messageId: 1,
        content: "状态更新：HP -2",
        extra: {},
      },
      canEditContent: true,
      onContentCommit: () => {},
    }));

    expect(html).toContain("editable-field");
    expect(html).toContain("cursor-text");
    expect(html).toContain("状态更新：HP -2");
  });
});
