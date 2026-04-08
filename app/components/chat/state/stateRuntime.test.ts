import type { Message, RoleAbility } from "../../../../api";

import { describe, expect, it } from "vitest";
import { createStateDefinition, MemoryStateDefinitionResolver } from "./stateDefinitionResolver";
import { buildStateRuntime } from "./stateRuntime";
import { buildCommandStateEventExtra, buildRoleStateEventScope, STATE_EVENT_STATUS_MODIFIER_OP, STATE_EVENT_VAR_OP } from "@/types/stateEvent";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

function createStateMessage(messageId: number, extra: ReturnType<typeof buildCommandStateEventExtra>): Pick<Message, "messageId" | "messageType" | "content" | "status" | "extra"> {
  return {
    messageId,
    messageType: MESSAGE_TYPE.STATE_EVENT,
    content: ".state",
    status: 0,
    extra: {
      stateEvent: extra,
    },
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
