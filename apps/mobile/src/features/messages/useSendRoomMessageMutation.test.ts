import { QueryClient } from "@tanstack/react-query";
import {
  STATE_EVENT_PARSER_VERSION,
  STATE_EVENT_SCOPE_KIND,
  STATE_EVENT_SOURCE_KIND,
  STATE_EVENT_VAR_OP,
} from "@tuanchat/domain/state-event";
import { describe, expect, it } from "vitest";

import type { RoleAbility } from "@tuanchat/openapi-client/models/RoleAbility";

import {
  roleAbilityByRuleQueryKey,
  roleAbilityListQueryKey,
} from "@tuanchat/query/role-abilities";

import { mergeStateEventRoleVarSnapshots, setChangedRoleAbilityCaches } from "./sendRoomMessageMutationHelpers";

describe("useSendRoomMessageMutation 状态事件一致性 helper", () => {
  it("角色变量写回后同步 by-rule 和列表能力缓存", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData<RoleAbility[]>(roleAbilityListQueryKey(10), [{
      roleId: 10,
      ruleId: 1,
      skill: { hp: "5" },
    }]);

    setChangedRoleAbilityCaches(queryClient, [{
      ability: {
        roleId: 10,
        ruleId: 1,
        skill: { hp: "8" },
      },
      roleId: 10,
      ruleId: 1,
    }, {
      ability: {
        skill: { san: "60" },
      },
      roleId: 10,
      ruleId: 2,
    }]);

    expect(queryClient.getQueryData(roleAbilityByRuleQueryKey(10, 1))).toEqual({
      roleId: 10,
      ruleId: 1,
      skill: { hp: "8" },
    });
    expect(queryClient.getQueryData(roleAbilityByRuleQueryKey(10, 2))).toEqual({
      roleId: 10,
      ruleId: 2,
      skill: { san: "60" },
    });
    expect(queryClient.getQueryData<RoleAbility[]>(roleAbilityListQueryKey(10))).toEqual([
      {
        roleId: 10,
        ruleId: 1,
        skill: { hp: "8" },
      },
      {
        roleId: 10,
        ruleId: 2,
        skill: { san: "60" },
      },
    ]);
  });

  it("发送 STATE_EVENT 前合并角色变量 before/after 快照", () => {
    const event = {
      key: "hp",
      op: STATE_EVENT_VAR_OP.SUB,
      scope: {
        kind: STATE_EVENT_SCOPE_KIND.ROLE,
        roleId: 10,
      },
      type: "varOp",
      value: 2,
    } as const;

    const result = mergeStateEventRoleVarSnapshots({
      events: [event],
      source: {
        commandName: "st",
        kind: STATE_EVENT_SOURCE_KIND.COMMAND,
        parserVersion: STATE_EVENT_PARSER_VERSION,
      },
    }, [{
      ...event,
      afterValue: 8,
      beforeValue: 10,
    }]);

    expect(result.events[0]).toEqual({
      ...event,
      afterValue: 8,
      beforeValue: 10,
    });
  });
});
