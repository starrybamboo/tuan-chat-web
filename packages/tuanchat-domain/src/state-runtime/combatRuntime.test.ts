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

function createUiStateMessage(
  messageId: number,
  events: Parameters<typeof buildCommandStateEventExtra>[1],
): Pick<Message, "messageId" | "messageType" | "content" | "status" | "extra"> {
  return {
    messageId,
    messageType: MESSAGE_TYPE.STATE_EVENT,
    content: "战斗开始：全员先攻",
    status: 0,
    extra: {
      stateEvent: {
        source: {
          kind: "ui",
          parserVersion: "state-event-v1",
        },
        events,
      },
    },
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
  it("为 UI 全员先攻聚合消息生成人数摘要", () => {
    const runtime = buildCombatStateRuntime({
      messages: [
        createUiStateMessage(1, [
          {
            type: "combatParticipantUpsert",
            participantId: "role:1",
            roleId: 1,
            name: "艾拉",
            initiative: 16,
          },
          {
            type: "combatParticipantUpsert",
            participantId: "role:2",
            roleId: 2,
            name: "博恩",
            initiative: 12,
          },
          {
            type: "combatOrderSet",
            participantIds: ["role:1", "role:2"],
          },
        ]),
      ],
    });

    expect(runtime.messageSummariesByMessageId[1]?.primaryText).toBe("全员先攻 2 人");
    expect(runtime.participants.map(participant => participant.participantId)).toEqual(["role:1", "role:2"]);
  });

  it("combatRoundEnd 会清空参与者并将回合归零", () => {
    const runtime = buildCombatStateRuntime({
      messages: [
        createUiStateMessage(1, [
          {
            type: "combatParticipantUpsert",
            participantId: "role:1",
            roleId: 1,
            name: "艾拉",
            initiative: 16,
          },
          {
            type: "combatParticipantUpsert",
            participantId: "role:2",
            roleId: 2,
            name: "博恩",
            initiative: 12,
          },
          {
            type: "combatOrderSet",
            participantIds: ["role:1", "role:2"],
          },
          {
            type: "combatActiveParticipantSet",
            participantId: "role:1",
          },
        ]),
        createStateMessage(2, [
          {
            type: "nextTurn",
          },
        ]),
        createStateMessage(3, [
          {
            type: "combatRoundEnd",
          },
        ], {
          content: "战斗结束：清空先攻",
          extra: {
            stateEvent: {
              source: {
                kind: "ui",
                parserVersion: "state-event-v1",
              },
              events: [
                {
                  type: "combatRoundEnd",
                },
              ],
            },
          },
        }),
      ],
    });

    expect(runtime.turn).toBe(0);
    expect(runtime.participants).toEqual([]);
    expect(runtime.activeParticipantId).toBeNull();
    expect(runtime.messageSummariesByMessageId[3]?.primaryText).toBe("战斗结束");
    expect(runtime.messageSummariesByMessageId[3]?.detailLines).toContain("结束战斗 · 回合 1 -> 0");
  });

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
