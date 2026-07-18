import { describe, expect, it, vi } from "vitest";

import {
  buildReplayAssetUploadFileMap,
  buildUploadedReplayAssetManifest,
  createReplayAssetManifestUploadDepsFromUploadUtils,
  findReplayLocalAssetManifestFile,
  parseReplayAssetManifestJsonText,
  readReplayAssetManifestJsonFile,
  summarizeReplayAssetManifestSections,
} from "./importRglAssetManifestUpload";

function file(name: string, type: string, size = 16) {
  return new File(["x".repeat(size)], name, { type });
}

function directoryFile(relativePath: string, type = "image/png") {
  const name = relativePath.split("/").at(-1) ?? relativePath;
  const created = file(name, type);
  Object.defineProperty(created, "webkitRelativePath", {
    configurable: true,
    value: relativePath,
  });
  return created;
}

describe("buildUploadedReplayAssetManifest", () => {
  it("拒绝非 JSON 对象的素材清单", async () => {
    await expect(buildUploadedReplayAssetManifest([], {
      resolveFile: () => {
        throw new Error("不应解析文件");
      },
      uploadAudio: vi.fn(),
      uploadImage: vi.fn(),
    })).rejects.toThrow("素材清单必须是 JSON 对象");
  });

  it("把本地素材清单上传并转换成导入期 asset-manifest.json", async () => {
    const files = new Map<string, File>([
      ["roles/retsu.png", file("retsu.png", "image/png", 11)],
      ["roles/retsu-sprite.png", file("retsu-sprite.png", "image/png", 12)],
      ["bg/eientei.png", file("eientei.png", "image/png", 13)],
      ["bgm/battle.mp3", file("battle.mp3", "audio/mpeg", 14)],
    ]);
    const uploadImage = vi.fn(async (uploadedFile: File, context: { path: string; scene: number }) => ({
      fileId: context.path === "roles/retsu.png"
        ? 9001
        : context.path === "roles/retsu-sprite.png" ? 9002 : 9101,
      fileName: uploadedFile.name,
      size: uploadedFile.size,
    }));
    const uploadAudio = vi.fn(async (uploadedFile: File) => ({
      fileId: 9201,
      fileName: uploadedFile.name,
      size: uploadedFile.size,
    }));

    const manifest = await buildUploadedReplayAssetManifest({
      package: { name: "Replay 导入素材 / sample-replay" },
      roles: {
        烈: {
          avatars: {
            震惊: {
              kind: "character-avatar-bust",
              file: "roles/retsu.png",
              spriteFile: "roles/retsu-sprite.png",
              hasAlpha: true,
            },
          },
        },
      },
      media: {
        backgrounds: {
          永远亭夜晚: {
            file: "bg/eientei.png",
            annotations: ["scene.effect.rain"],
          },
        },
        bgm: {
          战斗曲: {
            file: "bgm/battle.mp3",
          },
        },
      },
    }, {
      measureImage: async input => ({
        height: input.name === "eientei.png" ? 1080 : 512,
        size: input.size,
        width: input.name === "eientei.png" ? 1920 : 512,
      }),
      readAudioDuration: async () => 180,
      resolveFile: path => files.get(path)!,
      uploadAudio,
      uploadImage,
    });

    expect(uploadImage).toHaveBeenCalledWith(files.get("roles/retsu.png"), expect.objectContaining({
      kind: "role-image",
      scene: 3,
    }));
    expect(uploadImage).toHaveBeenCalledWith(files.get("bg/eientei.png"), expect.objectContaining({
      groupKey: "backgrounds",
      kind: "media-image",
      scene: 1,
    }));
    expect(uploadAudio).toHaveBeenCalledWith(files.get("bgm/battle.mp3"), expect.objectContaining({
      groupKey: "bgm",
    }));
    expect(manifest).toMatchObject({
      package: { name: "Replay 导入素材 / sample-replay" },
      roles: {
        烈: {
          avatars: {
            震惊: {
              kind: "character-avatar-bust",
              fileId: 9001,
              fileName: "retsu.png",
              spriteFileId: 9002,
              width: 512,
              height: 512,
              size: 11,
              hasAlpha: true,
            },
          },
        },
      },
      media: {
        backgrounds: {
          永远亭夜晚: {
            fileId: 9101,
            fileName: "eientei.png",
            width: 1920,
            height: 1080,
            size: 13,
            annotations: ["scene.effect.rain"],
          },
        },
        bgm: {
          战斗曲: {
            fileId: 9201,
            fileName: "battle.mp3",
            size: 14,
            second: 180,
          },
        },
      },
    });
    expect(JSON.stringify(manifest)).not.toContain("\"file\"");
    expect(JSON.stringify(manifest)).not.toContain("roles/retsu.png");
  });

  it("已上传条目保留 fileId，不重复上传本地文件", async () => {
    const uploadImage = vi.fn();
    const uploadAudio = vi.fn();

    const manifest = await buildUploadedReplayAssetManifest({
      roles: {
        烈: {
          avatars: {
            震惊: {
              kind: "character-avatar-bust",
              fileId: 9001,
              file: "ignored.png",
              width: 512,
              height: 512,
            },
          },
        },
      },
      media: {
        references: {
          人物卡: {
            fileId: 9501,
            file: "ignored-card.png",
          },
        },
      },
    }, {
      resolveFile: () => {
        throw new Error("不应读取本地文件");
      },
      uploadAudio,
      uploadImage,
    });

    expect(uploadImage).not.toHaveBeenCalled();
    expect(uploadAudio).not.toHaveBeenCalled();
    expect(manifest).toMatchObject({
      roles: {
        烈: {
          avatars: {
            震惊: {
              fileId: 9001,
              width: 512,
              height: 512,
            },
          },
        },
      },
      media: {
        references: {
          人物卡: {
            fileId: 9501,
          },
        },
      },
    });
    expect(JSON.stringify(manifest)).not.toContain("ignored");
  });

  it("本地文件路径缺失时严格失败", async () => {
    await expect(buildUploadedReplayAssetManifest({
      media: {
        backgrounds: {
          永远亭夜晚: {},
        },
      },
    }, {
      resolveFile: () => {
        throw new Error("不应解析文件");
      },
      uploadAudio: vi.fn(),
      uploadImage: vi.fn(),
    })).rejects.toThrow("素材缺少 fileId 或 file：media.backgrounds.永远亭夜晚");
  });

  it("允许只上传通用素材，忽略角色素材本地路径", async () => {
    const uploadImage = vi.fn(async (_uploadedFile: File, context: { path: string }) => ({
      fileId: context.path === "bg/eientei.png" ? 9101 : 9001,
    }));

    const manifest = await buildUploadedReplayAssetManifest({
      roles: {
        烈: {
          avatars: {
            震惊: {
              kind: "character-avatar-bust",
              file: "roles/retsu.png",
              width: 512,
              height: 512,
            },
          },
        },
      },
      media: {
        backgrounds: {
          永远亭夜晚: {
            file: "bg/eientei.png",
          },
        },
      },
    }, {
      measureImage: async () => ({ width: 1920, height: 1080, size: 99 }),
      resolveFile: path => file(path, "image/png"),
      uploadAudio: vi.fn(),
      uploadImage,
    }, {
      includeRoles: false,
    });

    expect(uploadImage).toHaveBeenCalledTimes(1);
    expect(uploadImage).toHaveBeenCalledWith(expect.any(File), expect.objectContaining({
      path: "bg/eientei.png",
    }));
    expect(manifest).toMatchObject({
      media: {
        backgrounds: {
          永远亭夜晚: {
            fileId: 9101,
            width: 1920,
            height: 1080,
          },
        },
      },
    });
    expect(manifest).not.toHaveProperty("roles");
    expect(JSON.stringify(manifest)).not.toContain("roles/retsu.png");
  });
});

