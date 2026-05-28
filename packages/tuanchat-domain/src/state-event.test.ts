import { describe, expect, it } from "vitest";

import {
  buildCommandStateEventExtra,
  buildMapStateEventsFromSnapshot,
  buildRoleStateEventScope,
  formatStateEventAtomDetail,
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
        {
          type: "mapConfigUpsert",
          mapFileId: "200",
          imageUrl: " https://example.test/map.png ",
          gridRows: "8",
          gridCols: "9",
          gridColor: " #64748b ",
          clearTokens: "true",
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
      {
        type: "mapConfigUpsert",
        mapFileId: 200,
        imageUrl: "https://example.test/map.png",
        gridRows: 8,
        gridCols: 9,
        gridColor: "#64748b",
        clearTokens: true,
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
        { type: "mapConfigUpsert", mapFileId: "200", gridRows: "8", gridCols: "9" },
        { type: "combatRoundStart" },
        { type: "combatRoundEnd" },
        { type: "mapConfigClear" },
      ],
    });

    expect(normalized?.events).toEqual([
      {
        type: "combatRoundStart",
      },
      {
        type: "combatRoundEnd",
      },
      {
        type: "mapConfigClear",
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

  it("map token 详情在提供角色名映射时显示角色名", () => {
    expect(formatStateEventAtomDetail({
      type: "mapTokenUpsert",
      roleId: 14244,
      rowIndex: 5,
      colIndex: 3,
    }, {
      roleNameById: {
        14244: "降星驰",
      },
    })).toBe("降星驰 移动到 第 6 行 · 第 4 列");
  });

  it("为 combat round atom 生成战斗预览文本", () => {
    expect(formatStateEventPreviewText({
      stateEvent: buildCommandStateEventExtra("combat", [{ type: "combatRoundStart" }]),
    })).toBe("[战斗] 进入战斗轮");
    expect(formatStateEventPreviewText({
      stateEvent: buildCommandStateEventExtra("combat", [{ type: "combatRoundEnd" }]),
    })).toBe("[战斗] 结束战斗");
  });

  it("为 map config atom 生成聚合后的地图配置文本", () => {
    expect(formatStateEventAtomDetail({
      type: "mapConfigUpsert",
      mapFileId: 200,
      gridRows: 8,
      gridCols: 9,
      gridColor: "#64748b",
      clearTokens: true,
    })).toBe("更新地图配置 #200 · 8×9 · #64748b · 清空角色位置");
    expect(formatStateEventPreviewText({
      stateEvent: buildCommandStateEventExtra("combat", [{
        type: "mapConfigUpsert",
        mapFileId: 200,
        gridRows: 8,
        gridCols: 9,
        gridColor: "#64748b",
      }]),
    })).toBe("[战斗] 更新地图配置");
  });

  it("从旧地图 snapshot 构造一次性迁移状态事件", () => {
    expect(buildMapStateEventsFromSnapshot({
      mapFileId: "200",
      gridRows: "8",
      gridCols: "9",
      gridColor: " #64748b ",
      tokens: [
        { roleId: "3", rowIndex: "1", colIndex: "2" },
        { roleId: "4", rowIndex: "99", colIndex: "2" },
        { roleId: "bad", rowIndex: "1", colIndex: "2" },
      ],
    }, {
      imageUrl: " https://example.test/map.png ",
    })).toEqual([
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
    ]);
  });

  it("旧地图 snapshot 已存在 token 时间线时只迁移地图配置", () => {
    expect(buildMapStateEventsFromSnapshot({
      mapFileId: 200,
      gridRows: 8,
      gridCols: 9,
      gridColor: "#64748b",
      tokens: [
        { roleId: 3, rowIndex: 1, colIndex: 2 },
      ],
    }, {
      includeTokens: false,
    })).toEqual([
      {
        type: "mapConfigUpsert",
        mapFileId: 200,
        gridRows: 8,
        gridCols: 9,
        gridColor: "#64748b",
      },
    ]);
  });
});
