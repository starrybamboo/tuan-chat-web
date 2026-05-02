import { describe, expect, it } from "vitest";

import type { Message } from "@tuanchat/openapi-client/models/Message";
import type { RoleAvatar } from "@tuanchat/openapi-client/models/RoleAvatar";
import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import { ANNOTATION_IDS } from "@/types/messageAnnotations";

import { MessageType } from "../../../../api/wsModels";
import { buildGalAnnotations, inferGalMessagePurpose, projectGalMessages, projectGalRoomRoles } from "./authoringProjection";

function createMessage(overrides: Partial<Message>): Message {
  return {
    messageId: 1,
    syncId: 1,
    roomId: 10,
    userId: 99,
    content: "",
    status: 0,
    messageType: MessageType.TEXT,
    position: 1,
    ...overrides,
  };
}

describe("galgame authoring projection", () => {
  it("按现有消息字段推导 Galgame 用途", () => {
    expect(inferGalMessagePurpose(createMessage({
      messageType: MessageType.TEXT,
      roleId: 2,
      content: "你好",
    }))).toBe("dialogue");

    expect(inferGalMessagePurpose(createMessage({
      messageType: MessageType.TEXT,
      roleId: 0,
      content: "雨还在下。",
    }))).toBe("narration");

    expect(inferGalMessagePurpose(createMessage({
      messageType: MessageType.SOUND,
      annotations: [ANNOTATION_IDS.BGM],
      extra: {
        soundMessage: {
          size: 1,
          url: "https://static.example.com/bgm.mp3",
          fileName: "bgm.mp3",
          second: 3,
        },
      },
    }))).toBe("bgm");

    expect(inferGalMessagePurpose(createMessage({
      messageType: MessageType.IMG,
      annotations: [ANNOTATION_IDS.BACKGROUND],
      extra: {
        imageMessage: {
          size: 1,
          url: "https://static.example.com/bg.png",
          fileName: "bg.png",
          background: true,
          width: 1920,
          height: 1080,
        },
      },
    }))).toBe("background");

    expect(inferGalMessagePurpose(createMessage({
      messageType: MessageType.WEBGAL_CHOOSE,
      extra: {
        webgalChoose: {
          options: [{ text: "留下" }],
        },
      },
    }))).toBe("choice");
  });

  it("投影消息时过滤删除消息并把旁白映射为 narrator", () => {
    const messages = projectGalMessages([
      createMessage({ messageId: 2, position: 2, roleId: 7, content: "第二句" }),
      createMessage({ messageId: 1, position: 1, roleId: 0, content: "第一句" }),
      createMessage({ messageId: 3, position: 3, status: 1, content: "已删除" }),
    ], [
      {
        userId: 1,
        roleId: 7,
        roleName: "千夏",
        type: 1,
      },
    ]);

    expect(messages.map(message => message.messageId)).toEqual(["1", "2"]);
    expect(messages[0]).toMatchObject({
      roleId: "narrator",
      roleName: "旁白",
      purpose: "narration",
    });
    expect(messages[1]).toMatchObject({
      roleId: "7",
      roleName: "千夏",
      purpose: "dialogue",
    });
  });

  it("角色差分只暴露 ID 与人类可读信息", () => {
    const roles: UserRole[] = [
      {
        userId: 1,
        roleId: 7,
        roleName: "千夏",
        description: "说话克制。",
        avatarId: 70,
        type: 1,
      },
    ];
    const avatarMap = new Map<number, RoleAvatar[]>([
      [7, [
        {
          roleId: 7,
          avatarId: 71,
          avatarTitle: { zh: "微笑" },
          category: "表情",
          avatarFileId: 71,
          spriteFileId: 72,
        },
      ]],
    ]);

    expect(projectGalRoomRoles(roles, avatarMap)).toEqual([
      {
        roleId: "7",
        roleName: "千夏",
        type: 1,
        description: "说话克制。",
        avatarId: "70",
        avatarVariants: [
          {
            roleId: "7",
            avatarId: "71",
            avatarTitle: { zh: "微笑" },
            category: "表情",
          },
        ],
      },
    ]);
  });

  it("annotation catalog 投影保留内置和自定义来源", () => {
    expect(buildGalAnnotations([
      { id: "sys:bgm", label: "BGM", source: "builtin" },
      { id: "cust:tense", label: "紧张", source: "custom" },
    ])).toEqual([
      { id: "sys:bgm", label: "BGM", source: "builtin" },
      { id: "cust:tense", label: "紧张", source: "custom" },
    ]);
  });
});
