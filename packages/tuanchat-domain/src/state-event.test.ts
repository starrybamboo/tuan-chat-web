import { describe, expect, it } from "vitest";

import {
  buildCommandStateEventExtra,
  buildRoleStateEventScope,
  formatStateEventPreviewText,
  normalizeStateEventExtra,
  STATE_EVENT_COMBAT_COLUMN_SOURCE,
  STATE_EVENT_VAR_OP,
} from "./state-event";

describe("state-event combat atoms", () => {
  it("规范化合法的 combat atom，并保留混合状态事件顺序", () => {
    const normalized = normalizeStateEventExtra({
      source: { kind: "ui", parserVersion: "state-event-v1" },
      events: [
        {
          type: "combatParticipantUpsert",
          participantId: " role:12 ",
          roleId: "12",
          name: " Alice ",
          initiative: "18",
          values: {
            hp: 24,
            note: "guard",
            ignored: { nested: true },
          },
        },
        {
          type: "varOp",
          scope: buildRoleStateEventScope(12),
          key: "hp",
          op: STATE_EVENT_VAR_OP.SUB,
          value: "3",
        },
        {
          type: "combatColumnUpsert",
          key: "hp-note",
          label: "HP备注",
          source: STATE_EVENT_COMBAT_COLUMN_SOURCE.MANUAL,
        },
        {
          type: "combatMapTokenUpsert",
          roleId: "12",
          rowIndex: "2",
          colIndex: "3",
        },
      ],
    });

    expect(normalized?.events).toEqual([
      {
        type: "combatParticipantUpsert",
        participantId: "role:12",
        roleId: 12,
        name: "Alice",
        initiative: 18,
        values: {
          hp: 24,
          note: "guard",
        },
      },
      {
        type: "varOp",
        scope: { kind: "role", roleId: 12 },
        key: "hp",
        op: "sub",
        value: 3,
      },
      {
        type: "combatColumnUpsert",
        key: "hp-note",
        label: "HP备注",
        source: "manual",
      },
      {
        type: "combatMapTokenUpsert",
        roleId: 12,
        rowIndex: 2,
        colIndex: 3,
      },
    ]);
  });

  it("拒绝缺少必填字段的 combat atom", () => {
    const normalized = normalizeStateEventExtra({
      source: { kind: "ui", parserVersion: "state-event-v1" },
      events: [
        { type: "combatParticipantUpsert", name: "No id" },
        { type: "combatColumnUpsert", key: "bad", label: "坏列", source: "roleAttr" },
        { type: "combatOrderSet", participantIds: ["a", "", "a", "b"] },
        { type: "combatMapTokenUpsert", roleId: "1", rowIndex: "-1", colIndex: "3" },
        { type: "combatMapTokenRemove" },
      ],
    });

    expect(normalized?.events).toEqual([
      {
        type: "combatOrderSet",
        participantIds: ["a", "b"],
      },
    ]);
  });

  it("为 combat atom 生成战斗预览文本", () => {
    const extra = {
      stateEvent: buildCommandStateEventExtra("combat", [
        {
          type: "combatParticipantUpsert",
          participantId: "manual:dragon",
          name: "龙",
          initiative: 20,
        },
      ]),
    };

    expect(formatStateEventPreviewText(extra)).toBe("[战斗] 龙 加入先攻");
  });
});
