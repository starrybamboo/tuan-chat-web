import { describe, expect, it } from "vitest";

import { buildCommandStateEventExtra, buildRoleStateEventScope, STATE_EVENT_STATUS_MODIFIER_OP, STATE_EVENT_VAR_OP, toApiMessageExtraWithStateEvent } from "@/types/stateEvent";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import type { Message, RoleAbility } from "../../../../api";

import { createStateDefinition, MemoryStateDefinitionResolver } from "./stateDefinitionResolver";
import { buildCombatStateRuntime, buildStateRuntime } from "./stateRuntime";

function createStateMessage(messageId: number, extra: ReturnType<typeof buildCommandStateEventExtra>): Pick<Message, "messageId" | "messageType" | "content" | "status" | "extra"> {
  return {
    messageId,
    messageType: MESSAGE_TYPE.STATE_EVENT,
    content: ".state",
    status: 0,
    extra: toApiMessageExtraWithStateEvent(extra),
  };
}

function createCombatMessage(
  messageId: number,
  events: Parameters<typeof buildCommandStateEventExtra>[1],
  extraPatch: Record<string, unknown> = {},
): Pick<Message, "messageId" | "messageType" | "content" | "status" | "extra"> {
  return {
    messageId,
    messageType: MESSAGE_TYPE.STATE_EVENT,
    content: ".combat",
    status: 0,
    extra: {
      ...extraPatch,
      ...toApiMessageExtraWithStateEvent(buildCommandStateEventExtra("combat", events)),
    } as Message["extra"] & Record<string, unknown>,
  };
}

function createRoleAbility(overrides?: Partial<RoleAbility>): RoleAbility {
  return {
    roleId: 3,
    ruleId: 7,
    basic: {},
    ability: {},
    skill: {},
    ...overrides,
  };
}

