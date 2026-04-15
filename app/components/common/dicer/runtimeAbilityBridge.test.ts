import { describe, expect, it } from "vitest";

import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import type { ChatMessageResponse, RoleAbility } from "../../../../api";

import { buildRuntimeRoleValuesByRoleId, mergeRuntimeRoleValuesIntoAbility } from "./runtimeAbilityBridge";

function createStateEventMessage(
  messageId: number,
  roleId: number,
  key: string,
  value: number,
): ChatMessageResponse {
  return {
    message: {
      messageId,
      syncId: messageId,
      roomId: 1,
      userId: 2,
      roleId,
      content: `.st ${key} ${value}`,
      status: 0,
      messageType: MESSAGE_TYPE.STATE_EVENT,
      position: messageId,
      extra: {
        stateEvent: {
          source: {
            kind: "command",
            commandName: "st",
            parserVersion: "state-event-v1",
          },
          events: [{
            type: "varOp",
            scope: {
              kind: "role",
              roleId,
            },
            key,
            op: "set",
            value,
          }],
        },
      },
      createTime: "2026-04-14 13:00:00",
      updateTime: "2026-04-14 13:00:00",
    },
  };
}

describe("runtimeAbilityBridge", () => {
  it("会把运行态数值补到空能力对象上，供旧骰子系统读取", () => {
    const merged = mergeRuntimeRoleValuesIntoAbility({}, { 设计: 20 });

    expect(merged.skill).toEqual({ 设计: "20" });
  });

  it("会从房间 STATE_EVENT 中解析目标角色当前数值", () => {
    const roleId = 9;
    const fallbackRoleAbilitiesByRoleId: Record<number, RoleAbility | null | undefined> = {
      [roleId]: {},
    };

    const runtimeValuesByRoleId = buildRuntimeRoleValuesByRoleId([
      createStateEventMessage(1, roleId, "设计", 20),
    ], fallbackRoleAbilitiesByRoleId);

    expect(runtimeValuesByRoleId[roleId]).toEqual({ 设计: 20 });
    expect(mergeRuntimeRoleValuesIntoAbility({}, runtimeValuesByRoleId[roleId]).skill).toEqual({
      设计: "20",
    });
  });
});
