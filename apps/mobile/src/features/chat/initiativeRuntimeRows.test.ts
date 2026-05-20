import { MESSAGE_TYPE } from "@tuanchat/domain/message-type";
import { describe, expect, it } from "vitest";

import type { Message } from "@tuanchat/openapi-client/models/Message";
import type { RoleAbility } from "@tuanchat/openapi-client/models/RoleAbility";

import {
  buildCommandStateEventExtra,
  buildRoleStateEventScope,
  STATE_EVENT_STATUS_MODIFIER_OP,
  STATE_EVENT_VAR_OP,
} from "@tuanchat/domain/state-event";
import { buildCombatStateRuntime, createStateDefinition, MemoryStateDefinitionResolver } from "@tuanchat/domain/state-runtime";

import { buildMobileInitiativeRows } from "./initiativeRuntimeRows";

function createStateMessage(
  messageId: number,
  events: Parameters<typeof buildCommandStateEventExtra>[1],
  extraPatch: Record<string, unknown> = {},
): Message {
  return {
    content: ".combat",
    extra: {
      ...extraPatch,
      stateEvent: buildCommandStateEventExtra("combat", events),
    },
    messageId,
    messageType: MESSAGE_TYPE.STATE_EVENT,
    position: messageId,
    roomId: 1,
    status: 0,
    syncId: messageId,
    userId: 1,
  } as Message;
}

function createRoleAbility(overrides?: Partial<RoleAbility>): RoleAbility {
  return {
    ability: {},
    basic: {},
    roleId: 7,
    ruleId: 7,
    skill: {},
    ...overrides,
  };
}

describe("buildMobileInitiativeRows", () => {
  it("只展示 combat runtime 参与者，不从旧先攻 extra 派生行", () => {
    const runtime = buildCombatStateRuntime({
      messages: [
        createStateMessage(1, [{
          initiative: 12,
          name: "新参与者",
          participantId: "manual:new",
          type: "combatParticipantUpsert",
          values: { hp: "8", maxHp: 10 },
        }], {
          "initiativeList": [{ name: "旧参与者", value: 99 }],
          "initiativeList-rule-7": [{ name: "旧规则7参与者", value: 88 }],
          "initiativeParams": [{ key: "old", label: "旧列" }],
        }),
      ],
    });

    expect(buildMobileInitiativeRows(runtime.participants)).toMatchObject([
      {
        hp: 8,
        initiative: 12,
        maxHp: 10,
        name: "新参与者",
        participantId: "manual:new",
      },
    ]);
  });

  it("ruleId 7 也只按通用状态变量和状态效果生成移动端行", () => {
    const resolver = new MemoryStateDefinitionResolver([
      createStateDefinition({
        durationTurns: 2,
        modifiers: [{
          key: "hp",
          op: STATE_EVENT_STATUS_MODIFIER_OP.SUB,
          value: 3,
        }],
        name: "燃烧",
        statusId: "burn-v1",
      }),
    ]);
    const runtime = buildCombatStateRuntime({
      fallbackRoleAbilitiesByRoleId: {
        7: createRoleAbility({ ability: { hp: "20", maxHp: "20" } }),
      },
      messages: [
        createStateMessage(1, [
          {
            initiative: 16,
            name: "皮卡",
            participantId: "role:7",
            roleId: 7,
            type: "combatParticipantUpsert",
          },
          {
            key: "hp",
            op: STATE_EVENT_VAR_OP.SUB,
            scope: buildRoleStateEventScope(7),
            type: "varOp",
            value: 2,
          },
          {
            scope: buildRoleStateEventScope(7),
            statusId: "burn-v1",
            type: "statusApply",
          },
        ]),
      ],
      resolver,
    });

    const rows = buildMobileInitiativeRows(runtime.participants);

    expect(rows[0]).toMatchObject({
      hp: 15,
      initiative: 16,
      maxHp: 20,
      name: "皮卡",
      participantId: "role:7",
    });
    expect(rows[0]?.activeStates.map(state => state.statusName)).toEqual(["燃烧"]);
  });
});
