import { describe, expect, it, vi } from "vitest";

import { MessageType } from "../../../../../api/wsModels";
import {
  ALL_INITIATIVE_COMMAND,
  buildEndCombatMessageRequest,
  END_COMBAT_CONTENT,
  executeAllInitiativeRolls,
} from "./initiativeCommandRequest";

describe("initiativeCommandRequest", () => {
  it("为每个角色直接执行先攻指令", async () => {
    const executeCommand = vi.fn();

    await expect(executeAllInitiativeRolls({
      executeCommand,
      roles: [
        { roleId: 1, roleName: "艾拉" },
        { roleId: 2, roleName: "博恩" },
      ] as any,
    })).resolves.toBe(2);

    expect(executeCommand).toHaveBeenCalledTimes(1);
    expect(executeCommand).toHaveBeenCalledWith({
      command: ALL_INITIATIVE_COMMAND,
      mentionedRoles: [
        { roleId: 1, roleName: "艾拉" },
        { roleId: 2, roleName: "博恩" },
      ],
      originMessage: ALL_INITIATIVE_COMMAND,
    });
  });

  it("没有可投掷角色时拒绝执行全员先攻", async () => {
    await expect(executeAllInitiativeRolls({
      executeCommand: vi.fn(),
      roles: [],
    })).rejects.toThrow("暂无可投掷先攻的角色");
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
});
