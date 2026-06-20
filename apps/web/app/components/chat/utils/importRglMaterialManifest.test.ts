import { describe, expect, it, vi } from "vitest";

import { applyReplayMaterialPackageImport, buildReplayMaterialPackageFromAssetManifest } from "./importRglMaterialManifest";

describe("buildReplayMaterialPackageFromAssetManifest", () => {
  it("把导入期 manifest 的通用素材编译成素材包树", () => {
    const result = buildReplayMaterialPackageFromAssetManifest({
      package: {
        name: "Replay 导入素材 / opus-88",
        description: "测试素材包",
      },
      media: {
        backgrounds: {
          永远亭夜晚: {
            annotations: ["scene.effect.rain"],
            fileId: 9101,
            fileName: "eientei-night.webp",
            width: 1920,
            height: 1080,
            size: 123456,
          },
        },
        bgm: {
          战斗曲: {
            fileId: 9201,
            fileName: "battle.mp3",
            size: 456789,
            second: 180,
          },
        },
        se: {
          挥刀: {
            fileId: 9301,
            fileName: "slash.wav",
            size: 12345,
          },
        },
        cg: {
          开场图: {
            fileId: 9401,
            fileName: "opening.webp",
            width: 1280,
            height: 720,
            size: 234567,
          },
        },
        references: {
          人物卡展示图: {
            fileId: 9501,
            fileName: "role-card.webp",
            width: 1000,
            height: 1200,
            size: 345678,
          },
        },
      },
    });

    expect(result.name).toBe("Replay 导入素材 / opus-88");
    expect(result.description).toBe("测试素材包");
    expect(result.content.root?.map(node => node.name)).toEqual(["背景", "BGM", "SE", "CG", "资料"]);
    expect(result.content.root).toMatchObject([
      {
        name: "背景",
        children: [{
          name: "永远亭夜晚",
          messages: [{
            messageType: 2,
            annotations: ["sys:bg", "scene.effect.rain"],
            extra: {
              imageMessage: {
                source: { kind: "internal", fileId: 9101 },
                background: true,
              },
            },
          }],
        }],
      },
      {
        name: "BGM",
        children: [{
          name: "战斗曲",
          messages: [{
            messageType: 7,
            annotations: ["sys:bgm"],
            extra: {
              soundMessage: {
                source: { kind: "internal", fileId: 9201 },
                purpose: "bgm",
              },
            },
          }],
        }],
      },
      {
        name: "SE",
        children: [{
          name: "挥刀",
          messages: [{
            annotations: ["sys:se"],
            extra: {
              soundMessage: {
                purpose: "se",
              },
            },
          }],
        }],
      },
      {
        name: "CG",
        children: [{
          name: "开场图",
          messages: [{
            annotations: ["sys:cg"],
          }],
        }],
      },
      {
        name: "资料",
        children: [{
          name: "人物卡展示图",
          messages: [{
            annotations: ["image.show"],
          }],
        }],
      },
    ]);
  });

  it("不把 asset-manifest.json 保存成素材包里的导入索引节点", () => {
    const result = buildReplayMaterialPackageFromAssetManifest({
      media: {
        backgrounds: {
          永远亭夜晚: { fileId: 9101 },
        },
      },
    });

    expect(result.content.root?.some(node => node.name === "导入索引")).toBe(false);
    expect(JSON.stringify(result.content)).not.toContain("asset-manifest.json");
  });

  it("允许通用素材名包含相对路径并生成嵌套素材节点", () => {
    const result = buildReplayMaterialPackageFromAssetManifest({
      media: {
        backgrounds: {
          "场景/永远亭夜晚": { fileId: 9101 },
        },
        references: {
          "资料/人物卡/展示图": { fileId: 9501 },
        },
      },
    });

    expect(result.content.root).toMatchObject([
      {
        name: "背景",
        children: [{
          type: "folder",
          name: "场景",
          children: [{
            type: "material",
            name: "永远亭夜晚",
            messages: [{
              annotations: ["sys:bg"],
              extra: {
                imageMessage: {
                  source: { kind: "internal", fileId: 9101 },
                  fileName: "永远亭夜晚.png",
                },
              },
            }],
          }],
        }],
      },
      {},
      {},
      {},
      {
        name: "资料",
        children: [{
          type: "folder",
          name: "人物卡",
          children: [{
            type: "material",
            name: "展示图",
            messages: [{
              annotations: ["image.show"],
              extra: {
                imageMessage: {
                  source: { kind: "internal", fileId: 9501 },
                  fileName: "展示图.png",
                },
              },
            }],
          }],
        }],
      },
    ]);
  });

  it("嵌套音频素材缺少 fileName 时只用叶子名生成 fallback 文件名", () => {
    const result = buildReplayMaterialPackageFromAssetManifest({
      media: {
        bgm: {
          "章节/战斗曲": { fileId: 9201 },
        },
        se: {
          "动作/挥刀": { fileId: 9301 },
        },
      },
    });

    expect(result.content.root).toMatchObject([
      {},
      {
        name: "BGM",
        children: [{
          name: "章节",
          children: [{
            name: "战斗曲",
            messages: [{
              extra: {
                soundMessage: {
                  fileName: "战斗曲.mp3",
                  source: { kind: "internal", fileId: 9201 },
                },
              },
            }],
          }],
        }],
      },
      {
        name: "SE",
        children: [{
          name: "动作",
          children: [{
            name: "挥刀",
            messages: [{
              extra: {
                soundMessage: {
                  fileName: "挥刀.mp3",
                  source: { kind: "internal", fileId: 9301 },
                },
              },
            }],
          }],
        }],
      },
      {},
      {},
    ]);
  });

  it("素材路径归一化后冲突时严格失败", () => {
    expect(() => buildReplayMaterialPackageFromAssetManifest({
      media: {
        references: {
          人物卡展示图: { fileId: 9501 },
          "资料/人物卡展示图": { fileId: 9502 },
        },
      },
    })).toThrow("素材路径冲突：资料/人物卡展示图");

    expect(() => buildReplayMaterialPackageFromAssetManifest({
      media: {
        references: {
          人物卡: { fileId: 9501 },
          "人物卡/展示图": { fileId: 9502 },
        },
      },
    })).toThrow("素材路径冲突：资料/人物卡");
  });

  it("缺少 fileId 时严格失败", () => {
    expect(() => buildReplayMaterialPackageFromAssetManifest({
      media: {
        bgm: {
          战斗曲: { fileName: "battle.mp3" },
        },
      },
    })).toThrow("素材缺少 fileId：BGM/战斗曲");
  });

  it("manifest 额外 annotations 必须是底层 annotation ID 数组", () => {
    expect(() => buildReplayMaterialPackageFromAssetManifest({
      media: {
        backgrounds: {
          永远亭夜晚: { fileId: 9101, annotations: ["enter"] },
        },
      },
    })).toThrow("未知素材 annotation：背景/永远亭夜晚 enter");

    expect(() => buildReplayMaterialPackageFromAssetManifest({
      media: {
        backgrounds: {
          永远亭夜晚: { fileId: 9101, annotations: "scene.effect.rain" },
        },
      },
    })).toThrow("素材 annotations 必须是数组：背景/永远亭夜晚");
  });

  it("导入通用素材时没有同名素材包则创建", async () => {
    const replayPackage = buildReplayMaterialPackageFromAssetManifest({
      package: { name: "Replay 导入素材 / opus-88" },
      media: {
        backgrounds: {
          永远亭夜晚: { fileId: 9101 },
        },
      },
    });
    const createPackage = vi.fn().mockResolvedValue({
      success: true,
      data: { spacePackageId: 7001 },
    });
    const updatePackage = vi.fn();

    const result = await applyReplayMaterialPackageImport(10788, replayPackage, {
      findPackageByExactName: vi.fn().mockResolvedValue(null),
      createPackage,
      updatePackage,
    });

    expect(createPackage).toHaveBeenCalledWith(expect.objectContaining({
      spaceId: 10788,
      name: "Replay 导入素材 / opus-88",
      content: replayPackage.content,
    }));
    expect(updatePackage).not.toHaveBeenCalled();
    expect(result).toEqual({
      action: "create",
      materialCount: 1,
      name: "Replay 导入素材 / opus-88",
      spacePackageId: 7001,
    });
  });

  it("导入通用素材时存在同名素材包则破坏性重写", async () => {
    const replayPackage = buildReplayMaterialPackageFromAssetManifest({
      package: { name: "Replay 导入素材 / opus-88" },
      media: {
        bgm: {
          战斗曲: { fileId: 9201 },
        },
        se: {
          挥刀: { fileId: 9301 },
        },
      },
    });
    const createPackage = vi.fn();
    const updatePackage = vi.fn().mockResolvedValue({
      success: true,
      data: { spacePackageId: 7002 },
    });

    const result = await applyReplayMaterialPackageImport(10788, replayPackage, {
      findPackageByExactName: vi.fn().mockResolvedValue({ spacePackageId: 7002 }),
      createPackage,
      updatePackage,
    });

    expect(createPackage).not.toHaveBeenCalled();
    expect(updatePackage).toHaveBeenCalledWith(expect.objectContaining({
      spaceId: 10788,
      spacePackageId: 7002,
      name: "Replay 导入素材 / opus-88",
      content: replayPackage.content,
    }));
    expect(result).toEqual({
      action: "update",
      materialCount: 2,
      name: "Replay 导入素材 / opus-88",
      spacePackageId: 7002,
    });
  });

  it("导入通用素材时 API 失败会抛出后端错误", async () => {
    const replayPackage = buildReplayMaterialPackageFromAssetManifest({
      media: {
        backgrounds: {
          永远亭夜晚: { fileId: 9101 },
        },
      },
    });

    await expect(applyReplayMaterialPackageImport(10788, replayPackage, {
      findPackageByExactName: vi.fn().mockResolvedValue(null),
      createPackage: vi.fn().mockResolvedValue({ success: false, errMsg: "空间无权限" }),
      updatePackage: vi.fn(),
    })).rejects.toThrow("空间无权限");
  });
});
