import { describe, expect, it } from "vitest";

import { buildRoleStateEventScope, STATE_EVENT_VAR_OP } from "@/types/stateEvent";

import type { Initiative } from "./initiativeListTypes";

import {
  buildImportRoleInitiativeEvents,
  buildRemoveInitiativeEvents,
  buildUpdateInitiativeEvents,
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
  it("导入角色时只生成先攻变量事件", () => {
    const events = buildImportRoleInitiativeEvents({
      initiative: 18,
      name: "艾拉",
      roleId: 3,
    });

    expect(events).toEqual([
      {
        type: "varOp",
        scope: buildRoleStateEventScope(3),
        key: "initiative",
        op: STATE_EVENT_VAR_OP.SET,
        value: 18,
      },
    ]);
  });

  it("删除角色先攻时将 initiative 归零", () => {
    expect(buildRemoveInitiativeEvents(currentList[1])).toEqual([
      {
        type: "varOp",
        scope: buildRoleStateEventScope(3),
        key: "initiative",
        op: STATE_EVENT_VAR_OP.SET,
        value: 0,
      },
    ]);
  });

  it("手动参与者不再生成状态事件", () => {
    expect(buildUpdateInitiativeEvents(currentList[0], { hp: 4 })).toEqual([]);
  });

  it("编辑角色绑定参与者 HP 时写入角色变量", () => {
    expect(buildUpdateInitiativeEvents(currentList[1], { hp: 9 })).toEqual([
      {
        type: "varOp",
        scope: buildRoleStateEventScope(3),
        key: "hp",
        op: STATE_EVENT_VAR_OP.SET,
        value: 9,
      },
    ]);
  });

  it("编辑角色绑定参与者 HP 上限时写入 hpm", () => {
    expect(buildUpdateInitiativeEvents(currentList[1], { maxHp: 14 })).toEqual([
      {
        type: "varOp",
        scope: buildRoleStateEventScope(3),
        key: "hpm",
        op: STATE_EVENT_VAR_OP.SET,
        value: 14,
      },
    ]);
  });

  it("编辑先攻值时写入角色变量", () => {
    expect(buildUpdateInitiativeEvents(currentList[1], { value: 20 })).toEqual([
      {
        type: "varOp",
        scope: buildRoleStateEventScope(3),
        key: "initiative",
        op: STATE_EVENT_VAR_OP.SET,
        value: 20,
      },
    ]);
  });
});
