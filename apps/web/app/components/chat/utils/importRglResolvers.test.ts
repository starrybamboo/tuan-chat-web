import { describe, expect, it } from "vitest";

import type { MaterialNode } from "../../../../api";

import { MaterialNode as MaterialNodeModel } from "../../../../api";
import { MessageType } from "../../../../api/wsModels";
import { createRglImportCompileContextFromSources } from "./importRglResolvers";
import { parseAndCompileRglImportText } from "./importRglText";

const role = (roleId: number, roleName: string) => ({ roleId, roleName });
const avatar = (roleId: number, avatarId: number, label: string) => ({
  roleId,
  avatarId,
  avatarTitle: { label },
});

function materialNode(name: string, annotationId: string, messageType: MessageType, extra: Record<string, any>): MaterialNode {
  return {
    type: MaterialNodeModel.type.MATERIAL,
    name,
    messages: [{
      messageType,
      content: "",
      annotations: [annotationId],
      extra,
    }],
  };
}

function folderNode(name: string, children: MaterialNode[]): MaterialNode {
  return {
    type: MaterialNodeModel.type.FOLDER,
    name,
    children,
  };
}

describe("createRglImportCompileContextFromSources", () => {
  it("从角色头像和素材包树解析 RGL 导入消息", () => {
    const context = createRglImportCompileContextFromSources({
      roles: [role(10, "烈"), role(11, "丰聪耳神子")],
      avatarsByRoleId: {
        10: [avatar(10, 100, "震惊")],
        11: [avatar(11, 110, "闭眼平静")],
      },
      materialPackages: [{
        spacePackageId: 7001,
        content: {
          version: 1,
          root: [
            folderNode("背景", [
              materialNode("永远亭夜晚", "sys:bg", MessageType.IMG, {
                imageMessage: {
                  source: { kind: "internal", fileId: 9001 },
                  width: 1920,
                  height: 1080,
                  size: 123456,
                  fileName: "eientei-night.webp",
                  background: true,
                },
              }),
            ]),
            folderNode("BGM", [
              materialNode("战斗曲", "sys:bgm", MessageType.SOUND, {
                soundMessage: {
                  source: { kind: "internal", fileId: 9002 },
                  fileName: "battle.mp3",
                  size: 1234567,
                  second: 180,
                  purpose: "bgm",
                },
              }),
            ]),
          ],
        },
      }],
    });

    const result = parseAndCompileRglImportText([
      "<sys:bg>:永远亭夜晚",
      "<sys:bgm>:战斗曲",
      "[烈.震惊]<figure.pos.left-center>:台词",
    ].join("\n"), context);

    expect(result.invalidLines).toEqual([]);
    expect(result.messages).toMatchObject([
      {
        roleId: -1,
        content: "",
        messageType: MessageType.IMG,
        annotations: ["sys:bg"],
        extra: {
          imageMessage: {
            source: { kind: "internal", fileId: 9001 },
          },
        },
      },
      {
        roleId: -1,
        content: "",
        messageType: MessageType.SOUND,
        annotations: ["sys:bgm"],
        extra: {
          soundMessage: {
            source: { kind: "internal", fileId: 9002 },
            purpose: "bgm",
          },
        },
      },
      {
        roleId: 10,
        avatarId: 100,
        speakerName: "烈",
        content: "台词",
        annotations: ["figure.pos.left-center"],
      },
    ]);
  });

  it("角色不存在时默认失败", () => {
    const context = createRglImportCompileContextFromSources({
      roles: [],
      avatarsByRoleId: {},
      materialPackages: [],
    });

    expect(() => parseAndCompileRglImportText("[烈.震惊]:台词", context))
      .toThrow("找不到角色：烈");
  });

  it("hitpoint 按当前房间角色名解析，角色不存在时失败", () => {
    const context = createRglImportCompileContextFromSources({
      roles: [role(10, "烈")],
      avatarsByRoleId: {},
      materialPackages: [],
    });

    const result = parseAndCompileRglImportText("<hitpoint>:(烈,hp,-2)", context);
    expect(result.messages).toMatchObject([
      {
        roleId: 10,
        messageType: MessageType.STATE_EVENT,
        extra: {
          stateEvent: {
            events: [{
              type: "varOp",
              scope: { kind: "role", roleId: 10 },
              key: "hp",
              op: "sub",
              value: 2,
            }],
          },
        },
      },
    ]);

    expect(() => parseAndCompileRglImportText("<hitpoint>:(勇伯,hp,-2)", context))
      .toThrow("找不到角色：勇伯");
  });

  it("显示名和绑定角色名分离时，按绑定角色解析并保留显示名", () => {
    const context = createRglImportCompileContextFromSources({
      roles: [role(10, "八意永琳")],
      avatarsByRoleId: {
        10: [avatar(10, 100, "默认")],
      },
      materialPackages: [],
    });

    const result = parseAndCompileRglImportText("[师匠=八意永琳.默认]:喝茶。", context);

    expect(result.invalidLines).toEqual([]);
    expect(result.messages).toMatchObject([
      {
        roleId: 10,
        avatarId: 100,
        speakerName: "师匠",
        content: "喝茶。",
      },
    ]);
  });

  it("同角色差分重名时失败", () => {
    const context = createRglImportCompileContextFromSources({
      roles: [role(10, "烈")],
      avatarsByRoleId: {
        10: [
          avatar(10, 100, "震惊"),
          avatar(10, 101, "震惊"),
        ],
      },
      materialPackages: [],
    });

    expect(() => parseAndCompileRglImportText("[烈.震惊]:台词", context))
      .toThrow("角色差分重名：烈.震惊");
  });

  it("通用素材简单名重复时失败，使用完整路径可以消歧", () => {
    const context = createRglImportCompileContextFromSources({
      roles: [],
      avatarsByRoleId: {},
      materialPackages: [{
        spacePackageId: 7001,
        content: {
          version: 1,
          root: [
            folderNode("CG", [
              materialNode("人物卡展示图", "image.show", MessageType.IMG, {
                imageMessage: { source: { kind: "internal", fileId: 1 }, width: 1, height: 1, background: false },
              }),
            ]),
            folderNode("资料", [
              materialNode("人物卡展示图", "image.show", MessageType.IMG, {
                imageMessage: { source: { kind: "internal", fileId: 2 }, width: 1, height: 1, background: false },
              }),
            ]),
          ],
        },
      }],
    });

    expect(() => parseAndCompileRglImportText("<image.show>:人物卡展示图", context))
      .toThrow("素材名重复：人物卡展示图");

    const result = parseAndCompileRglImportText("<image.show>:资料/人物卡展示图", context);

    expect(result.messages).toMatchObject([
      {
        messageType: MessageType.IMG,
        extra: {
          imageMessage: {
            source: { kind: "internal", fileId: 2 },
          },
        },
      },
    ]);
  });

  it("通用素材路径可以相对 annotation 分组书写", () => {
    const context = createRglImportCompileContextFromSources({
      roles: [],
      avatarsByRoleId: {},
      materialPackages: [{
        spacePackageId: 7001,
        content: {
          version: 1,
          root: [
            folderNode("背景", [
              folderNode("场景", [
                materialNode("永远亭夜晚", "sys:bg", MessageType.IMG, {
                  imageMessage: { source: { kind: "internal", fileId: 10 }, width: 1, height: 1, background: true },
                }),
              ]),
            ]),
            folderNode("资料", [
              folderNode("人物卡", [
                materialNode("展示图", "image.show", MessageType.IMG, {
                  imageMessage: { source: { kind: "internal", fileId: 20 }, width: 1, height: 1, background: false },
                }),
              ]),
            ]),
          ],
        },
      }],
    });

    const relativeResult = parseAndCompileRglImportText([
      "<sys:bg>:场景/永远亭夜晚",
      "<image.show>:人物卡/展示图",
    ].join("\n"), context);
    const absoluteResult = parseAndCompileRglImportText("<image.show>:资料/人物卡/展示图", context);

    expect(relativeResult.messages).toMatchObject([
      {
        messageType: MessageType.IMG,
        extra: {
          imageMessage: {
            source: { kind: "internal", fileId: 10 },
          },
        },
      },
      {
        messageType: MessageType.IMG,
        extra: {
          imageMessage: {
            source: { kind: "internal", fileId: 20 },
          },
        },
      },
    ]);
    expect(absoluteResult.messages).toMatchObject([
      {
        messageType: MessageType.IMG,
        extra: {
          imageMessage: {
            source: { kind: "internal", fileId: 20 },
          },
        },
      },
    ]);
  });

  it("通用素材相对路径落到多个允许分组时仍然失败", () => {
    const context = createRglImportCompileContextFromSources({
      roles: [],
      avatarsByRoleId: {},
      materialPackages: [{
        spacePackageId: 7001,
        content: {
          version: 1,
          root: [
            folderNode("CG", [
              folderNode("人物卡", [
                materialNode("展示图", "image.show", MessageType.IMG, {
                  imageMessage: { source: { kind: "internal", fileId: 1 }, width: 1, height: 1, background: false },
                }),
              ]),
            ]),
            folderNode("资料", [
              folderNode("人物卡", [
                materialNode("展示图", "image.show", MessageType.IMG, {
                  imageMessage: { source: { kind: "internal", fileId: 2 }, width: 1, height: 1, background: false },
                }),
              ]),
            ]),
          ],
        },
      }],
    });

    expect(() => parseAndCompileRglImportText("<image.show>:人物卡/展示图", context))
      .toThrow("素材名重复：人物卡/展示图");
  });
});
