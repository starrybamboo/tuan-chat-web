import { describe, expect, it } from "vitest";

import {
  applyTuanChatStateEventToMapTokenRoleIds,
  buildTuanChatRoleVarKey,
  buildTuanChatStateEventVarLines,
  buildTuanChatWebgalInitVarLines,
} from "./realtimeRendererTuanChatVars";

describe("realtimeRendererTuanChatVars", () => {
  it("为房间场景生成最小 WebGAL 变量初始化脚本", () => {
    expect(buildTuanChatWebgalInitVarLines({
      roleIds: [9, 3, 3],
      avatarUrlsByRoleId: {
        3: "./game/figure/token_role_3.webp",
      },
    })).toEqual([
      "setVar:tuanchat.roleIds=\"3,9\";",
      "setVar:tuanchat.combat.active=false;",
      "setVar:tuanchat.combat.turn=0;",
      "setVar:tuanchat.map.background=\"\";",
      "setVar:tuanchat.role.3.avatarUrl=\"./game/figure/token_role_3.webp\";",
    ]);
  });

  it("复用稳定的角色变量 key", () => {
    expect(buildTuanChatRoleVarKey(14562, "hp")).toBe("tuanchat.role.14562.hp");
  });

  it("把状态事件翻译为原生 WebGAL setVar 语句", () => {
    const result = buildTuanChatStateEventVarLines({
      mapBackgroundsByFileId: {
        12: "map_12.png",
      },
      mapTokenRoleIds: [8],
      stateEvent: {
        source: {
          kind: "command",
          commandName: "combat",
          parserVersion: "state-event-v1",
        },
        events: [
          { type: "combatRoundStart" },
          { type: "varOp", scope: { kind: "role", roleId: 3 }, key: "hp", op: "sub", value: 5 },
          { type: "nextTurn" },
          { type: "mapConfigUpsert", mapFileId: 12, gridRows: 10, gridCols: 12, gridColor: "#fff" },
          { type: "mapTokenUpsert", roleId: 3, rowIndex: 1, colIndex: 2 },
        ],
      },
    });

    expect(result.lines).toEqual([
      "setVar:tuanchat.combat.active=true;",
      "setVar:tuanchat.role.3.hp=tuanchat.role.3.hp - 5;",
      "setVar:tuanchat.combat.turn=tuanchat.combat.turn + 1;",
      "setVar:tuanchat.map.background=\"map_12.png\";",
      "setVar:tuanchat.map.gridRows=10;",
      "setVar:tuanchat.map.gridCols=12;",
      "setVar:tuanchat.map.gridColor=\"#fff\";",
      "setVar:tuanchat.map.token.3.active=true;",
      "setVar:tuanchat.map.token.3.rowIndex=1;",
      "setVar:tuanchat.map.token.3.colIndex=2;",
    ]);
    expect(result.mapTokenRoleIds).toEqual([3, 8]);
  });

  it("资源 URL 变量只允许写入安全的图片地址，地图只写本地背景资源名", () => {
    expect(buildTuanChatWebgalInitVarLines({
      roleIds: [3],
      avatarUrlsByRoleId: {
        3: "http://localhost:3001/games/realtime/game/figure/token_role_3.webp",
      },
    })).toEqual([
      "setVar:tuanchat.roleIds=\"3\";",
      "setVar:tuanchat.combat.active=false;",
      "setVar:tuanchat.combat.turn=0;",
      "setVar:tuanchat.map.background=\"\";",
    ]);

    expect(buildTuanChatWebgalInitVarLines({
      roleIds: [3],
      avatarUrlsByRoleId: {
        3: "javascript:alert(1)",
      },
    })).not.toContain("setVar:tuanchat.role.3.avatarUrl=\"javascript:alert(1)\";");

    expect(buildTuanChatStateEventVarLines({
      mapBackgroundsByFileId: {
        12: "map_12.png",
      },
      stateEvent: {
        source: { kind: "ui", parserVersion: "state-event-v1" },
        events: [
          { type: "mapConfigUpsert", mapFileId: 12, gridRows: 10, gridCols: 10, gridColor: "#fff" },
        ],
      },
    }).lines).toContain("setVar:tuanchat.map.background=\"map_12.png\";");

    expect(buildTuanChatStateEventVarLines({
      stateEvent: {
        source: { kind: "ui", parserVersion: "state-event-v1" },
        events: [
          { type: "mapConfigUpsert", mapFileId: 12, gridRows: 10, gridCols: 10, gridColor: "#fff" },
        ],
      },
    }).lines).not.toContain("setVar:tuanchat.map.background=\"https://example.test/map.png\";");
  });

  it("清图事件只清地图背景，不清 token", () => {
    expect(applyTuanChatStateEventToMapTokenRoleIds([
      { type: "mapConfigUpsert", mapFileId: 1, gridRows: 10, gridCols: 10, gridColor: "#fff", clearTokens: true },
      { type: "mapTokenUpsert", roleId: 9, rowIndex: 0, colIndex: 1 },
    ], [3, 8])).toEqual([3, 8, 9]);

    expect(buildTuanChatStateEventVarLines({
      mapTokenRoleIds: [3, 8],
      stateEvent: {
        source: { kind: "ui", parserVersion: "state-event-v1" },
        events: [{ type: "mapConfigClear" }],
      },
    }).lines).toEqual([
      "setVar:tuanchat.map.background=\"\";",
    ]);
  });
});
