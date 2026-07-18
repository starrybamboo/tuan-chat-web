import { patchInsertMessages } from "@tuanchat/query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { IMPORT_SPECIAL_ROLE_ID } from "@/components/chat/utils/importChatText";

import { tuanchat } from "../../../../api/instance";
import { MessageType } from "../../../../api/wsModels";
import { buildInitialImportChatRequests, buildInitialImportRoomMemberAddRequest, buildInitialImportRoomRoleAddRequests, sendInitialImportChatMessages } from "./initialChatImport";

vi.mock("@tuanchat/query", () => ({
  patchInsertMessages: vi.fn(),
}));

vi.mock("../../../../api/instance", () => ({
  tuanchat: {
    avatarController: {
      getRoleAvatars: vi.fn().mockResolvedValue({ data: [] }),
    },
    roomMemberController: {
      addMember1: vi.fn(),
    },
    roomRoleController: {
      addRole: vi.fn(),
    },
  },
}));

describe("buildInitialImportChatRequests", () => {
  it("把 CQ 图片码导入成外链图片消息", () => {
    const [request] = buildInitialImportChatRequests(1, [{
      roleId: 2,
      speakerName: "旅人",
      content: "从前有一座房子 [CQ:image,file=house.image,url=https://gchat.qpic.cn/a/0?term=2,subType=1]",
    }], [{ roleId: 2, roleName: "旅人", avatarId: 3 } as any]);

    expect(request).toMatchObject({
      roomId: 1,
      roleId: 2,
      avatarId: 3,
      content: "从前有一座房子",
      messageType: MessageType.IMG,
      customRoleName: "旅人",
      extra: {
        imageMessage: {
          source: {
            kind: "external",
            url: "https://gchat.qpic.cn/a/0?term=2,subType=1",
            provider: "cq",
          },
          fileName: "house.image",
          width: 1,
          height: 1,
          background: false,
        },
      },
    });
  });

  it("把 CQ 视频码导入成外链视频消息", () => {
    const [request] = buildInitialImportChatRequests(1, [{
      roleId: 2,
      speakerName: "旅人",
      content: "片段 [CQ:video,file=clip.mp4,url=https://example.com/clip.mp4]",
    }], [{ roleId: 2, roleName: "旅人", avatarId: 3 } as any]);

    expect(request).toMatchObject({
      roomId: 1,
      roleId: 2,
      avatarId: 3,
      content: "片段",
      messageType: MessageType.VIDEO,
      extra: {
        videoMessage: {
          source: {
            kind: "external",
            url: "https://example.com/clip.mp4",
            provider: "cq",
          },
          fileName: "clip.mp4",
        },
      },
    });
  });

  it("没有 URL 的 CQ 视频码不会导入成空视频消息", () => {
    const [request] = buildInitialImportChatRequests(1, [{
      roleId: 2,
      content: "[CQ:video,file=clip.mp4]",
    }], [{ roleId: 2, roleName: "旅人", avatarId: 3 } as any]);

    expect(request).toMatchObject({
      content: "[CQ:video,file=clip.mp4]",
      messageType: MessageType.TEXT,
      extra: {},
    });
  });

  it("把导入的骰子指令和骰娘回复合并项导入成 diceTurn", () => {
    const [request] = buildInitialImportChatRequests(1, [{
      roleId: 2,
      speakerName: "木落",
      content: ".ra 灵感",
      diceTurn: {
        dicerSpeakerName: "海豹一号机",
        replyContent: "由于a 灵感，<木落>掷出了 D20=5",
      },
    }], [{ roleId: 2, roleName: "木落", avatarId: 3 } as any]);

    expect(request).toMatchObject({
      roomId: 1,
      roleId: 2,
      avatarId: 3,
      content: ".ra 灵感",
      messageType: MessageType.DICE,
      customRoleName: "木落",
      extra: {
        diceTurn: {
          command: ".ra 灵感",
          replies: [{
            content: "由于a 灵感，<木落>掷出了 D20=5",
            roleId: 2,
            customRoleName: "海豹一号机",
          }],
        },
      },
    });
  });
});

