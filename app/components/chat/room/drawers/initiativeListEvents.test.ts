import { describe, expect, it } from "vitest";

import { buildRoleStateEventScope, STATE_EVENT_VAR_OP } from "@/types/stateEvent";

import type { Initiative, InitiativeParam } from "./initiativeListTypes";

import {
  buildImportRoleInitiativeEvents,
  buildRemoveInitiativeEvents,
  buildUpdateInitiativeEvents,
  buildUpdateInitiativeExtraEvents,
} from "./initiativeListEvents";

const currentList: Initiative[] = [
  {
    participantId: "manual:npc-a",
    name: "NPC甲",
    value: 11,
    hp: 7,
    maxHp: 7,
  },
  {
    participantId: "role:3",
    roleId: 3,
    name: "旧角色名",
    value: 8,
    hp: 10,
    maxHp: 12,
  },
];

describe("initiativeListEvents", () => {
  it("导入角色时生成参与者、角色 HP 变量和确定性排序事件", () => {
    const events = buildImportRoleInitiativeEvents({
      currentList,
      hp: 21,
      initiative: 18,
      maxHp: 30,
      name: "艾拉",
      roleId: 3,
    });

    expect(events).toEqual([
      {
        type: "combatParticipantUpsert",
        participantId: "role:3",
        roleId: 3,
        name: "艾拉",
        initiative: 18,
      },
      {
        type: "varOp",
        scope: buildRoleStateEventScope(3),
        key: "hp",
        op: STATE_EVENT_VAR_OP.SET,
        value: 21,
      },
      {
        type: "varOp",
        scope: buildRoleStateEventScope(3),
        key: "maxHp",
        op: STATE_EVENT_VAR_OP.SET,
        value: 30,
      },
      {
        type: "combatOrderSet",
        participantIds: ["role:3", "manual:npc-a"],
      },
    ]);
  });

  it("删除参与者时移除参与者并重建剩余顺序", () => {
    expect(buildRemoveInitiativeEvents(currentList, currentList[0])).toEqual([
      {
        type: "combatParticipantRemove",
        participantId: "manual:npc-a",
      },
      {
        type: "combatOrderSet",
        participantIds: ["role:3"],
      },
    ]);
  });

  it("编辑手动参与者 HP 时写入 participant values", () => {
    expect(buildUpdateInitiativeEvents(currentList, currentList[0], { hp: 4 })).toEqual([
      {
        type: "combatParticipantUpsert",
        participantId: "manual:npc-a",
        values: {
          hp: 4,
        },
      },
    ]);
  });

  it("编辑角色绑定参与者 HP 时写入角色变量", () => {
    expect(buildUpdateInitiativeEvents(currentList, currentList[1], { hp: 9 })).toEqual([
      {
        type: "varOp",
        scope: buildRoleStateEventScope(3),
        key: "hp",
        op: STATE_EVENT_VAR_OP.SET,
        value: 9,
      },
    ]);
  });

  it("编辑先攻值时更新参与者并追加确定性排序事件", () => {
    expect(buildUpdateInitiativeEvents(currentList, currentList[0], { value: 20 })).toEqual([
      {
        type: "combatParticipantUpsert",
        participantId: "manual:npc-a",
        initiative: 20,
      },
      {
        type: "combatOrderSet",
        participantIds: ["manual:npc-a", "role:3"],
      },
    ]);
  });

  it("编辑 stateKey 自定义列时优先写入角色变量", () => {
    const param: InitiativeParam = {
      key: "temp-hp",
      label: "临时生命",
      source: "stateKey",
      stateKey: "tempHp",
    };

    expect(buildUpdateInitiativeExtraEvents(currentList[1], param, "temp-hp", "6")).toEqual([
      {
        type: "varOp",
        scope: buildRoleStateEventScope(3),
        key: "tempHp",
        op: STATE_EVENT_VAR_OP.SET,
        value: 6,
      },
    ]);
  });

  it("编辑普通自定义列时写入参与者 values 并规范化空值", () => {
    const param: InitiativeParam = {
      key: "note",
      label: "备注",
      source: "manual",
    };

    expect(buildUpdateInitiativeExtraEvents(currentList[0], param, "note", "  ")).toEqual([
      {
        type: "combatParticipantUpsert",
        participantId: "manual:npc-a",
        values: {
          note: null,
        },
      },
    ]);
  });
});
