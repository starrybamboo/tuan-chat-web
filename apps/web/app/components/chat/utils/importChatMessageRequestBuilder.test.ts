import { describe, expect, it } from "vitest";

import { MessageType } from "../../../../api/wsModels";
import { buildImportedChatMessageRequests } from "./importChatMessageRequestBuilder";
import { IMPORT_SPECIAL_ROLE_ID } from "./importChatText";

describe("buildImportedChatMessageRequests", () => {
  it("透传增强导入消息的 avatarId、messageType、annotations、extra 和 webgal", () => {
    const [request] = buildImportedChatMessageRequests([
      {
        roleId: 3,
        avatarId: 99,
        speakerName: "丰聪耳神子",
        content: "",
        messageType: MessageType.SOUND,
        annotations: ["sys:bgm"],
        extra: {
          soundMessage: {
            source: { kind: "internal", fileId: 9201 },
            fileName: "battle.mp3",
            size: 1234,
            purpose: "bgm",
          },
        } as any,
        webgal: { wait: 1 },
      },
    ], {
      roomId: 1,
      resolveAvatarId: () => 7,
    });

    expect(request).toMatchObject({
      roomId: 1,
      roleId: 3,
      avatarId: 99,
      content: "",
      customRoleName: "丰聪耳神子",
      messageType: MessageType.SOUND,
      annotations: ["sys:bgm"],
      extra: {
        soundMessage: {
          source: { kind: "internal", fileId: 9201 },
          fileName: "battle.mp3",
          size: 1234,
          purpose: "bgm",
        },
      },
      webgal: { wait: 1 },
    });
  });

  it("统一把导入骰娘消息构建成 DICE 请求且不写入 avatarId=0", () => {
    const [request] = buildImportedChatMessageRequests([
      {
        roleId: IMPORT_SPECIAL_ROLE_ID.DICER,
        speakerName: "海豹一号机",
        content: "由于a 灵感，<木落>掷出了 D20=5",
      },
    ], {
      roomId: 1,
      dicerRoleId: 1000,
      dicerAvatarId: 0,
      resolveAvatarId: () => -1,
    });

    expect(request).toMatchObject({
      roomId: 1,
      roleId: 1000,
      avatarId: -1,
      content: "由于a 灵感，<木落>掷出了 D20=5",
      customRoleName: "海豹一号机",
      messageType: MessageType.DICE,
      extra: {
        diceResult: {
          result: "由于a 灵感，<木落>掷出了 D20=5",
        },
      },
    });
  });

  it("统一把导入的骰子指令和骰娘回复构建成 diceTurn", () => {
    const [request] = buildImportedChatMessageRequests([
      {
        roleId: 3,
        speakerName: "木落",
        content: ".ra 灵感",
        diceTurn: {
          dicerSpeakerName: "海豹一号机",
          replyContent: "由于a 灵感，<木落>掷出了 D20=5",
        },
      },
    ], {
      roomId: 1,
      dicerRoleId: 1000,
      dicerAvatarId: 0,
      resolveAvatarId: () => 7,
    });

    expect(request).toMatchObject({
      roleId: 3,
      avatarId: 7,
      content: ".ra 灵感",
      customRoleName: "木落",
      messageType: MessageType.DICE,
      extra: {
        diceTurn: {
          command: ".ra 灵感",
          replies: [{
            content: "由于a 灵感，<木落>掷出了 D20=5",
            roleId: 1000,
            customRoleName: "海豹一号机",
          }],
        },
      },
    });
    expect((request.extra as any).diceTurn.replies[0]).not.toHaveProperty("avatarId");
  });

  it("导入 diceTurn 的多条骰娘回复时保留 replies 数组", () => {
    const [request] = buildImportedChatMessageRequests([
      {
        roleId: 3,
        speakerName: "木落",
        content: "【2#1d10：】",
        diceTurn: {
          dicerSpeakerName: "海豹一号机",
          replyContent: "【1d10:2】；2 行动\n【1d10:1】；1 观察",
          replyContents: [
            "【1d10:2】；2 行动",
            "【1d10:1】；1 观察",
          ],
        },
      },
    ], {
      roomId: 1,
      dicerRoleId: 1000,
      dicerAvatarId: 0,
      resolveAvatarId: () => 7,
    });

    expect(request).toMatchObject({
      roleId: 3,
      avatarId: 7,
      content: "【2#1d10：】",
      customRoleName: "木落",
      messageType: MessageType.DICE,
      extra: {
        diceTurn: {
          command: "【2#1d10：】",
          replies: [
            {
              content: "【1d10:2】；2 行动",
              roleId: 1000,
              customRoleName: "海豹一号机",
            },
            {
              content: "【1d10:1】；1 观察",
              roleId: 1000,
              customRoleName: "海豹一号机",
            },
          ],
        },
      },
    });
  });

  it("导入 diceTurn 时会按骰娘回复里的成功失败匹配骰娘立绘", () => {
    const [successRequest] = buildImportedChatMessageRequests([
      {
        roleId: 3,
        content: ".ra 灵感",
        diceTurn: {
          dicerSpeakerName: "海豹一号机",
          replyContent: "灵感检定：D100=12/60 成功",
        },
      },
    ], {
      roomId: 1,
      dicerRoleId: 1000,
      dicerAvatarId: 1001,
      dicerAvatars: [
        { avatarId: 1001, avatarTitle: { label: "默认" } },
        { avatarId: 1002, avatarTitle: { label: "成功" } },
        { avatarId: 1003, avatarTitle: { label: "失败" } },
      ],
      resolveAvatarId: () => 7,
    });

    expect((successRequest.extra as any).diceTurn.replies[0].avatarId).toBe(1002);
  });

  it("导入骰娘直发消息时优先使用显式标签匹配立绘", () => {
    const [request] = buildImportedChatMessageRequests([
      {
        roleId: IMPORT_SPECIAL_ROLE_ID.DICER,
        content: "灵感检定：D100=99/60 大失败 #慌张#",
      },
    ], {
      roomId: 1,
      dicerRoleId: 1000,
      dicerAvatarId: 1001,
      dicerAvatars: [
        { avatarId: 1001, avatarTitle: { label: "默认" } },
        { avatarId: 1002, avatarTitle: { label: "大失败" } },
        { avatarId: 1003, avatarTitle: { label: "慌张" } },
      ],
      resolveAvatarId: () => -1,
    });

    expect(request.avatarId).toBe(1003);
  });

  it("骰娘独立发言不构建成 DICE 结果消息", () => {
    const [request] = buildImportedChatMessageRequests([
      {
        roleId: IMPORT_SPECIAL_ROLE_ID.DICER,
        speakerName: "海豹一号机",
        content: "记录模块已经启动。",
      },
    ], {
      roomId: 1,
      dicerRoleId: 1000,
      dicerAvatarId: 1001,
      resolveAvatarId: () => -1,
    });

    expect(request).toMatchObject({
      roomId: 1,
      roleId: 1000,
      avatarId: 1001,
      content: "记录模块已经启动。",
      customRoleName: "海豹一号机",
      messageType: MessageType.TEXT,
      extra: {},
    });
  });

  it("统一把 CQ 图片构建成外链图片消息", () => {
    const [request] = buildImportedChatMessageRequests([
      {
        roleId: 3,
        speakerName: "木落",
        content: "从前有一座房子 [CQ:image,file=house.image,url=https://example.com/house.image]",
      },
    ], {
      roomId: 1,
      resolveAvatarId: () => 7,
    });

    expect(request).toMatchObject({
      roleId: 3,
      avatarId: 7,
      content: "从前有一座房子",
      customRoleName: "木落",
      messageType: MessageType.IMG,
      extra: {
        imageMessage: {
          source: {
            kind: "external",
            url: "https://example.com/house.image",
            provider: "cq",
          },
          fileName: "house.image",
        },
      },
    });
  });

  it("把 mirai 图片占位加 Markdown 图片地址导入成外链图片消息", () => {
    const [request] = buildImportedChatMessageRequests([
      {
        roleId: 3,
        speakerName: "木落",
        content: "[mirai:image:{829E3684-0489-D929-ABCE-674F2992FDC4}.jpg]\n![](https://example.com/mirai.jpg)",
      },
    ], {
      roomId: 1,
      resolveAvatarId: () => 7,
    });

    expect(request).toMatchObject({
      roleId: 3,
      avatarId: 7,
      content: "",
      messageType: MessageType.IMG,
      extra: {
        imageMessage: {
          source: {
            kind: "external",
            url: "https://example.com/mirai.jpg",
            provider: "cq",
          },
          fileName: "{829E3684-0489-D929-ABCE-674F2992FDC4}.jpg",
        },
      },
    });
  });
});
