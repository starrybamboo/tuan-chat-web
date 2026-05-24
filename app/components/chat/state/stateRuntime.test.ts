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
  it("在房间内尚未物化变量时，相对 varOp 会基于 role_ability 兜底", () => {
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

    expect(runtime.roleVarsByRoleId[3]).toEqual({ hp: 98 });
    expect(runtime.derivedDisplayValues.rolesByRoleId[3]).toEqual({ hp: 98 });
    expect(runtime.messageSummariesByMessageId[1]?.primaryText).toBe("HP 100 -> 98");
  });

  it("删除最早的物化消息后，后续相对 varOp 会重新基于 fallback 计算", () => {
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

    const fallbackAbility = {
      3: createRoleAbility({ ability: { hp: "100" } }),
    };

    const fullRuntime = buildStateRuntime({
      messages,
      fallbackRoleAbilitiesByRoleId: fallbackAbility,
    });
    const recomputedRuntime = buildStateRuntime({
      messages: [messages[1]],
      fallbackRoleAbilitiesByRoleId: fallbackAbility,
    });

    expect(fullRuntime.roleVarsByRoleId[3]?.hp).toBe(96);
    expect(recomputedRuntime.roleVarsByRoleId[3]?.hp).toBe(98);
    expect(recomputedRuntime.messageSummariesByMessageId[2]?.primaryText).toBe("HP 100 -> 98");
  });

  it("一旦更早消息用绝对值物化变量，后续 role_ability 变更不会影响该房间变量", () => {
    const messages = [
      createStateMessage(1, buildCommandStateEventExtra("st", [{
        type: "varOp",
        scope: buildRoleStateEventScope(3),
        key: "hp",
        op: STATE_EVENT_VAR_OP.SET,
        value: 120,
      }])),
      createStateMessage(2, buildCommandStateEventExtra("st", [{
        type: "varOp",
        scope: buildRoleStateEventScope(3),
        key: "hp",
        op: STATE_EVENT_VAR_OP.SUB,
        value: 2,
      }])),
    ];

    const runtimeFrom100 = buildStateRuntime({
      messages,
      fallbackRoleAbilitiesByRoleId: {
        3: createRoleAbility({ ability: { hp: "100" } }),
      },
    });
    const runtimeFrom200 = buildStateRuntime({
      messages,
      fallbackRoleAbilitiesByRoleId: {
        3: createRoleAbility({ ability: { hp: "200" } }),
      },
    });

    expect(runtimeFrom100.roleVarsByRoleId[3]?.hp).toBe(118);
    expect(runtimeFrom200.roleVarsByRoleId[3]?.hp).toBe(118);
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
        createStateMessage(2, buildCommandStateEventExtra("next", [{ type: "nextTurn" }])),
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
    expect(afterNextTurn.messageSummariesByMessageId[2]?.primaryText).toBe("回合 0 -> 1");
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
    expect(runtime.roleVarsByRoleId[3]?.initiative).toBe(13);
  });

  it("ruleId 7 走通用 combat runtime，状态和角色变量同源显示", () => {
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
        3: createRoleAbility({ ability: { hp: "20", maxHp: "20" } }),
      },
      resolver,
    });

    expect(runtime.roleVarsByRoleId[3]).toMatchObject({ hp: 18, initiative: 16 });
    expect(runtime.baseDisplayValues.rolesByRoleId[3]).toMatchObject({ hp: 18, initiative: 16, maxHp: 20 });
    expect(runtime.derivedDisplayValues.rolesByRoleId[3]).toMatchObject({ hp: 15, initiative: 16, maxHp: 20 });
    expect(runtime.activeStates.map(state => state.statusName)).toEqual(["燃烧"]);
  });
});
