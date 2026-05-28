import { describe, expect, it } from "vitest";

import { MESSAGE_TYPE } from "../messageType";
import {
  buildCommandStateEventExtra,
  buildRoleStateEventScope,
  buildRoomStateEventScope,
  STATE_EVENT_STATUS_MODIFIER_OP,
  STATE_EVENT_VAR_OP,
  toApiMessageExtraWithStateEvent,
} from "../state-event";
import {
  buildCombatStateRuntime,
  buildStateSnapshotEvents,
  createStateDefinition,
  MemoryStateDefinitionResolver,
} from "./runtime";

function createStateMessage(
  messageId: number,
  events: Parameters<typeof buildCommandStateEventExtra>[1],
  commandName = "combat",
) {
  return {
    messageId,
    messageType: MESSAGE_TYPE.STATE_EVENT,
    content: ".state",
    status: 0,
    extra: toApiMessageExtraWithStateEvent(buildCommandStateEventExtra(commandName, events)),
  };
}

describe("buildStateSnapshotEvents", () => {
  it("把当前房间战斗态物化为可在另一个房间重放的快照事件", () => {
    const resolver = new MemoryStateDefinitionResolver([
      createStateDefinition({
        statusId: "burn-v1",
        name: "燃烧",
        durationTurns: 3,
        modifiers: [{
          key: "hp",
          op: STATE_EVENT_STATUS_MODIFIER_OP.SUB,
          value: 2,
        }],
      }),
    ]);
    const sourceRuntime = buildCombatStateRuntime({
      messages: [
        createStateMessage(1, [{ type: "combatRoundStart" }]),
        createStateMessage(2, [
          {
            type: "varOp",
            scope: buildRoomStateEventScope(),
            key: "threat",
            op: STATE_EVENT_VAR_OP.SET,
            value: 4,
          },
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
            statusId: "burn-v1",
          },
          {
            type: "mapConfigUpsert",
            mapFileId: 200,
            imageUrl: "https://example.test/map.png",
            gridRows: 8,
            gridCols: 9,
            gridColor: "#64748b",
            clearTokens: true,
          },
          {
            type: "mapTokenUpsert",
            roleId: 3,
            rowIndex: 1,
            colIndex: 2,
          },
        ]),
        createStateMessage(3, [{ type: "nextTurn" }]),
      ],
      resolver,
    });

    const snapshotEvents = buildStateSnapshotEvents(sourceRuntime);

    expect(snapshotEvents).toEqual([
      { type: "combatRoundStart" },
      { type: "nextTurn" },
      {
        type: "varOp",
        scope: { kind: "room" },
        key: "threat",
        op: "set",
        value: 4,
      },
      {
        type: "varOp",
        scope: { kind: "role", roleId: 3 },
        key: "hp",
        op: "set",
        value: 18,
      },
      {
        type: "mapConfigUpsert",
        mapFileId: 200,
        imageUrl: "https://example.test/map.png",
        gridRows: 8,
        gridCols: 9,
        gridColor: "#64748b",
        clearTokens: true,
      },
      {
        type: "mapTokenUpsert",
        roleId: 3,
        rowIndex: 1,
        colIndex: 2,
      },
      {
        type: "statusApply",
        scope: { kind: "role", roleId: 3 },
        statusId: "burn-v1",
        durationTurns: 2,
      },
    ]);

    const targetRuntime = buildCombatStateRuntime({
      messages: [createStateMessage(10, snapshotEvents, "stateSync")],
      resolver,
    });

    expect(targetRuntime.combatRoundActive).toBe(true);
    expect(targetRuntime.turn).toBe(1);
    expect(targetRuntime.roomVars).toEqual({ threat: 4 });
    expect(targetRuntime.roleVarsByRoleId[3]).toEqual({ hp: 18 });
    expect(targetRuntime.activeStates.map(state => [state.statusName, state.remainingTurns])).toEqual([["燃烧", 2]]);
    expect(targetRuntime.mapConfig).toEqual({
      mapFileId: 200,
      imageUrl: "https://example.test/map.png",
      gridRows: 8,
      gridCols: 9,
      gridColor: "#64748b",
    });
    expect(targetRuntime.mapTokens).toEqual([{ roleId: 3, rowIndex: 1, colIndex: 2 }]);
    expect(targetRuntime.messageSummariesByMessageId[10]?.primaryText).toBe("同步状态快照");
  });

  it("空房间态不会生成无意义同步事件", () => {
    const runtime = buildCombatStateRuntime({ messages: [] });

    expect(buildStateSnapshotEvents(runtime)).toEqual([]);
  });
});
