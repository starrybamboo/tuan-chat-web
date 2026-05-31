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
      "setVar:tuanchat.map.hasConfig=false;",
      "setVar:tuanchat.map.tokenRoleIds=\"\";",
      "setVar:tuanchat.role.3.avatarUrl=\"./game/figure/token_role_3.webp\";",
    ]);
  });

  it("复用稳定的角色变量 key", () => {
    expect(buildTuanChatRoleVarKey(14562, "hp")).toBe("tuanchat.role.14562.hp");
  });

  it("把状态事件翻译为原生 WebGAL setVar 语句", () => {
    const result = buildTuanChatStateEventVarLines({
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
          { type: "mapConfigUpsert", mapFileId: 12, imageUrl: "./game/background/map_12.png", gridRows: 10, gridCols: 12, gridColor: "#fff" },
          { type: "mapTokenUpsert", roleId: 3, rowIndex: 1, colIndex: 2 },
        ],
      },
    });

    expect(result.lines).toEqual([
      "setVar:tuanchat.combat.active=true;",
      "setVar:tuanchat.role.3.hp=tuanchat.role.3.hp - 5;",
      "setVar:tuanchat.combat.turn=tuanchat.combat.turn + 1;",
      "setVar:tuanchat.map.hasConfig=true;",
      "setVar:tuanchat.map.fileId=12;",
      "setVar:tuanchat.map.imageUrl=\"./game/background/map_12.png\";",
      "setVar:tuanchat.map.gridRows=10;",
      "setVar:tuanchat.map.gridCols=12;",
      "setVar:tuanchat.map.gridColor=\"#fff\";",
      "setVar:tuanchat.map.token.3.active=true;",
      "setVar:tuanchat.map.token.3.rowIndex=1;",
      "setVar:tuanchat.map.token.3.colIndex=2;",
      "setVar:tuanchat.map.tokenRoleIds=\"3,8\";",
    ]);
    expect(result.mapTokenRoleIds).toEqual([3, 8]);
  });

  it("资源 URL 变量只允许写入 WebGAL 工程内相对路径", () => {
    expect(buildTuanChatWebgalInitVarLines({
      roleIds: [3],
      avatarUrlsByRoleId: {
        3: "http://localhost:3001/games/realtime/game/figure/token_role_3.webp",
      },
    })).toEqual([
      "setVar:tuanchat.roleIds=\"3\";",
      "setVar:tuanchat.combat.active=false;",
      "setVar:tuanchat.combat.turn=0;",
      "setVar:tuanchat.map.hasConfig=false;",
      "setVar:tuanchat.map.tokenRoleIds=\"\";",
    ]);

    expect(buildTuanChatStateEventVarLines({
      stateEvent: {
        source: { kind: "ui", parserVersion: "state-event-v1" },
        events: [
          { type: "mapConfigUpsert", mapFileId: 12, imageUrl: "https://example.test/map.png", gridRows: 10, gridCols: 10, gridColor: "#fff" },
        ],
      },
    }).lines).not.toContain("setVar:tuanchat.map.imageUrl=\"https://example.test/map.png\";");
  });

  it("清图事件会清空 WebGAL 变量中的 token 列表", () => {
    expect(applyTuanChatStateEventToMapTokenRoleIds([
      { type: "mapConfigUpsert", mapFileId: 1, gridRows: 10, gridCols: 10, gridColor: "#fff", clearTokens: true },
      { type: "mapTokenUpsert", roleId: 9, rowIndex: 0, colIndex: 1 },
    ], [3, 8])).toEqual([9]);

    expect(buildTuanChatStateEventVarLines({
      mapTokenRoleIds: [3, 8],
      stateEvent: {
        source: { kind: "ui", parserVersion: "state-event-v1" },
        events: [{ type: "mapConfigClear" }],
      },
    }).lines).toEqual([
      "setVar:tuanchat.map.hasConfig=false;",
      "setVar:tuanchat.map.fileId=0;",
      "setVar:tuanchat.map.imageUrl=\"\";",
      "setVar:tuanchat.map.tokenRoleIds=\"\";",
    ]);
  });
});
