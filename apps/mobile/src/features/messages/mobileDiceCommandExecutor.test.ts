import type { ChatMessageRequest } from "@tuanchat/openapi-client/models/ChatMessageRequest";
import type { RoleAbility } from "@tuanchat/openapi-client/models/RoleAbility";
import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";
import type { Mock } from "vitest";

import { QueryClient } from "@tanstack/react-query";
import { MESSAGE_TYPE } from "@tuanchat/domain/message-type";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { executeMobileDicerCommand } from "./mobileDiceCommandExecutor";

type SendRoomMessageMutationMock = {
  sendRequest: Mock<(request: ChatMessageRequest) => Promise<{ data: any }>>;
  sendRequests: Mock<(requests: ChatMessageRequest[]) => Promise<Array<{ data: any }>>>;
};

const mobileApiClientMock = vi.hoisted(() => ({
  abilityController: {
    batchGetByRuleAndRoles: vi.fn(),
    setRoleAbility: vi.fn(),
    getRoleAbilityByRule: vi.fn(),
    updateRoleAbilityByRule: vi.fn(),
  },
  roleController: {
    getRole: vi.fn(),
  },
  spaceController: {
    setSpaceExtra: vi.fn(),
  },
}));

vi.mock("../../lib/api", () => ({
  mobileApiClient: mobileApiClientMock,
}));

type ExecuteMobileDicerCommandParams = Parameters<typeof executeMobileDicerCommand>[0];
type TestExecuteMobileDicerCommandParams = Omit<ExecuteMobileDicerCommandParams, "sendRoomMessageMutation"> & {
  sendRoomMessageMutation: SendRoomMessageMutationMock;
};

const actorRole: UserRole = {
  roleId: 10,
  roleName: "调查员",
  type: 0,
  userId: 100,
};

function createMutationMock(): SendRoomMessageMutationMock {
  let nextMessageId = 1000;
  return {
    sendRequest: vi.fn(async (_request: ChatMessageRequest) => ({
      data: {
        content: _request.content ?? "",
        messageId: nextMessageId++,
        messageType: _request.messageType,
        position: 0,
        roomId: _request.roomId,
        status: 0,
        syncId: nextMessageId,
        userId: 100,
      },
    })),
    sendRequests: vi.fn(async (requests: ChatMessageRequest[]) => requests.map(request => ({
      data: {
        content: request.content ?? "",
        messageId: nextMessageId++,
        messageType: request.messageType,
        position: 0,
        roomId: request.roomId,
        status: 0,
        syncId: nextMessageId,
        userId: 100,
      },
    }))),
  };
}

function createParams(overrides: Partial<ExecuteMobileDicerCommandParams> = {}): TestExecuteMobileDicerCommandParams {
  const sendRoomMessageMutation = createMutationMock();
  return {
    command: ".r 1d6",
    messages: [],
    queryClient: new QueryClient(),
    roomId: 20,
    roomRoles: [actorRole],
    ruleId: 1,
    sendIdentity: {
      avatarId: 30,
      roleId: actorRole.roleId,
    },
    sendRoomMessageMutation,
    space: {
      dicerRoleId: 2,
      extra: JSON.stringify({ dicerData: { defaultDice: "100" } }),
      ruleId: 1,
      spaceId: 1,
    },
    ...overrides,
  } as TestExecuteMobileDicerCommandParams;
}

function mockBatchRoleAbility(ability: RoleAbility): void {
  mobileApiClientMock.abilityController.batchGetByRuleAndRoles.mockResolvedValue({
    success: true,
    data: { [String(ability.roleId)]: ability },
  });
}

