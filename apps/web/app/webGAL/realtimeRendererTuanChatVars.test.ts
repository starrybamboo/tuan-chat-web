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
    })).toEqual([
      "setVar:tuanchat.roleIds=\"3,9\";",
      "setVar:tuanchat.combat.active=false;",
      "setVar:tuanchat.combat.turn=0;",
      "tuanChatMap:reset;",
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
      "tuanChatMap:hide;",
      "setVar:tuanchat.role.3.hp=tuanchat.role.3.hp - 5;",
      "setVar:tuanchat.combat.turn=tuanchat.combat.turn + 1;",
      "tuanChatMap:config -background=map_12.png -rows=10 -cols=12 -gridColor=#fff;",
      "tuanChatMap:show;",
      "tuanChatMap:token -roleId=3 -row=1 -col=2;",
      "tuanChatMap:show;",
    ]);
    expect(result.mapTokenRoleIds).toEqual([3, 8]);
  });

  it("地图 token 更新会输出专属命令并显示地图", () => {
    const result = buildTuanChatStateEventVarLines({
      avatarUrlsByRoleId: {
        14562: "token_role_14562.webp",
      },
      stateEvent: {
        source: { kind: "ui", parserVersion: "state-event-v1" },
        events: [{ type: "mapTokenUpsert", roleId: 14562, rowIndex: 6, colIndex: 2 }],
      },
    });

    expect(result.lines).toEqual([
      "tuanChatMap:token -roleId=14562 -row=6 -col=2 -avatar=token_role_14562.webp;",
      "tuanChatMap:show;",
    ]);
  });

  it("地图命令只写本地背景资源名", () => {
    expect(buildTuanChatWebgalInitVarLines({
      roleIds: [3],
    })).toEqual([
      "setVar:tuanchat.roleIds=\"3\";",
      "setVar:tuanchat.combat.active=false;",
      "setVar:tuanchat.combat.turn=0;",
      "tuanChatMap:reset;",
    ]);

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
    }).lines).toContain("tuanChatMap:config -background=map_12.png -rows=10 -cols=10 -gridColor=#fff;");

    expect(buildTuanChatStateEventVarLines({
      stateEvent: {
        source: { kind: "ui", parserVersion: "state-event-v1" },
        events: [
          { type: "mapConfigUpsert", mapFileId: 12, gridRows: 10, gridCols: 10, gridColor: "#fff" },
        ],
      },
    }).lines).not.toContain("https://example.test/map.png");
  });

  it("地图配置清空事件会同步清除 token 运行态", () => {
    expect(applyTuanChatStateEventToMapTokenRoleIds([
      { type: "mapConfigUpsert", mapFileId: 1, gridRows: 10, gridCols: 10, gridColor: "#fff", clearTokens: true },
      { type: "mapTokenUpsert", roleId: 9, rowIndex: 0, colIndex: 1 },
    ], [3, 8])).toEqual([9]);

    const result = buildTuanChatStateEventVarLines({
      mapTokenRoleIds: [3, 8],
      stateEvent: {
        source: { kind: "ui", parserVersion: "state-event-v1" },
        events: [{ type: "mapConfigClear" }],
      },
    });
    expect(result.lines).toEqual([
      "tuanChatMap:clear;",
      "tuanChatMap:show;",
    ]);
    expect(result.mapTokenRoleIds).toEqual([]);
  });
});
