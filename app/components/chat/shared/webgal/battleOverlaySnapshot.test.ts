import { describe, expect, it } from "vitest";

import type { RoomDndMapSnapshot } from "@/components/chat/shared/map/roomDndMapApi";
import type { CombatStateRuntime } from "@/components/chat/state/stateRuntime";

import { buildBattleOverlaySnapshot } from "./battleOverlaySnapshot";

function createRuntime(patch: Partial<CombatStateRuntime> = {}): CombatStateRuntime {
  return {
    turn: 0,
    roomVars: {},
    roleVarsByRoleId: {},
    activeStates: [],
    baseDisplayValues: {
      room: {},
      rolesByRoleId: {},
    },
    derivedDisplayValues: {
      room: {},
      rolesByRoleId: {},
    },
    unresolvedStates: [],
    messageSummariesByMessageId: {},
    participants: [],
    participantsById: {},
    mapTokens: [],
    mapTokensByRoleId: {},
    hasMapState: false,
    ...patch,
  };
}

describe("battleOverlaySnapshot", () => {
  it("没有地图、回合和角色战斗状态时隐藏 overlay", () => {
    expect(buildBattleOverlaySnapshot({
      roomId: 12,
      roles: [{ roleId: 3, roleName: "露娜", userId: 1, type: 0 }],
      runtime: createRuntime(),
    })).toMatchObject({
      visible: false,
      roomId: 12,
      round: null,
      map: null,
      roles: [],
    });
  });

  it("从运行时提取 HP、先攻、状态标签并计算 HP 百分比", () => {
    const snapshot = buildBattleOverlaySnapshot({
      roomId: 12,
      roles: [{
        roleId: 3,
        roleName: "露娜",
        userId: 1,
        type: 0,
        avatarFileId: 100,
      }],
      runtime: createRuntime({
        turn: 2,
        baseDisplayValues: {
          room: {},
          rolesByRoleId: {
            3: { hp: 8, maxHp: 20, initiative: 15 },
          },
        },
        derivedDisplayValues: {
          room: {},
          rolesByRoleId: {
            3: { hp: 6, maxHp: 20, initiative: 15 },
          },
        },
        activeStates: [{
          instanceId: "m1:0:poison",
          sourceMessageId: 1,
          scope: { kind: "role", roleId: 3 },
          statusId: "poison",
          statusName: "中毒",
          remainingTurns: 1,
          durationTurns: 2,
          stackMode: "replace",
          modifiers: [],
        }],
      }),
    });

    expect(snapshot.visible).toBe(true);
    expect(snapshot.round).toBe(2);
    expect(snapshot.currentActorRoleId).toBe(3);
    expect(snapshot.currentActorName).toBe("露娜");
    expect(snapshot.roles[0]).toMatchObject({
      roleId: 3,
      name: "露娜",
      hp: 6,
      maxHp: 20,
      hpPercent: 30,
      initiative: 15,
      isCurrentActor: true,
      statuses: [{ instanceId: "m1:0:poison", name: "中毒", remainingTurns: 1 }],
    });
    expect(snapshot.roles[0]?.avatarUrl).toContain("100");
  });

  it("优先使用状态运行时 token 并投影到地图 snapshot", () => {
    const map: RoomDndMapSnapshot = {
      roomId: 12,
      mapFileId: 200,
      gridRows: 8,
      gridCols: 9,
      gridColor: "#64748b",
      tokens: [{ roleId: 3, rowIndex: 1, colIndex: 2 }],
    };

    const snapshot = buildBattleOverlaySnapshot({
      roomId: 12,
      map,
      roles: [{ roleId: 3, roleName: "露娜", userId: 1, type: 0 }],
      runtime: createRuntime({
        hasMapState: true,
        mapTokens: [{ roleId: 3, rowIndex: 4, colIndex: 5 }],
        mapTokensByRoleId: {
          3: { roleId: 3, rowIndex: 4, colIndex: 5 },
        },
      }),
    });

    expect(snapshot.visible).toBe(true);
    expect(snapshot.map).toMatchObject({
      gridRows: 8,
      gridCols: 9,
      gridColor: "#64748b",
      tokens: [{
        roleId: 3,
        rowIndex: 4,
        colIndex: 5,
        name: "露娜",
      }],
    });
    expect(snapshot.map?.imageUrl).toContain("200");
    expect(snapshot.roles.map(role => role.roleId)).toEqual([3]);
  });
});
