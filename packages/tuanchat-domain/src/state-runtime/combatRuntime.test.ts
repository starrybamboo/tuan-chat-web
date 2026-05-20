import { describe, expect, it } from "vitest";

import type { Message } from "@tuanchat/openapi-client/models/Message";
import type { RoleAbility } from "@tuanchat/openapi-client/models/RoleAbility";

import { MESSAGE_TYPE } from "../messageType";
import {
  buildCommandStateEventExtra,
  buildRoleStateEventScope,
  STATE_EVENT_COMBAT_COLUMN_SOURCE,
  STATE_EVENT_STATUS_MODIFIER_OP,
  STATE_EVENT_VAR_OP,
} from "../state-event";
import { buildCombatStateRuntime, createStateDefinition, MemoryStateDefinitionResolver } from "./runtime";

function createStateMessage(
  messageId: number,
  events: Parameters<typeof buildCommandStateEventExtra>[1],
  overrides: Partial<Pick<Message, "messageType" | "status" | "extra">> = {},
): Pick<Message, "messageId" | "messageType" | "content" | "status" | "extra"> {
  return {
    messageId,
    messageType: MESSAGE_TYPE.STATE_EVENT,
    content: ".combat",
    status: 0,
    extra: {
      stateEvent: buildCommandStateEventExtra("combat", events),
    },
    ...overrides,
  };
}

function createRoleAbility(overrides?: Partial<RoleAbility>): RoleAbility {
  return {
    roleId: 1,
    ruleId: 1,
    basic: {},
    ability: {},
    skill: {},
    ...overrides,
  };
}

describe("buildCombatStateRuntime", () => {
  it("按消息顺序回放参与者、顺序、当前行动者和自定义列", () => {
    const runtime = buildCombatStateRuntime({
      messages: [
        createStateMessage(1, [
          {
            type: "combatParticipantUpsert",
            participantId: "manual:a",
            name: "A",
            initiative: 10,
          },
          {
            type: "combatParticipantUpsert",
            participantId: "manual:b",
            name: "B",
            initiative: 20,
          },
        ]),
        createStateMessage(2, [
          {
            type: "combatOrderSet",
            participantIds: ["manual:a", "manual:b"],
          },
          {
            type: "combatActiveParticipantSet",
            participantId: "manual:b",
          },
          {
            type: "combatColumnUpsert",
            key: "stance",
            label: "姿态",
            source: STATE_EVENT_COMBAT_COLUMN_SOURCE.MANUAL,
          },
        ]),
      ],
    });

    expect(runtime.participants.map(participant => participant.participantId)).toEqual(["manual:a", "manual:b"]);
    expect(runtime.activeParticipantId).toBe("manual:b");
    expect(runtime.columns).toEqual([{ key: "stance", label: "姿态", source: "manual" }]);
  });

  it("按消息顺序回放地图 token 位移和移除", () => {
    const runtime = buildCombatStateRuntime({
      messages: [
        createStateMessage(1, [
          {
            type: "combatMapTokenUpsert",
            roleId: 3,
            rowIndex: 1,
            colIndex: 2,
          },
        ]),
        createStateMessage(2, [
          {
            type: "combatMapTokenUpsert",
            roleId: 3,
            rowIndex: 4,
            colIndex: 5,
          },
          {
            type: "combatMapTokenRemove",
            roleId: 9,
          },
        ]),
      ],
    });

    expect(runtime.hasMapState).toBe(true);
    expect(runtime.mapTokens).toEqual([{ roleId: 3, rowIndex: 4, colIndex: 5 }]);
    expect(runtime.mapTokensByRoleId[3]).toEqual({ roleId: 3, rowIndex: 4, colIndex: 5 });
  });

  it("忽略删除消息，并允许重复显示名通过 participantId 区分", () => {
    const runtime = buildCombatStateRuntime({
      messages: [
        createStateMessage(1, [
          {
            type: "combatParticipantUpsert",
            participantId: "role:1",
            name: "影",
            initiative: 12,
          },
        ], { status: 1 }),
        createStateMessage(2, [
          {
            type: "combatParticipantUpsert",
            participantId: "role:2",
            name: "影",
            initiative: 11,
          },
          {
            type: "combatParticipantUpsert",
            participantId: "manual:shadow",
            name: "影",
            initiative: 9,
          },
        ]),
      ],
    });

    expect(runtime.participants.map(participant => participant.participantId)).toEqual(["role:2", "manual:shadow"]);
    expect(runtime.participants.map(participant => participant.name)).toEqual(["影", "影"]);
  });

  it("把 role-bound participant 和状态变量合成同一视图", () => {
    const resolver = new MemoryStateDefinitionResolver([
      createStateDefinition({
        statusId: "bless-v1",
        name: "祝福",
        durationTurns: 2,
        modifiers: [{
          key: "hp",
          op: STATE_EVENT_STATUS_MODIFIER_OP.ADD,
          value: 5,
        }],
      }),
    ]);

    const runtime = buildCombatStateRuntime({
      messages: [
        createStateMessage(1, [
          {
            type: "combatParticipantUpsert",
            participantId: "role:3",
            roleId: 3,
            name: "牧师",
            initiative: 14,
            values: { note: "front" },
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
            statusId: "bless-v1",
          },
        ]),
      ],
      fallbackRoleAbilitiesByRoleId: {
        3: createRoleAbility({ ability: { hp: "30" } }),
      },
      resolver,
    });

    expect(runtime.participants[0]).toMatchObject({
      participantId: "role:3",
      roleId: 3,
      name: "牧师",
      initiative: 14,
      values: { note: "front" },
      baseValues: { hp: 28 },
      derivedValues: { hp: 33 },
    });
    expect(runtime.participants[0]?.activeStates.map(state => state.statusName)).toEqual(["祝福"]);
    expect(runtime.roleVarsByRoleId[3]).toEqual({ hp: 28 });
  });

  it("没有 combat event 时不从旧 initiative extra 派生参与者", () => {
    const runtime = buildCombatStateRuntime({
      messages: [],
    });

    expect(runtime.participants).toEqual([]);
  });

  it("旧 extra 与新 combat event 共存时只读取事件流", () => {
    const runtime = buildCombatStateRuntime({
      messages: [
        createStateMessage(1, [
          {
            type: "combatParticipantUpsert",
            participantId: "manual:new",
            name: "新参与者",
            initiative: 7,
          },
        ], {
          extra: {
            "initiativeList": [{ name: "旧参与者", value: 99 }],
            "initiativeList-rule-7": [{ name: "旧规则7参与者", value: 88 }],
            "stateEvent": buildCommandStateEventExtra("combat", [
              {
                type: "combatParticipantUpsert",
                participantId: "manual:new",
                name: "新参与者",
                initiative: 7,
              },
            ]),
          } as Message["extra"] & Record<string, unknown>,
        }),
      ],
    });

    expect(runtime.participants.map(participant => participant.name)).toEqual(["新参与者"]);
  });
});
