import type { Message } from "@tuanchat/openapi-client/models/Message";

import { describe, expect, it } from "vitest";

import { MESSAGE_TYPE } from "../messageType";
import {
  buildCommandStateEventExtra,
  buildRoleStateEventScope,
  STATE_EVENT_VAR_OP,
} from "../state-event";
import { buildCombatStateRuntime, createStateDefinition, MemoryStateDefinitionResolver } from "./runtime";

function createStateMessage(
  messageId: number,
  events: Parameters<typeof buildCommandStateEventExtra>[1],
): Pick<Message, "messageId" | "messageType" | "content" | "status" | "extra"> {
  return {
    messageId,
    messageType: MESSAGE_TYPE.STATE_EVENT,
    content: ".combat",
    status: 0,
    extra: {
      stateEvent: buildCommandStateEventExtra("combat", events),
    },
  };
}

describe("buildCombatStateRuntime", () => {
  it("role var 只保留为记录摘要，不再物化为角色变量", () => {
    const runtime = buildCombatStateRuntime({
      messages: [
        createStateMessage(1, [
          {
            type: "varOp",
            scope: buildRoleStateEventScope(3),
            key: "initiative",
            op: STATE_EVENT_VAR_OP.SET,
            value: 14,
          },
        ]),
      ],
      fallbackRoleAbilitiesByRoleId: {
        3: {
          roleId: 3,
          ruleId: 7,
          skill: { initiative: "14" },
        },
      },
    });

    expect(runtime.participants).toEqual([]);
    expect(runtime.roleVarsByRoleId[3]).toBeUndefined();
    expect(runtime.derivedDisplayValues.rolesByRoleId[3]?.initiative).toBe(14);
  });

  it("按消息顺序回放地图 token 位移和移除", () => {
    const runtime = buildCombatStateRuntime({
      messages: [
        createStateMessage(1, [
          {
            type: "mapTokenUpsert",
            roleId: 3,
            rowIndex: 1,
            colIndex: 2,
          },
        ]),
        createStateMessage(2, [
          {
            type: "mapTokenUpsert",
            roleId: 3,
            rowIndex: 4,
            colIndex: 5,
          },
          {
            type: "mapTokenRemove",
            roleId: 9,
          },
        ]),
      ],
    });

    expect(runtime.hasMapState).toBe(true);
    expect(runtime.mapTokens).toEqual([{ roleId: 3, rowIndex: 4, colIndex: 5 }]);
    expect(runtime.mapTokensByRoleId[3]).toEqual({ roleId: 3, rowIndex: 4, colIndex: 5 });
  });

  it("按消息顺序回放地图配置，并将网格行列颜色聚合到最终态", () => {
    const runtime = buildCombatStateRuntime({
      messages: [
        createStateMessage(1, [{
          type: "mapConfigUpsert",
          mapFileId: 200,
          imageUrl: "https://example.test/old-map.png",
          gridRows: 8,
          gridCols: 9,
          gridColor: "#64748b",
        }]),
        createStateMessage(2, [{
          type: "mapConfigUpsert",
          mapFileId: 200,
          imageUrl: "https://example.test/old-map.png",
          gridRows: 10,
          gridCols: 12,
          gridColor: "#22c55e",
        }]),
      ],
    });

    expect(runtime.hasMapState).toBe(true);
    expect(runtime.hasMapConfigState).toBe(true);
    expect(runtime.mapConfig).toEqual({
      mapFileId: 200,
      imageUrl: "https://example.test/old-map.png",
      gridRows: 10,
      gridCols: 12,
      gridColor: "#22c55e",
    });
  });

  it("换图和清空地图会清空 token，并记录 map config 时间线", () => {
    const runtime = buildCombatStateRuntime({
      messages: [
        createStateMessage(1, [{
          type: "mapConfigUpsert",
          mapFileId: 200,
          gridRows: 8,
          gridCols: 9,
          gridColor: "#64748b",
        }, {
          type: "mapTokenUpsert",
          roleId: 3,
          rowIndex: 1,
          colIndex: 2,
        }]),
        createStateMessage(2, [{
          type: "mapConfigUpsert",
          mapFileId: 201,
          gridRows: 10,
          gridCols: 10,
          gridColor: "#64748b",
          clearTokens: true,
        }]),
        createStateMessage(3, [{
          type: "mapConfigClear",
        }]),
      ],
    });

    expect(runtime.hasMapState).toBe(true);
    expect(runtime.hasMapConfigState).toBe(true);
    expect(runtime.mapConfig).toBeNull();
    expect(runtime.mapTokens).toEqual([]);
  });

  it("combatRoundEnd 会将回合归零", () => {
    const runtime = buildCombatStateRuntime({
      messages: [
        createStateMessage(1, [{ type: "combatRoundStart" }]),
        createStateMessage(2, [{ type: "nextTurn" }]),
        createStateMessage(3, [{ type: "combatRoundEnd" }]),
      ],
    });

    expect(runtime.turn).toBe(0);
    expect(runtime.combatRoundActive).toBe(false);
    expect(runtime.messageSummariesByMessageId[3]?.primaryText).toBe("结束战斗");
    expect(runtime.messageSummariesByMessageId[3]?.detailLines).toContain("结束战斗 · 回合 1 -> 0");
  });

  it("nextTurn 在战斗开始前不会推进回合", () => {
    const runtime = buildCombatStateRuntime({
      messages: [
        createStateMessage(1, [{ type: "nextTurn" }]),
      ],
    });

    expect(runtime.turn).toBe(0);
    expect(runtime.combatRoundActive).toBe(false);
    expect(runtime.messageSummariesByMessageId[1]?.primaryText).toBe("未开始战斗");
    expect(runtime.messageSummariesByMessageId[1]?.detailLines).toContain("未开始战斗，忽略下一回合");
  });

  it("combatRoundStart 会标记战斗轮进行中", () => {
    const runtime = buildCombatStateRuntime({
      messages: [
        createStateMessage(1, [{ type: "combatRoundStart" }]),
      ],
    });

    expect(runtime.combatRoundActive).toBe(true);
    expect(runtime.turn).toBe(0);
    expect(runtime.messageSummariesByMessageId[1]?.primaryText).toBe("进入战斗轮");
    expect(runtime.messageSummariesByMessageId[1]?.detailLines).toContain("进入战斗轮 · 当前回合 0");
  });

  it("战斗轮中重复 combatRoundStart 不会重置回合", () => {
    const runtime = buildCombatStateRuntime({
      messages: [
        createStateMessage(1, [{ type: "combatRoundStart" }]),
        createStateMessage(2, [{ type: "nextTurn" }]),
        createStateMessage(3, [{ type: "combatRoundStart" }]),
      ],
    });

    expect(runtime.combatRoundActive).toBe(true);
    expect(runtime.turn).toBe(1);
    expect(runtime.messageSummariesByMessageId[3]?.detailLines).toContain("进入战斗轮 · 当前回合 1");
  });

  it("combatRoundEnd 只退出战斗并归零回合，不清空变量、状态或地图 token", () => {
    const resolver = new MemoryStateDefinitionResolver([
      createStateDefinition({
        statusId: "shield-v1",
        name: "护盾",
        durationTurns: 3,
        modifiers: [],
      }),
    ]);
    const runtime = buildCombatStateRuntime({
      messages: [
        createStateMessage(1, [{ type: "combatRoundStart" }]),
        createStateMessage(2, [
          {
            type: "varOp",
            scope: buildRoleStateEventScope(3),
            key: "hp",
            op: STATE_EVENT_VAR_OP.SET,
            value: 18,
          },
          {
            type: "statusApply",
            scope: buildRoleStateEventScope(3),
            statusId: "shield-v1",
          },
          {
            type: "mapTokenUpsert",
            roleId: 3,
            rowIndex: 2,
            colIndex: 4,
          },
        ]),
        createStateMessage(3, [{ type: "nextTurn" }]),
        createStateMessage(4, [{ type: "combatRoundEnd" }]),
      ],
      resolver,
      fallbackRoleAbilitiesByRoleId: {
        3: {
          roleId: 3,
          ruleId: 7,
          ability: { hp: "18" },
        },
      },
    });

    expect(runtime.combatRoundActive).toBe(false);
    expect(runtime.turn).toBe(0);
    expect(runtime.roleVarsByRoleId[3]).toBeUndefined();
    expect(runtime.derivedDisplayValues.rolesByRoleId[3]?.hp).toBe(18);
    expect(runtime.activeStates.map(state => [state.statusName, state.remainingTurns])).toEqual([["护盾", 2]]);
    expect(runtime.mapTokens).toEqual([{ roleId: 3, rowIndex: 2, colIndex: 4 }]);
  });
});
