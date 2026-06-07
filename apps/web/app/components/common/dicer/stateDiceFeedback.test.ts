import { describe, expect, it } from "vitest";

import { buildRoleStateEventScope, STATE_EVENT_VAR_OP } from "@/types/stateEvent";

import { buildRoleScopedStateDiceReply } from "./stateDiceFeedback";

describe("stateDiceFeedback", () => {
  it("只为角色级状态事件生成骰娘反馈文本", () => {
    expect(buildRoleScopedStateDiceReply([
      {
        type: "varOp",
        scope: buildRoleStateEventScope(3),
        key: "hp",
        op: STATE_EVENT_VAR_OP.SUB,
        value: 2,
        beforeValue: 10,
        afterValue: 8,
      },
      {
        type: "varOp",
        scope: { kind: "room" },
        key: "回合",
        op: STATE_EVENT_VAR_OP.SET,
        value: 2,
      },
    ])).toBe("状态已更新：角色 #3 · HP 10 -> 8");
  });

  it("房间级状态事件不生成骰娘反馈", () => {
    expect(buildRoleScopedStateDiceReply([
      {
        type: "nextTurn",
      },
      {
        type: "varOp",
        scope: { kind: "room" },
        key: "回合",
        op: STATE_EVENT_VAR_OP.SET,
        value: 2,
      },
    ])).toBeNull();
  });
});