describe("createReplayAssetManifestUploadDepsFromUploadUtils", () => {
  it("从文件路径表创建 UploadUtils 适配器", async () => {
    const image = file("scene.png", "image/png");
    const uploadUtils = {
      uploadAudioAsset: vi.fn(),
      uploadDualImage: vi.fn(async () => ({
        fileId: 1001,
        mediaType: "image",
        originalSize: image.size,
        originalUrl: "https://example.com/original",
        url: "https://example.com/medium",
      })),
    };
    const deps = createReplayAssetManifestUploadDepsFromUploadUtils({
      filesByPath: new Map([["assets/scene.png", image]]),
      uploadUtils: uploadUtils as any,
    });

    await expect(Promise.resolve(deps.resolveFile("./assets/scene.png"))).resolves.toBe(image);
    await expect(deps.uploadImage(image, {
      kind: "media-image",
      path: "assets/scene.png",
      scene: 1,
    })).resolves.toMatchObject({
      fileId: 1001,
      fileName: "scene.png",
      size: image.size,
    });
    expect(uploadUtils.uploadDualImage).toHaveBeenCalledWith(image, 1);
  });
});

describe("buildReplayAssetUploadFileMap", () => {
  it("用目录相对路径和去根目录路径索引本地文件", () => {
    const scene = directoryFile("sample-replay/bg/eientei.png");
    const fileMap = buildReplayAssetUploadFileMap([scene]);

    expect(fileMap.get("sample-replay/bg/eientei.png")).toBe(scene);
    expect(fileMap.get("bg/eientei.png")).toBe(scene);
    expect(fileMap.get("eientei.png")).toBe(scene);
  });

  it("重复文件名不会作为可静默匹配的短路径", () => {
    const first = directoryFile("sample-replay/bg/scene.png");
    const second = directoryFile("sample-replay/cg/scene.png");
    const fileMap = buildReplayAssetUploadFileMap([first, second]);

    expect(fileMap.get("scene.png")).toBeUndefined();
    expect(fileMap.get("bg/scene.png")).toBe(first);
    expect(fileMap.get("cg/scene.png")).toBe(second);
  });
});

