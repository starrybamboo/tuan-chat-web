import type { ChatMessageRequest } from "@tuanchat/openapi-client/models/ChatMessageRequest";
import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";
import type { RoleAbility } from "@tuanchat/openapi-client/models/RoleAbility";

import { QueryClient } from "@tanstack/react-query";
import { MESSAGE_TYPE } from "@tuanchat/domain/message-type";
import {
  STATE_EVENT_PARSER_VERSION,
  STATE_EVENT_SCOPE_KIND,
  STATE_EVENT_SOURCE_KIND,
  STATE_EVENT_VAR_OP,
} from "@tuanchat/domain/state-event";
import {
  roleAbilityByRuleQueryKey,
  roleAbilityListQueryKey,
} from "@tuanchat/query/role-abilities";
import { describe, expect, it } from "vitest";

import {
  withStableRoomMessagePosition,
  withStableRoomMessagePositions,
} from "./roomMessagePosition";
import { mergeStateEventRoleVarSnapshots, setChangedRoleAbilityCaches } from "./sendRoomMessageMutationHelpers";

function createRoomMessage(
  messageId: number,
  position: number,
  overrides: Partial<ChatMessageResponse["message"]> = {},
): ChatMessageResponse {
  return {
    message: {
      content: `message-${messageId}`,
      extra: {},
      messageId,
      messageType: MESSAGE_TYPE.TEXT,
      position,
      roomId: 9,
      status: 0,
      syncId: messageId,
      userId: 7,
      ...overrides,
    },
  };
}

function createRequest(overrides: Partial<ChatMessageRequest> = {}): ChatMessageRequest {
  return {
    content: "hello",
    extra: {},
    messageType: MESSAGE_TYPE.TEXT,
    roomId: 9,
    ...overrides,
  };
}

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

describe("useSendRoomMessageMutation 消息 position", () => {
  it("单条发送会基于当前完整消息列表补齐稳定 position", () => {
    const request = createRequest();
    const currentMessages = [
      createRoomMessage(1, 1),
      createRoomMessage(2, 42),
    ];

    const result = withStableRoomMessagePosition(request, currentMessages);

    expect(result).toEqual({
      ...request,
      position: 43,
    });
    expect(request.position).toBeUndefined();
  });

  it("保留调用方显式传入的 position", () => {
    const request = createRequest({ position: 12.5 });

    expect(withStableRoomMessagePosition(request, [createRoomMessage(1, 42)])).toBe(request);
  });

  it("批量发送会为缺失 position 的请求连续补位，并跳过已有 position", () => {
    const requests = [
      createRequest({ content: "a" }),
      createRequest({ content: "b", position: 50 }),
      createRequest({ content: "c" }),
    ];

    const result = withStableRoomMessagePositions(requests, [
      createRoomMessage(1, 40),
    ]);

    expect(result.map(request => request.position)).toEqual([41, 50, 51]);
    expect(result[1]).toBe(requests[1]);
  });
});
