import { describe, expect, it } from "vitest";

import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import type { ChatMessageResponse, RoleAbility } from "../../../../api";

import { buildRuntimeRoleValuesByRoleId, buildRuntimeStateValues, mergeRuntimeRoleValuesIntoAbility } from "./runtimeAbilityBridge";

function createStateEventMessage(
  messageId: number,
  scope: { kind: "room" } | { kind: "role"; roleId: number },
  key: string,
  value: number,
): ChatMessageResponse {
  return {
    message: {
      messageId,
      syncId: messageId,
      roomId: 1,
      userId: 2,
      roleId: scope.kind === "role" ? scope.roleId : 2,
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
            scope,
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

  it("注入房间级共享变量时不会覆盖已有角色字段", () => {
    const merged = mergeRuntimeRoleValuesIntoAbility({
      skill: {
        设计: "70",
      },
    }, {
      设计: 20,
      难度: 15,
    }, {
      overrideExisting: false,
    });

    expect(merged.skill).toEqual({
      设计: "70",
      难度: "15",
    });
  });

  it("会从房间 STATE_EVENT 中解析目标角色当前数值", () => {
    const roleId = 9;
    const fallbackRoleAbilitiesByRoleId: Record<number, RoleAbility | null | undefined> = {
      [roleId]: {},
    };

    const runtimeValuesByRoleId = buildRuntimeRoleValuesByRoleId([
      createStateEventMessage(1, { kind: "role", roleId }, "设计", 20),
    ], fallbackRoleAbilitiesByRoleId);

    expect(runtimeValuesByRoleId[roleId]).toEqual({ 设计: 20 });
    expect(mergeRuntimeRoleValuesIntoAbility({}, runtimeValuesByRoleId[roleId]).skill).toEqual({
      设计: "20",
    });
  });

  it("会暴露房间级 STATE_EVENT 数值，供旧骰子命令读取共享变量", () => {
    const runtimeStateValues = buildRuntimeStateValues([
      createStateEventMessage(1, { kind: "room" }, "难度", 15),
    ], {});

    expect(runtimeStateValues.room).toEqual({ 难度: 15 });
    expect(mergeRuntimeRoleValuesIntoAbility({}, runtimeStateValues.room, { overrideExisting: false }).skill).toEqual({
      难度: "15",
    });
  });
});
