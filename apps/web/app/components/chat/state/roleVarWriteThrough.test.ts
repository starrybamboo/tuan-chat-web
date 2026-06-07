import { describe, expect, it, vi } from "vitest";

import type { StateEventVarOp } from "@/types/stateEvent";

import { buildRoleStateEventScope, STATE_EVENT_VAR_OP } from "@/types/stateEvent";

import type { RoleAbility } from "../../../../api";

import {
  applyRoleVarOpsToAbility,
  writeRoleVarOpsThroughAbilities,
} from "./roleVarWriteThrough";

function createDeps(beforeAbility: RoleAbility | null | undefined) {
  return {
    loadRoleAbility: vi.fn(async () => beforeAbility),
    createRoleAbility: vi.fn(async () => ({ success: true })),
    updateRoleAbility: vi.fn(async () => ({ success: true })),
  };
}

type TestRoleVarOp = StateEventVarOp & { scope: { kind: "role"; roleId: number } };

function roleVarOp(key: string, op: StateEventVarOp["op"], value: number): TestRoleVarOp {
  return {
    type: "varOp",
    scope: buildRoleStateEventScope(3),
    key,
    op,
    value,
  };
}

describe("roleVarWriteThrough", () => {
  it("按原始 role varOp 顺序写穿角色卡，并返回同一批记录", async () => {
    const events = [
      roleVarOp("hp", STATE_EVENT_VAR_OP.SET, 10),
      roleVarOp("hp", STATE_EVENT_VAR_OP.SUB, 2),
    ];
    const deps = createDeps({
      abilityId: 1,
      roleId: 3,
      ruleId: 7,
      ability: { hp: "3" },
    });

    const result = await writeRoleVarOpsThroughAbilities({
      events,
      ruleId: 7,
      ...deps,
    });

    expect(result).toEqual({
      changedAbilities: [{
        ability: {
          abilityId: 1,
          roleId: 3,
          ruleId: 7,
          act: {},
          basic: {},
          ability: { hp: "8" },
          skill: {},
          extra: {},
        },
        roleId: 3,
        ruleId: 7,
      }],
      changedRoleIds: [3],
      roleVarOps: [
        {
          ...events[0],
          beforeValue: 3,
          afterValue: 10,
        },
        {
          ...events[1],
          beforeValue: 10,
          afterValue: 8,
        },
      ],
    });
    expect(deps.updateRoleAbility).toHaveBeenCalledWith({
      roleId: 3,
      ruleId: 7,
      ability: { hp: "8" },
    });
    expect(deps.createRoleAbility).not.toHaveBeenCalled();
  });

  it("key 已存在时保持原 section", () => {
    const afterAbility = applyRoleVarOpsToAbility({
      roleId: 3,
      ruleId: 7,
      basic: { hp: "10" },
      ability: {},
      skill: {},
    }, 3, 7, [roleVarOp("hp", STATE_EVENT_VAR_OP.SUB, 2)]);

    expect(afterAbility.basic).toEqual({ hp: "8" });
    expect(afterAbility.ability).toEqual({});
    expect(afterAbility.skill).toEqual({});
  });

  it("缺失 hp/maxHp/san/mp 类 key 时默认写入 ability", () => {
    const afterAbility = applyRoleVarOpsToAbility({}, 3, 7, [
      roleVarOp("hp", STATE_EVENT_VAR_OP.SET, 10),
      roleVarOp("maxHp", STATE_EVENT_VAR_OP.SET, 20),
      roleVarOp("san", STATE_EVENT_VAR_OP.SET, 50),
      roleVarOp("mp", STATE_EVENT_VAR_OP.SET, 6),
    ]);

    expect(afterAbility.ability).toEqual({
      hp: "10",
      maxHp: "20",
      san: "50",
      mp: "6",
    });
  });

  it("缺失 initiative 和未知 key 时默认写入 skill", () => {
    const afterAbility = applyRoleVarOpsToAbility({}, 3, 7, [
      roleVarOp("initiative", STATE_EVENT_VAR_OP.SET, 12),
      roleVarOp("闪避", STATE_EVENT_VAR_OP.SET, 40),
    ]);

    expect(afterAbility.skill).toEqual({
      initiative: "12",
      闪避: "40",
    });
  });

  it("角色卡不存在时走 create，已存在时走 update", async () => {
    const createDepsForMissing = createDeps(null);
    await writeRoleVarOpsThroughAbilities({
      events: [roleVarOp("hp", STATE_EVENT_VAR_OP.SET, 8)],
      ruleId: 7,
      ...createDepsForMissing,
    });

    expect(createDepsForMissing.createRoleAbility).toHaveBeenCalledWith({
      roleId: 3,
      ruleId: 7,
      ability: { hp: "8" },
    });
    expect(createDepsForMissing.updateRoleAbility).not.toHaveBeenCalled();

    const updateDepsForExisting = createDeps({ abilityId: 10, roleId: 3, ruleId: 7, skill: { initiative: "3" } });
    await writeRoleVarOpsThroughAbilities({
      events: [roleVarOp("initiative", STATE_EVENT_VAR_OP.ADD, 4)],
      ruleId: 7,
      ...updateDepsForExisting,
    });

    expect(updateDepsForExisting.updateRoleAbility).toHaveBeenCalledWith({
      roleId: 3,
      ruleId: 7,
      skill: { initiative: "7" },
    });
    expect(updateDepsForExisting.createRoleAbility).not.toHaveBeenCalled();
  });

  it("没有 role-scoped varOp 时不读写角色卡", async () => {
    const deps = createDeps({ abilityId: 1, roleId: 3, ruleId: 7 });

    const result = await writeRoleVarOpsThroughAbilities({
      events: [{
        type: "varOp",
        scope: { kind: "room" },
        key: "难度",
        op: STATE_EVENT_VAR_OP.SET,
        value: 15,
      }],
      ruleId: 7,
      ...deps,
    });

    expect(result).toEqual({ changedAbilities: [], changedRoleIds: [], roleVarOps: [] });
    expect(deps.loadRoleAbility).not.toHaveBeenCalled();
    expect(deps.createRoleAbility).not.toHaveBeenCalled();
    expect(deps.updateRoleAbility).not.toHaveBeenCalled();
  });

  it("存在 role-scoped varOp 但 ruleId 无效时抛错且不发送写卡请求", async () => {
    const deps = createDeps({ abilityId: 1, roleId: 3, ruleId: 7 });

    await expect(writeRoleVarOpsThroughAbilities({
      events: [roleVarOp("hp", STATE_EVENT_VAR_OP.SUB, 2)],
      ruleId: -1,
      ...deps,
    })).rejects.toThrow("当前空间没有有效规则，无法写入角色卡");

    expect(deps.loadRoleAbility).not.toHaveBeenCalled();
    expect(deps.createRoleAbility).not.toHaveBeenCalled();
    expect(deps.updateRoleAbility).not.toHaveBeenCalled();
  });
});
