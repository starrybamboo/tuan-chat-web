import { describe, expect, it } from "vitest";

import {
  buildCommandStateEventExtra,
  buildRoleStateEventScope,
  formatStateEventPreviewText,
  normalizeStateEventExtra,
  STATE_EVENT_VAR_OP,
} from "./state-event";

describe("state-event atoms", () => {
  it("规范化合法的状态与地图 atom，并保留混合事件顺序", () => {
    const normalized = normalizeStateEventExtra({
      source: { kind: "ui", parserVersion: "state-event-v1" },
      events: [
        {
          type: "varOp",
          scope: buildRoleStateEventScope(12),
          key: "initiative",
          op: STATE_EVENT_VAR_OP.SET,
          value: "18",
        },
        {
          type: "mapTokenUpsert",
          roleId: "12",
          rowIndex: "2",
          colIndex: "3",
        },
      ],
    });

    expect(normalized?.events).toEqual([
      {
        type: "varOp",
        scope: { kind: "role", roleId: 12 },
        key: "initiative",
        op: "set",
        value: 18,
      },
      {
        type: "mapTokenUpsert",
        roleId: 12,
        rowIndex: 2,
        colIndex: 3,
      },
    ]);
  });

  it("拒绝缺少必填字段的 atom，并不再接受 participant 事件", () => {
    const normalized = normalizeStateEventExtra({
      source: { kind: "ui", parserVersion: "state-event-v1" },
      events: [
        { type: "combatParticipantUpsert", name: "No id" },
        { type: "combatParticipantRemove", participantId: "role:1" },
        { type: "mapTokenUpsert", roleId: "1", rowIndex: "-1", colIndex: "3" },
        { type: "mapTokenRemove" },
        { type: "combatRoundEnd" },
      ],
    });

    expect(normalized?.events).toEqual([
      {
        type: "combatRoundEnd",
      },
    ]);
  });

  it("为 map token atom 生成战斗预览文本", () => {
    const extra = {
      stateEvent: buildCommandStateEventExtra("combat", [
        {
          type: "mapTokenUpsert",
          roleId: 12,
          rowIndex: 2,
          colIndex: 3,
        },
      ]),
    };

    expect(formatStateEventPreviewText(extra)).toBe("[战斗] 地图角色 #12 移动");
  });
});
