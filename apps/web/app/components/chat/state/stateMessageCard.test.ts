import { describe, expect, it } from "vitest";

import { buildRoleStateEventScope } from "@/types/stateEvent";

import { buildStateRoleLabelReplacements } from "./stateMessageCard";

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
});