describe("buildInitialImportRoomRoleAddRequests", () => {
  it("按角色类型生成房间角色同步请求，旁白不进入房间角色", () => {
    const requests = buildInitialImportRoomRoleAddRequests(7, [
      { roleId: 10, content: "你好" },
      { roleId: 20, content: "我在暗处" },
      { roleId: IMPORT_SPECIAL_ROLE_ID.NARRATOR, content: "旁白" },
      { roleId: IMPORT_SPECIAL_ROLE_ID.DICER, content: "检定结果" },
    ], [
      { roleId: 10, roleName: "调查员", type: 0 } as any,
      { roleId: 20, roleName: "店主", type: 2 } as any,
    ]);

    expect(requests).toEqual([
      { roomId: 7, roleIdList: [10], type: 0 },
      { roomId: 7, roleIdList: [20], type: 2 },
      { roomId: 7, roleIdList: [2], type: 1 },
    ]);
  });

  it("导入骰子回合时会补系统骰娘角色", () => {
    const requests = buildInitialImportRoomRoleAddRequests(7, [{
      roleId: 10,
      content: ".ra 灵感",
      diceTurn: {
        dicerSpeakerName: "海豹一号机",
        replyContent: "D20=5",
      },
    }], [{ roleId: 10, roleName: "调查员" } as any]);

    expect(requests).toEqual([
      { roomId: 7, roleIdList: [10], type: 0 },
      { roomId: 7, roleIdList: [2], type: 1 },
    ]);
  });
});

describe("buildInitialImportRoomMemberAddRequest", () => {
  it("从普通导入角色的 owner 同步房间成员，跳过 NPC 和骰娘", () => {
    const request = buildInitialImportRoomMemberAddRequest(7, [
      { roleId: 10, content: "你好" },
      { roleId: 20, content: "我在暗处" },
      { roleId: IMPORT_SPECIAL_ROLE_ID.DICER, content: "检定结果" },
    ], [
      { roleId: 10, userId: 101, roleName: "调查员", type: 0 } as any,
      { roleId: 20, userId: 202, roleName: "店主", type: 2 } as any,
      { roleId: 2, userId: 303, roleName: "骰娘", type: 1 } as any,
    ]);

    expect(request).toEqual({
      roomId: 7,
      userIdList: [101],
    });
  });
});

describe("sendInitialImportChatMessages", () => {
  beforeEach(() => {
    vi.mocked(patchInsertMessages).mockReset();
    vi.mocked(tuanchat.roomMemberController.addMember1).mockReset();
    vi.mocked(tuanchat.roomRoleController.addRole).mockReset();
    vi.mocked(tuanchat.roomRoleController.addRole).mockResolvedValue({ success: true } as any);
    vi.mocked(patchInsertMessages).mockResolvedValue({ success: true } as any);
    vi.mocked(tuanchat.roomMemberController.addMember1).mockResolvedValue({ success: true } as any);
  });

  it("先同步房间成员和角色，再批量插入初始导入消息", async () => {
    await sendInitialImportChatMessages(7, [{
      roleId: 10,
      speakerName: "调查员",
      content: "我推门进去",
    }, {
      roleId: 20,
      speakerName: "店主",
      content: "欢迎",
    }], [
      { roleId: 10, userId: 101, roleName: "调查员", avatarId: 101, type: 0 } as any,
      { roleId: 20, userId: 202, roleName: "店主", avatarId: 201, type: 2 } as any,
    ]);

    expect(tuanchat.roomMemberController.addMember1).toHaveBeenCalledWith({
      roomId: 7,
      userIdList: [101],
    });
    expect(tuanchat.roomRoleController.addRole).toHaveBeenNthCalledWith(1, {
      roomId: 7,
      roleIdList: [10],
      type: 0,
    });
    expect(tuanchat.roomRoleController.addRole).toHaveBeenNthCalledWith(2, {
      roomId: 7,
      roleIdList: [20],
      type: 2,
    });
    expect(patchInsertMessages).toHaveBeenCalledTimes(1);
    expect(vi.mocked(tuanchat.roomMemberController.addMember1).mock.invocationCallOrder[0])
      .toBeLessThan(vi.mocked(tuanchat.roomRoleController.addRole).mock.invocationCallOrder[0]);
    expect(vi.mocked(tuanchat.roomRoleController.addRole).mock.invocationCallOrder[1])
      .toBeLessThan(vi.mocked(patchInsertMessages).mock.invocationCallOrder[0]);
  });

  it("通知初始导入进度", async () => {
    const onProgress = vi.fn();

    await sendInitialImportChatMessages(7, [{
      roleId: 10,
      speakerName: "调查员",
      content: "我推门进去",
    }, {
      roleId: 10,
      speakerName: "调查员",
      content: "房间里很暗",
    }], [
      { roleId: 10, userId: 101, roleName: "调查员", avatarId: 101, type: 0 } as any,
    ], onProgress);

    expect(onProgress).toHaveBeenNthCalledWith(1, 0, 2);
    expect(onProgress).toHaveBeenNthCalledWith(2, 2, 2);
  });
});