describe("buildStateRuntime", () => {
  it("role varOp 只作为记录摘要，但会按角色卡最终值倒推显示前后值", () => {
    const runtime = buildStateRuntime({
      messages: [
        createStateMessage(1, buildCommandStateEventExtra("st", [{
          type: "varOp",
          scope: buildRoleStateEventScope(3),
          key: "hp",
          op: STATE_EVENT_VAR_OP.SUB,
          value: 2,
        }])),
      ],
      fallbackRoleAbilitiesByRoleId: {
        3: createRoleAbility({ ability: { hp: "100" } }),
      },
    });

    expect(runtime.roleVarsByRoleId[3]).toBeUndefined();
    expect(runtime.recordedRoleValueKeysByRoleId[3]).toEqual(["hp"]);
    expect(runtime.derivedDisplayValues.rolesByRoleId[3]).toEqual({ hp: 100 });
    expect(runtime.messageSummariesByMessageId[1]?.primaryText).toBe("HP 102 -> 100");
    expect(runtime.messageSummariesByMessageId[1]?.detailLines).toEqual(["角色 #3 · HP 102 -> 100"]);
  });

  it("多条 role varOp 会逐条倒推摘要前后值，不会演算为房间内角色变量", () => {
    const messages = [
      createStateMessage(1, buildCommandStateEventExtra("st", [{
        type: "varOp",
        scope: buildRoleStateEventScope(3),
        key: "hp",
        op: STATE_EVENT_VAR_OP.SUB,
        value: 2,
      }])),
      createStateMessage(2, buildCommandStateEventExtra("st", [{
        type: "varOp",
        scope: buildRoleStateEventScope(3),
        key: "hp",
        op: STATE_EVENT_VAR_OP.SUB,
        value: 2,
      }])),
    ];

    const runtime = buildStateRuntime({
      messages,
      fallbackRoleAbilitiesByRoleId: {
        3: createRoleAbility({ ability: { hp: "100" } }),
      },
    });

    expect(runtime.roleVarsByRoleId[3]).toBeUndefined();
    expect(runtime.recordedRoleValueKeysByRoleId[3]).toEqual(["hp"]);
    expect(runtime.derivedDisplayValues.rolesByRoleId[3]?.hp).toBe(100);
    expect(runtime.messageSummariesByMessageId[1]?.primaryText).toBe("HP 104 -> 102");
    expect(runtime.messageSummariesByMessageId[2]?.primaryText).toBe("HP 102 -> 100");
  });

  it("旧的 role set 记录摘要展示赋值前后值", () => {
    const messages = [
      createStateMessage(1, buildCommandStateEventExtra("st", [{
        type: "varOp",
        scope: buildRoleStateEventScope(3),
        key: "hp",
        op: STATE_EVENT_VAR_OP.SET,
        value: 20,
      }])),
      createStateMessage(2, buildCommandStateEventExtra("st", [{
        type: "varOp",
        scope: buildRoleStateEventScope(3),
        key: "hp",
        op: STATE_EVENT_VAR_OP.SET,
        value: 50,
      }])),
    ];

    const runtime = buildStateRuntime({
      messages,
      fallbackRoleAbilitiesByRoleId: {
        3: createRoleAbility({ ability: { hp: "50" } }),
      },
    });

    expect(runtime.roleVarsByRoleId[3]).toBeUndefined();
    expect(runtime.recordedRoleValueKeysByRoleId[3]).toEqual(["hp"]);
    expect(runtime.derivedDisplayValues.rolesByRoleId[3]?.hp).toBe(50);
    expect(runtime.messageSummariesByMessageId[1]?.primaryText).toBe("HP 0 -> 20");
    expect(runtime.messageSummariesByMessageId[2]?.primaryText).toBe("HP 20 -> 50");
  });

  it("带快照的 role varOp 摘要展示事件前后值", () => {
    const runtime = buildStateRuntime({
      messages: [
        createStateMessage(1, buildCommandStateEventExtra("st", [{
          type: "varOp",
          scope: buildRoleStateEventScope(3),
          key: "hp",
          op: STATE_EVENT_VAR_OP.SUB,
          value: 3,
          beforeValue: 10,
          afterValue: 7,
        }])),
      ],
      fallbackRoleAbilitiesByRoleId: {
        3: createRoleAbility({ ability: { hp: "7" } }),
      },
    });

    expect(runtime.messageSummariesByMessageId[1]?.primaryText).toBe("HP 10 -> 7");
    expect(runtime.messageSummariesByMessageId[1]?.detailLines).toEqual(["角色 #3 · HP 10 -> 7"]);
  });

  it("仅存在 fallback role_ability 的角色也会出现在显示值中", () => {
    const runtime = buildStateRuntime({
      messages: [],
      fallbackRoleAbilitiesByRoleId: {
        3: createRoleAbility({ ability: { hp: "100", mp: "12" } }),
        8: {
          ...createRoleAbility({ roleId: 8 }),
          ability: { hp: "88" },
        },
      },
    });

    expect(runtime.baseDisplayValues.rolesByRoleId[3]).toEqual({ hp: 100, mp: 12 });
    expect(runtime.derivedDisplayValues.rolesByRoleId[3]).toEqual({ hp: 100, mp: 12 });
    expect(runtime.baseDisplayValues.rolesByRoleId[8]).toEqual({ hp: 88 });
  });

  it("nextTurn 会推进回合并衰减状态", () => {
    const resolver = new MemoryStateDefinitionResolver([
      createStateDefinition({
        statusId: "poison-v1",
        name: "中毒",
        durationTurns: 1,
        modifiers: [{
          key: "hp",
          op: STATE_EVENT_STATUS_MODIFIER_OP.SUB,
          value: 5,
        }],
      }),
    ]);

    const beforeNextTurn = buildStateRuntime({
      messages: [
        createStateMessage(1, buildCommandStateEventExtra("buff", [{
          type: "statusApply",
          scope: buildRoleStateEventScope(3),
          statusId: "poison-v1",
        }])),
      ],
      fallbackRoleAbilitiesByRoleId: {
        3: createRoleAbility({ ability: { hp: "100" } }),
      },
      resolver,
    });

    const afterNextTurn = buildStateRuntime({
      messages: [
        createStateMessage(1, buildCommandStateEventExtra("buff", [{
          type: "statusApply",
          scope: buildRoleStateEventScope(3),
          statusId: "poison-v1",
        }])),
        createStateMessage(2, buildCommandStateEventExtra("combat", [{ type: "combatRoundStart" }])),
        createStateMessage(3, buildCommandStateEventExtra("next", [{ type: "nextTurn" }])),
      ],
      fallbackRoleAbilitiesByRoleId: {
        3: createRoleAbility({ ability: { hp: "100" } }),
      },
      resolver,
    });

    expect(beforeNextTurn.derivedDisplayValues.rolesByRoleId[3]?.hp).toBe(95);
    expect(afterNextTurn.turn).toBe(1);
    expect(afterNextTurn.activeStates).toEqual([]);
    expect(afterNextTurn.derivedDisplayValues.rolesByRoleId[3]?.hp).toBe(100);
    expect(afterNextTurn.messageSummariesByMessageId[3]?.primaryText).toBe("回合 0 -> 1");
  });

  it("nextTurn 在战斗开始前不会推进回合", () => {
    const runtime = buildStateRuntime({
      messages: [
        createStateMessage(1, buildCommandStateEventExtra("next", [{ type: "nextTurn" }])),
      ],
    });

    expect(runtime.turn).toBe(0);
    expect(runtime.combatRoundActive).toBe(false);
    expect(runtime.messageSummariesByMessageId[1]?.primaryText).toBe("未开始战斗");
    expect(runtime.messageSummariesByMessageId[1]?.detailLines).toContain("未开始战斗，忽略下一回合");
  });

  it("combatRoundStart / combatRoundEnd 会切换战斗轮状态", () => {
    const runtime = buildStateRuntime({
      messages: [
        createStateMessage(1, buildCommandStateEventExtra("combat", [{ type: "combatRoundStart" }])),
        createStateMessage(2, buildCommandStateEventExtra("combat", [{ type: "combatRoundEnd" }])),
      ],
    });

    expect(runtime.combatRoundActive).toBe(false);
    expect(runtime.turn).toBe(0);
    expect(runtime.messageSummariesByMessageId[1]?.primaryText).toBe("进入战斗轮");
    expect(runtime.messageSummariesByMessageId[2]?.primaryText).toBe("结束战斗");
  });
});
describe("buildCombatStateRuntime", () => {
  it("web wrapper 忽略旧先攻 extra，参与者不再由 state event 派生", () => {
    const runtime = buildCombatStateRuntime({
      messages: [
        createCombatMessage(10, [{
          type: "varOp",
          scope: buildRoleStateEventScope(3),
          key: "initiative",
          op: STATE_EVENT_VAR_OP.SET,
          value: 13,
        }], {
          "initiativeList": [{ name: "旧参与者", value: 99 }],
          "initiativeList-rule-7": [{ name: "旧规则7参与者", value: 88 }],
          "initiativeParams": [{ key: "old", label: "旧列" }],
          "initiativeParams-rule-7": [{ key: "rule7Old", label: "旧规则7列" }],
        }),
      ],
    });

    expect(runtime.participants).toEqual([]);
    expect(runtime.roleVarsByRoleId[3]).toBeUndefined();
  });

  it("ruleId 7 走通用 combat runtime，状态效果作用于角色卡基础值", () => {
    const resolver = new MemoryStateDefinitionResolver([
      createStateDefinition({
        statusId: "burn-v1",
        name: "燃烧",
        durationTurns: 2,
        modifiers: [{
          key: "hp",
          op: STATE_EVENT_STATUS_MODIFIER_OP.SUB,
          value: 3,
        }],
      }),
    ]);

    const runtime = buildCombatStateRuntime({
      messages: [
        createCombatMessage(11, [
          {
            type: "varOp",
            scope: buildRoleStateEventScope(3),
            key: "initiative",
            op: STATE_EVENT_VAR_OP.SET,
            value: 16,
          },
          {
            type: "varOp",
            scope: buildRoleStateEventScope(3),
            key: "hp",
            op: STATE_EVENT_VAR_OP.SUB,
            value: 2,
          },
          {
            type: "statusApply",
            scope: buildRoleStateEventScope(3),
            statusId: "burn-v1",
          },
        ]),
      ],
      fallbackRoleAbilitiesByRoleId: {
        3: createRoleAbility({ ability: { hp: "18", maxHp: "20" }, skill: { initiative: "16" } }),
      },
      resolver,
    });

    expect(runtime.roleVarsByRoleId[3]).toBeUndefined();
    expect(runtime.baseDisplayValues.rolesByRoleId[3]).toMatchObject({ hp: 18, initiative: 16, maxHp: 20 });
    expect(runtime.derivedDisplayValues.rolesByRoleId[3]).toMatchObject({ hp: 15, initiative: 16, maxHp: 20 });
    expect(runtime.activeStates.map(state => state.statusName)).toEqual(["燃烧"]);
  });
});
