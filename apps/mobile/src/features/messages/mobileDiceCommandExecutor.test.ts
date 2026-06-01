import type { Mock } from "vitest";

import { QueryClient } from "@tanstack/react-query";
import { MESSAGE_TYPE } from "@tuanchat/domain/message-type";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ChatMessageRequest } from "@tuanchat/openapi-client/models/ChatMessageRequest";
import type { RoleAbility } from "@tuanchat/openapi-client/models/RoleAbility";
import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import { executeMobileDicerCommand } from "./mobileDiceCommandExecutor";

type SendRoomMessageMutationMock = {
  sendRequest: Mock<(request: ChatMessageRequest) => Promise<{ data: any }>>;
  sendRequests: Mock<(requests: ChatMessageRequest[]) => Promise<Array<{ data: any }>>>;
};

const mobileApiClientMock = vi.hoisted(() => ({
  abilityController: {
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

describe("mobileDiceCommandExecutor", () => {
  beforeEach(() => {
    mobileApiClientMock.abilityController.getRoleAbilityByRule.mockResolvedValue({ data: null });
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
        diceResult: expect.objectContaining({
          result: "掷骰结果：1d6 = 1d6[1] = 1",
        }),
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
    mobileApiClientMock.abilityController.getRoleAbilityByRule.mockResolvedValue({
      data: {
        abilityId: 7,
        roleId: actorRole.roleId,
        ruleId: 1,
        skill: { 侦查: "50" },
      } satisfies RoleAbility,
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
    mobileApiClientMock.abilityController.getRoleAbilityByRule.mockResolvedValue({
      data: {
        abilityId: 7,
        roleId: actorRole.roleId,
        ruleId: 1,
        skill: { 力量: "50" },
      } satisfies RoleAbility,
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

  it("执行 .st show 有 UI 回调时不发送消息并打开属性卡模型", async () => {
    mobileApiClientMock.abilityController.getRoleAbilityByRule.mockResolvedValue({
      data: {
        abilityId: 7,
        roleId: actorRole.roleId,
        ruleId: 1,
        basic: { 力量: "50" },
        skill: { 侦查: "60" },
      } satisfies RoleAbility,
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
    mobileApiClientMock.abilityController.getRoleAbilityByRule.mockResolvedValue({
      data: {
        abilityId: 7,
        roleId: actorRole.roleId,
        ruleId: 1,
        skill: { 侦查: "60" },
      } satisfies RoleAbility,
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
