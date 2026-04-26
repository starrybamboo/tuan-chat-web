import { describe, expect, it } from "vitest";

import { buildRoleStateEventScope, collectStateEventScopeLabels, formatStateEventAtomDetail, formatStateScopeLabel } from "./stateEvent";

describe("stateEvent display helpers", () => {
  it("scope label 在提供角色名映射时优先显示角色名", () => {
    expect(formatStateScopeLabel(buildRoleStateEventScope(10025), {
      roleNameById: {
        10025: "阿尔法",
      },
    })).toBe("阿尔法");
  });

  it("scope labels 会忽略 nextTurn 并按出现顺序去重", () => {
    expect(collectStateEventScopeLabels([
      {
        type: "nextTurn",
      },
      {
        type: "varOp",
        scope: buildRoleStateEventScope(3),
        key: "hp",
        op: "sub",
        value: 2,
      },
      {
        type: "statusRemove",
        scope: buildRoleStateEventScope(3),
        statusName: "中毒",
      },
    ], {
      roleNameById: {
        3: "德州",
      },
    })).toEqual(["德州"]);
  });

  it("状态详情格式化会复用角色名映射", () => {
    expect(formatStateEventAtomDetail({
      type: "varOp",
      scope: buildRoleStateEventScope(8),
      key: "hp",
      op: "sub",
      value: 2,
    }, {
      roleNameById: {
        8: "博士",
      },
    })).toBe("博士 · HP - 2");
  });
});
