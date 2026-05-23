import { afterEach, describe, expect, it, vi } from "vitest";

import { MessageType } from "../../../../../api/wsModels";
import {
  ALL_INITIATIVE_COMBAT_CONTENT,
  END_COMBAT_CONTENT,
  buildAllInitiativeCombatMessageRequest,
  buildAllInitiativeRollEvents,
  buildEndCombatMessageRequest,
} from "./initiativeCommandRequest";

describe("initiativeCommandRequest", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("构建全员先攻聚合状态消息", () => {
    vi.spyOn(Math, "random")
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0);

    expect(buildAllInitiativeCombatMessageRequest({
      roomId: 12,
      roleId: 34,
      avatarId: 56,
      ruleId: 2,
      currentList: [{
        participantId: "manual:guard",
        name: "守卫",
        value: 9,
      }],
      importableRoles: [
        { roleId: 1, roleName: "艾拉" },
        { roleId: 2, roleName: "博恩" },
      ],
      abilityQueries: [
        {
          data: {
            success: true,
            data: [{ ruleId: 2, skill: { 先攻: "5" }, basic: { 敏捷: "10" } }],
          },
        },
        {
          data: {
            success: true,
            data: [{ ruleId: 2, basic: { 敏捷: "14" } }],
          },
        },
      ],
    })).toEqual({
      roomId: 12,
      roleId: 34,
      avatarId: 56,
      content: ALL_INITIATIVE_COMBAT_CONTENT,
      messageType: MessageType.STATE_EVENT,
      extra: {
        stateEvent: {
          source: {
            kind: "ui",
            parserVersion: "state-event-v1",
          },
          events: [
            {
              type: "combatParticipantUpsert",
              participantId: "role:1",
              roleId: 1,
              name: "艾拉",
              initiative: 16,
            },
            {
              type: "combatParticipantUpsert",
              participantId: "role:2",
              roleId: 2,
              name: "博恩",
              initiative: 3,
            },
            {
              type: "combatOrderSet",
              participantIds: ["role:1", "manual:guard", "role:2"],
            },
          ],
        },
      },
    });
  });

  it("构建结束战斗聚合状态消息", () => {
    expect(buildEndCombatMessageRequest({
      roomId: 12,
      roleId: 34,
      avatarId: 56,
    })).toEqual({
      roomId: 12,
      roleId: 34,
      avatarId: 56,
      content: END_COMBAT_CONTENT,
      messageType: MessageType.STATE_EVENT,
      extra: {
        stateEvent: {
          source: {
            kind: "ui",
            parserVersion: "state-event-v1",
          },
          events: [
            {
              type: "combatRoundEnd",
            },
          ],
        },
      },
    });
  });

  it("角色卡规则不匹配时拒绝生成聚合消息", () => {
    expect(() => buildAllInitiativeRollEvents({
      ruleId: 2,
      currentList: [],
      importableRoles: [{ roleId: 1, roleName: "艾拉" }],
      abilityQueries: [{
        data: {
          success: true,
          data: [{ ruleId: 7, basic: { 敏捷: "14" } }],
        },
      }],
    })).toThrow("导入失败：请检查角色卡规则与空间设置的规则是否一致");
  });
});
