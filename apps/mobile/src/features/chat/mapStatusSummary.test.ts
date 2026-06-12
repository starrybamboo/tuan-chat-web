import type { Message } from "@tuanchat/openapi-client/models/Message";
import type { RoleAbility } from "@tuanchat/openapi-client/models/RoleAbility";
import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import { MESSAGE_TYPE } from "@tuanchat/domain/message-type";
import {
  buildCommandStateEventExtra,
  buildRoleStateEventScope,
  STATE_EVENT_STATUS_MODIFIER_OP,
  STATE_EVENT_VAR_OP,
} from "@tuanchat/domain/state-event";
import { buildCombatStateRuntime, createStateDefinition, MemoryStateDefinitionResolver } from "@tuanchat/domain/state-runtime";
import { describe, expect, it } from "vitest";

import { buildMobileMapStatusRows, buildMobileMapTokenStatusByRoleId } from "./mapStatusSummary";

function createStateMessage(messageId: number, events: Parameters<typeof buildCommandStateEventExtra>[1]): Message {
  return {
    content: ".combat",
    extra: {
      stateEvent: buildCommandStateEventExtra("combat", events),
    },
    messageId,
    messageType: MESSAGE_TYPE.STATE_EVENT,
    position: messageId,
    roomId: 1,
    status: 0,
    syncId: messageId,
    userId: 1,
  } as Message;
}

function createRole(roleId: number, roleName: string): UserRole {
  return {
    roleId,
    roleName,
  } as UserRole;
}

function createRoleAbility(
  roleId: number,
  sections: Pick<RoleAbility, "ability" | "skill"> = {},
): RoleAbility {
  return {
    ability: sections.ability ?? {},
    basic: {},
    roleId,
    ruleId: 1,
    skill: sections.skill ?? {},
  };
}

describe("mapStatusSummary", () => {
  it("builds rows for role state with initiative, hp, max hp, placement, and active states", () => {
    const resolver = new MemoryStateDefinitionResolver([
      createStateDefinition({
        durationTurns: 2,
        modifiers: [{
          key: "hp",
          op: STATE_EVENT_STATUS_MODIFIER_OP.SUB,
          value: 3,
        }],
        name: "燃烧",
        statusId: "burn",
      }),
    ]);
    const runtime = buildCombatStateRuntime({
      fallbackRoleAbilitiesByRoleId: {
        7: createRoleAbility(7, {
          ability: { hp: "18", maxHp: "20" },
          skill: { initiative: "16" },
        }),
      },
      messages: [
        createStateMessage(1, [
          {
            key: "initiative",
            op: STATE_EVENT_VAR_OP.SET,
            scope: buildRoleStateEventScope(7),
            type: "varOp",
            value: 16,
          },
          {
            key: "hp",
            op: STATE_EVENT_VAR_OP.SUB,
            scope: buildRoleStateEventScope(7),
            type: "varOp",
            value: 2,
          },
          {
            scope: buildRoleStateEventScope(7),
            statusId: "burn",
            type: "statusApply",
          },
          {
            colIndex: 5,
            roleId: 7,
            rowIndex: 4,
            type: "mapTokenUpsert",
          },
        ]),
      ],
      resolver,
    });

    const rows = buildMobileMapStatusRows({
      roomRoles: [createRole(7, "皮卡")],
      runtime,
      tokens: runtime.mapTokens,
    });

    expect(rows).toMatchObject([{
      activeStateLabels: ["燃烧 2T"],
      hp: 15,
      initiative: 16,
      isPlaced: true,
      maxHp: 20,
      name: "皮卡",
      roleId: 7,
    }]);
    expect(buildMobileMapTokenStatusByRoleId(rows)[7]?.text).toBe("先攻 16 · HP 15/20 · 燃烧 2T");
  });

  it("includes state-only roles even when they do not have map tokens", () => {
    const runtime = buildCombatStateRuntime({
      fallbackRoleAbilitiesByRoleId: {
        9: createRoleAbility(9, { ability: { hp: "18", maxHp: "30" } }),
      },
      messages: [
        createStateMessage(1, [{
          key: "hp",
          op: STATE_EVENT_VAR_OP.SET,
          scope: buildRoleStateEventScope(9),
          type: "varOp",
          value: 18,
        }]),
      ],
    });

    const rows = buildMobileMapStatusRows({
      roomRoles: [createRole(9, "未落位角色")],
      runtime,
      tokens: [],
    });

    expect(rows).toMatchObject([{
      activeStateLabels: [],
      hp: 18,
      initiative: null,
      isPlaced: false,
      maxHp: 30,
      name: "未落位角色",
      roleId: 9,
    }]);
  });

  it("returns no rows when runtime has no participant, role variable, or active state", () => {
    const runtime = buildCombatStateRuntime({ messages: [] });

    expect(buildMobileMapStatusRows({
      roomRoles: [createRole(1, "角色")],
      runtime,
      tokens: [{ roleId: 1 }],
    })).toEqual([]);
  });
});