describe("mobileDiceCommandExecutor", () => {
  beforeEach(() => {
    mobileApiClientMock.abilityController.batchGetByRuleAndRoles.mockResolvedValue({ success: true, data: {} });
    mobileApiClientMock.abilityController.getRoleAbilityByRule.mockResolvedValue({ success: true, data: null });
    mobileApiClientMock.abilityController.setRoleAbility.mockResolvedValue({ data: 99 });
    mobileApiClientMock.abilityController.updateRoleAbilityByRule.mockResolvedValue({ data: {} });
    mobileApiClientMock.roleController.getRole.mockResolvedValue({ data: null });
    mobileApiClientMock.spaceController.setSpaceExtra.mockResolvedValue({ data: {} });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("执行 .r 指令时发送单条 diceTurn 消息", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const params = createParams();

    await executeMobileDicerCommand(params);

    const sentDiceRequest = params.sendRoomMessageMutation.sendRequest.mock.calls[0]?.[0];
    expect(sentDiceRequest).toEqual(expect.objectContaining({
      content: ".r 1d6",
      messageType: MESSAGE_TYPE.DICE,
      roleId: actorRole.roleId,
      extra: expect.objectContaining({
        diceTurn: expect.objectContaining({
          command: ".r 1d6",
          replies: [
            expect.objectContaining({
              content: "掷骰结果：1d6 = 1d6[1] = 1",
              roleId: 2,
            }),
          ],
        }),
      }),
    }));
    expect(params.sendRoomMessageMutation.sendRequests).not.toHaveBeenCalled();
  });

  it("执行 .r # 指令时发送重复掷骰结果", async () => {
    vi.spyOn(Math, "random")
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.99);
    const params = createParams({ command: ".r 3# 1d6" });

    await executeMobileDicerCommand(params);

    const sentDiceRequest = params.sendRoomMessageMutation.sendRequest.mock.calls[0]?.[0];
    expect(sentDiceRequest).toEqual(expect.objectContaining({
      content: ".r 3# 1d6",
      messageType: MESSAGE_TYPE.DICE,
      roleId: actorRole.roleId,
      extra: expect.objectContaining({
        diceTurn: expect.objectContaining({
          command: ".r 3# 1d6",
          replies: [
            expect.objectContaining({
              content: [
                "掷骰3次:",
                "1d6 = 1d6[1] = 1",
                "1d6 = 1d6[4] = 4",
                "1d6 = 1d6[6] = 6",
              ].join("\n"),
              roleId: 2,
            }),
          ],
        }),
      }),
    }));
    expect(params.sendRoomMessageMutation.sendRequests).not.toHaveBeenCalled();
  });

  it("执行 .next 时通过普通命令通路发送状态事件", async () => {
    const params = createParams({ command: ".next" });

    await executeMobileDicerCommand(params);

    expect(params.sendRoomMessageMutation.sendRequest).toHaveBeenCalledWith(expect.objectContaining({
      content: "下一回合",
      messageType: MESSAGE_TYPE.STATE_EVENT,
      roleId: actorRole.roleId,
      extra: {
        stateEvent: {
          source: {
            commandName: "next",
            kind: "command",
            parserVersion: "state-event-v1",
          },
          events: [{ type: "nextTurn" }],
        },
      },
    }));
    expect(params.sendRoomMessageMutation.sendRequests).not.toHaveBeenCalled();
  });

  it("执行 .combat start/end 时通过普通命令通路发送战斗状态事件", async () => {
    const startParams = createParams({ command: ".combat start" });
    const endParams = createParams({ command: ".combat end" });

    await executeMobileDicerCommand(startParams);
    await executeMobileDicerCommand(endParams);

    expect(startParams.sendRoomMessageMutation.sendRequest).toHaveBeenCalledWith(expect.objectContaining({
      content: "战斗开始",
      messageType: MESSAGE_TYPE.STATE_EVENT,
      extra: {
        stateEvent: {
          source: {
            commandName: "combat",
            kind: "command",
            parserVersion: "state-event-v1",
          },
          events: [{ type: "combatRoundStart" }],
        },
      },
    }));
    expect(endParams.sendRoomMessageMutation.sendRequest).toHaveBeenCalledWith(expect.objectContaining({
      content: "战斗结束：回合归零",
      messageType: MESSAGE_TYPE.STATE_EVENT,
      extra: {
        stateEvent: {
          source: {
            commandName: "combat",
            kind: "command",
            parserVersion: "state-event-v1",
          },
          events: [{ type: "combatRoundEnd" }],
        },
      },
    }));
    expect(startParams.sendRoomMessageMutation.sendRequests).not.toHaveBeenCalled();
    expect(endParams.sendRoomMessageMutation.sendRequests).not.toHaveBeenCalled();
  });

  it("角色绑定骰娘优先于空间默认骰娘", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const params = createParams({
      roomRoles: [
        { ...actorRole, extra: { dicerRoleId: "88" } },
        { roleId: 88, roleName: "专属骰娘", type: 1, userId: 200 },
      ],
      space: {
        dicerRoleId: 2,
        extra: JSON.stringify({ dicerRoleId: 77 }),
        ruleId: 1,
        spaceId: 1,
      },
    });

    await executeMobileDicerCommand(params);

    const sentDiceRequest = params.sendRoomMessageMutation.sendRequest.mock.calls[0]?.[0];
    expect(sentDiceRequest?.extra).toEqual(expect.objectContaining({
      diceTurn: expect.objectContaining({
        replies: [
          expect.objectContaining({
            roleId: 88,
          }),
        ],
      }),
    }));
  });

  it("空间禁用角色自定义骰娘时使用空间骰娘", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const params = createParams({
      roomRoles: [
        { ...actorRole, extra: { dicerRoleId: "88" } },
        { roleId: 77, roleName: "空间骰娘", type: 1, userId: 200 },
        { roleId: 88, roleName: "专属骰娘", type: 1, userId: 201 },
      ],
      space: {
        dicerRoleId: 2,
        extra: JSON.stringify({ allowCustomDicerRole: false, dicerRoleId: 77 }),
        ruleId: 1,
        spaceId: 1,
      },
    });

    await executeMobileDicerCommand(params);

    const sentDiceRequest = params.sendRoomMessageMutation.sendRequest.mock.calls[0]?.[0];
    expect(sentDiceRequest?.extra).toEqual(expect.objectContaining({
      diceTurn: expect.objectContaining({
        replies: [
          expect.objectContaining({
            roleId: 77,
          }),
        ],
      }),
    }));
  });

  it("执行 CoC .rc 指令并生成检定回复", async () => {
    vi.spyOn(Math, "random")
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.1);
    mockBatchRoleAbility({
      abilityId: 7,
      roleId: actorRole.roleId,
      ruleId: 1,
      skill: { 侦查: "50" },
    });
    const params = createParams({ command: ".rc 侦查" });

    await executeMobileDicerCommand(params);

    const sentDiceRequest = params.sendRoomMessageMutation.sendRequest.mock.calls[0]?.[0];
    expect(sentDiceRequest).toEqual(expect.objectContaining({
      content: ".rc 侦查",
      messageType: MESSAGE_TYPE.DICE,
      extra: expect.objectContaining({
        diceTurn: expect.objectContaining({
          replies: [
            expect.objectContaining({
              content: "侦查检定：D100=1/50 大成功",
              roleId: 2,
            }),
          ],
        }),
      }),
    }));
    expect(params.sendRoomMessageMutation.sendRequests).not.toHaveBeenCalled();
  });

  it("执行 .st 会保存角色能力并生成状态事件", async () => {
    mockBatchRoleAbility({
      abilityId: 7,
      roleId: actorRole.roleId,
      ruleId: 1,
      skill: { 力量: "50" },
    });
    const params = createParams({ command: ".st 力量+10" });

    await executeMobileDicerCommand(params);

    expect(mobileApiClientMock.abilityController.updateRoleAbilityByRule).toHaveBeenCalledWith(expect.objectContaining({
      roleId: actorRole.roleId,
      ruleId: 1,
      skill: expect.objectContaining({ 力量: "60" }),
    }));
    const sentDiceRequest = params.sendRoomMessageMutation.sendRequest.mock.calls[0]?.[0];
    expect(sentDiceRequest).toEqual(expect.objectContaining({
      content: ".st 力量+10",
      messageType: MESSAGE_TYPE.DICE,
      extra: expect.objectContaining({
        diceTurn: expect.objectContaining({
          replies: [
            expect.objectContaining({
              content: expect.stringContaining("属性设置成功"),
              roleId: 2,
            }),
          ],
        }),
      }),
    }));
    const sentRequests = params.sendRoomMessageMutation.sendRequests.mock.calls[0]?.[0] ?? [];
    expect(sentRequests).toEqual([expect.objectContaining({
      messageType: MESSAGE_TYPE.STATE_EVENT,
      replayMessageId: 1000,
    })]);
  });

  it("执行 .st 写角色卡失败时不发送 STATE_EVENT", async () => {
    mockBatchRoleAbility({
      abilityId: 7,
      roleId: actorRole.roleId,
      ruleId: 1,
      skill: { 力量: "50" },
    });
    mobileApiClientMock.abilityController.updateRoleAbilityByRule.mockRejectedValue(new Error("写入失败"));
    const params = createParams({ command: ".st 力量+10" });

    await expect(executeMobileDicerCommand(params)).rejects.toThrow("写入失败");

    expect(params.sendRoomMessageMutation.sendRequest).not.toHaveBeenCalled();
    expect(params.sendRoomMessageMutation.sendRequests).not.toHaveBeenCalled();
  });

  it("执行 .st 读取角色能力业务失败时不降级成空角色卡", async () => {
    mobileApiClientMock.abilityController.batchGetByRuleAndRoles.mockResolvedValue({
      success: false,
      errMsg: "能力读取失败",
      data: null,
    });
    const params = createParams({ command: ".st 力量+10" });

    await expect(executeMobileDicerCommand(params)).rejects.toThrow("能力读取失败");

    expect(mobileApiClientMock.abilityController.updateRoleAbilityByRule).not.toHaveBeenCalled();
    expect(params.sendRoomMessageMutation.sendRequest).not.toHaveBeenCalled();
    expect(params.sendRoomMessageMutation.sendRequests).not.toHaveBeenCalled();
  });

  it("执行 .st show 有 UI 回调时不发送消息并打开属性卡模型", async () => {
    mockBatchRoleAbility({
      abilityId: 7,
      roleId: actorRole.roleId,
      ruleId: 1,
      basic: { 力量: "50" },
      skill: { 侦查: "60" },
    });
    const onShowRoleAbilityCard = vi.fn();
    const params = createParams({
      command: ".st show",
      onShowRoleAbilityCard,
    });

    await executeMobileDicerCommand(params);

    expect(params.sendRoomMessageMutation.sendRequest).not.toHaveBeenCalled();
    expect(params.sendRoomMessageMutation.sendRequests).not.toHaveBeenCalled();
    expect(onShowRoleAbilityCard).toHaveBeenCalledWith({
      roleName: "调查员",
      sections: [
        {
          title: "基础",
          rows: [{ key: "力量", value: "50" }],
        },
        {
          title: "技能",
          rows: [{ key: "侦查", value: "60" }],
        },
      ],
    });
  });

  it("执行 .st show 没有 UI 回调时保留文本降级回复", async () => {
    mockBatchRoleAbility({
      abilityId: 7,
      roleId: actorRole.roleId,
      ruleId: 1,
      skill: { 侦查: "60" },
    });
    const params = createParams({ command: ".st show 侦查" });

    await executeMobileDicerCommand(params);

    const sentDiceRequest = params.sendRoomMessageMutation.sendRequest.mock.calls[0]?.[0];
    expect(sentDiceRequest).toEqual(expect.objectContaining({
      content: ".st show 侦查",
      messageType: MESSAGE_TYPE.DICE,
      extra: expect.objectContaining({
        diceTurn: expect.objectContaining({
          replies: [
            expect.objectContaining({
              content: "调查员的属性卡\n\n【技能】\n侦查: 60",
            }),
          ],
        }),
      }),
    }));
    expect(params.sendRoomMessageMutation.sendRequests).not.toHaveBeenCalled();
  });

  it("未知指令会发送执行错误回复", async () => {
    const params = createParams({ command: ".notexist" });

    await executeMobileDicerCommand(params);

    const sentDiceRequest = params.sendRoomMessageMutation.sendRequest.mock.calls[0]?.[0];
    expect(sentDiceRequest).toEqual(expect.objectContaining({
      content: ".notexist",
      messageType: MESSAGE_TYPE.DICE,
      extra: expect.objectContaining({
        diceTurn: expect.objectContaining({
          replies: [
            expect.objectContaining({
              content: expect.stringContaining("执行错误"),
            }),
          ],
        }),
      }),
    }));
    expect(params.sendRoomMessageMutation.sendRequests).not.toHaveBeenCalled();
  });
});