describe("findReplayLocalAssetManifestFile", () => {
  it("优先查找约定命名的素材清单 JSON", () => {
    const readme = directoryFile("sample-replay/readme.json", "application/json");
    const manifest = directoryFile("sample-replay/assets.json", "application/json");

    expect(findReplayLocalAssetManifestFile([readme, manifest])).toBe(manifest);
  });

  it("也接受 replay-assets.json 和 local-assets.json", () => {
    const replayManifest = directoryFile("sample-replay/replay-assets.json", "application/json");
    const localManifest = directoryFile("sample-replay/local-assets.json", "application/json");

    expect(findReplayLocalAssetManifestFile([replayManifest])).toBe(replayManifest);
    expect(findReplayLocalAssetManifestFile([localManifest])).toBe(localManifest);
  });

  it("多个非约定 JSON 文件时失败，避免选错清单", () => {
    expect(() => findReplayLocalAssetManifestFile([
      directoryFile("sample-replay/a.json", "application/json"),
      directoryFile("sample-replay/b.json", "application/json"),
    ])).toThrow("本地素材目录存在多个 JSON 文件");
  });

  it("缺少清单时提示所有允许的本地清单文件名", () => {
    expect(() => findReplayLocalAssetManifestFile([])).toThrow("assets.json、replay-assets.json、local-assets.json、asset-manifest.json");
  });
});

describe("readReplayAssetManifestJsonFile", () => {
  it("解析素材清单 JSON，并在 JSON 无效时带上文件名", async () => {
    const validManifest = new File(["{\"media\":{}}"], "asset-manifest.json", { type: "application/json" });

    await expect(readReplayAssetManifestJsonFile(validManifest, "asset-manifest.json"))
      .resolves.toEqual({ media: {} });

    expect(() => parseReplayAssetManifestJsonText("bad-assets.json", "{", "本地素材清单"))
      .toThrow(/本地素材清单 JSON 解析失败：bad-assets\.json：/);
  });
});

describe("summarizeReplayAssetManifestSections", () => {
  it("检测素材清单包含通用素材和角色素材分段", () => {
    expect(summarizeReplayAssetManifestSections({
      roles: {
        烈: {
          avatars: {
            震惊: { fileId: 1 },
          },
        },
      },
      media: {
        backgrounds: {
          永远亭夜晚: { fileId: 2 },
        },
      },
    })).toEqual({ media: true, roles: true });

    expect(summarizeReplayAssetManifestSections({
      roles: {
        烈: {
          avatars: {},
        },
      },
      media: {},
    })).toEqual({ media: false, roles: false });
  });
});
