import type { RealtimeAssetUploadContext, RealtimeRoleAvatarSource } from "./realtimeRendererAssetUploads";

import { uploadFile } from "./fileOperator";
import {
  getAndUploadMiniAvatarAsset,
  getAndUploadSpriteAsset,
  uploadImageFigureAsset,
  uploadMapImageAsset,
} from "./realtimeRendererAssetUploads";

vi.mock("./fileOperator", () => ({
  getFileExtensionFromUrl: vi.fn(() => "webp"),
  uploadFile: vi.fn(async (_url: string, _path: string, fileName?: string) => fileName ?? "uploaded.webp"),
}));

function createContext(): RealtimeAssetUploadContext {
  return {
    gameName: "realtime_1",
    uploadedSpritesMap: new Map(),
    uploadedBackgroundsMap: new Map(),
    uploadedMapImagesMap: new Map(),
    uploadedImageFiguresMap: new Map(),
    uploadedBgmsMap: new Map(),
    uploadedVideosMap: new Map(),
    uploadedMiniAvatarsMap: new Map(),
    uploadedSoundEffectsMap: new Map(),
  };
}

describe("realtimeRendererAssetUploads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("上传立绘时不会把 avatarFileId 当作 sprite 兜底", async () => {
    const context = createContext();
    const avatar = {
      avatarId: 7,
      roleId: 1,
      avatarFileId: 9918,
      spriteFileId: undefined,
      originFileId: undefined,
    } satisfies RealtimeRoleAvatarSource;

    const result = await getAndUploadSpriteAsset(context, 7, 1, () => avatar);

    expect(result).toBeNull();
    expect(uploadFile).not.toHaveBeenCalled();
    expect(context.uploadedSpritesMap.size).toBe(0);
  });

  it("上传立绘允许使用 originFileId 作为源图", async () => {
    const context = createContext();
    const avatar = {
      avatarId: 7,
      roleId: 1,
      avatarFileId: 9918,
      spriteFileId: undefined,
      originFileId: 6488,
    } satisfies RealtimeRoleAvatarSource;

    const result = await getAndUploadSpriteAsset(context, 7, 1, () => avatar);

    expect(result).toBe("role_1/sprite_7.webp");
    expect(uploadFile).toHaveBeenCalledOnce();
    expect(String(vi.mocked(uploadFile).mock.calls[0][0])).toContain("6488");
  });

  it("上传立绘的首选 sprite medium 源失败时会继续尝试 sprite original 源", async () => {
    const context = createContext();
    const avatar = {
      avatarId: 7,
      roleId: 1,
      spriteFileId: 2048,
      originFileId: 6488,
    } satisfies RealtimeRoleAvatarSource;
    vi.mocked(uploadFile)
      .mockRejectedValueOnce(new Error("medium 404"))
      .mockResolvedValueOnce("sprite_7.webp");

    const result = await getAndUploadSpriteAsset(context, 7, 1, () => avatar);

    expect(result).toBe("role_1/sprite_7.webp");
    expect(uploadFile).toHaveBeenCalledTimes(2);
    expect(String(vi.mocked(uploadFile).mock.calls[0][0])).toContain("2048");
    expect(String(vi.mocked(uploadFile).mock.calls[1][0])).toContain("2048/original");
  });

  it("上传立绘的 sprite 源都失败时会继续尝试 origin 源", async () => {
    const context = createContext();
    const avatar = {
      avatarId: 7,
      roleId: 1,
      spriteFileId: 2048,
      originFileId: 6488,
    } satisfies RealtimeRoleAvatarSource;
    vi.mocked(uploadFile)
      .mockRejectedValueOnce(new Error("medium 404"))
      .mockRejectedValueOnce(new Error("original 404"))
      .mockResolvedValueOnce("sprite_7.webp");

    const result = await getAndUploadSpriteAsset(context, 7, 1, () => avatar);

    expect(result).toBe("role_1/sprite_7.webp");
    expect(uploadFile).toHaveBeenCalledTimes(3);
    expect(String(vi.mocked(uploadFile).mock.calls[2][0])).toContain("6488");
  });

  it("上传立绘允许使用真实 legacy sprite URL", async () => {
    const context = createContext();
    const avatar = {
      avatarId: 7,
      roleId: 1,
      avatarFileId: 9918,
      spriteFileId: undefined,
      originFileId: undefined,
      avatarUrl: "https://example.test/avatar.webp",
      spriteUrl: "https://example.test/legacy-sprite.webp",
    } satisfies RealtimeRoleAvatarSource;

    const result = await getAndUploadSpriteAsset(context, 7, 1, () => avatar);

    expect(result).toBe("role_1/sprite_7.webp");
    expect(uploadFile).toHaveBeenCalledOnce();
    expect(vi.mocked(uploadFile).mock.calls[0][0]).toBe("https://example.test/legacy-sprite.webp");
  });

  it("上传小头像仍然使用 avatarFileId", async () => {
    const context = createContext();
    const avatar = {
      avatarId: 7,
      roleId: 1,
      avatarFileId: 9918,
      spriteFileId: undefined,
      originFileId: undefined,
    } satisfies RealtimeRoleAvatarSource;

    const result = await getAndUploadMiniAvatarAsset(context, 7, 1, () => avatar);

    expect(result).toBe("role_1/mini_7.webp");
    expect(uploadFile).toHaveBeenCalledOnce();
    expect(String(vi.mocked(uploadFile).mock.calls[0][0])).toContain("9918");
  });

  it("同一源图用于不同目标文件名时不会复用成错误角色文件", async () => {
    const context = createContext();

    const first = await uploadImageFigureAsset(context, "https://example.test/avatar.webp", "token_role_14993");
    const second = await uploadImageFigureAsset(context, "https://example.test/avatar.webp", "token_role_15223");

    expect(first).toBe("token_role_14993.webp");
    expect(second).toBe("token_role_15223.webp");
    expect(uploadFile).toHaveBeenCalledTimes(2);
  });

  it("上传地图图片到 WebGAL 背景目录并返回本地资源名", async () => {
    const context = createContext();

    const result = await uploadMapImageAsset(context, "http://localhost:3001/map.png?sig=a=b", 12);

    expect(result).toBe("map_12.png");
    expect(uploadFile).toHaveBeenCalledWith(
      "http://localhost:3001/map.png?sig=a=b",
      "games/realtime_1/game/background/",
      "map_12.png",
    );
    expect(context.uploadedMapImagesMap.get("http://localhost:3001/map.png?sig=a=b")).toBe("map_12.png");
  });

  it("头像不属于当前角色时不会上传立绘或小头像", async () => {
    const context = createContext();
    const avatar = {
      avatarId: 7,
      roleId: 2,
      avatarFileId: 9918,
      spriteFileId: 6488,
      originFileId: 6488,
    } satisfies RealtimeRoleAvatarSource;

    const spriteResult = await getAndUploadSpriteAsset(context, 7, 1, () => avatar);
    const miniAvatarResult = await getAndUploadMiniAvatarAsset(context, 7, 1, () => avatar);

    expect(spriteResult).toBeNull();
    expect(miniAvatarResult).toBeNull();
    expect(uploadFile).not.toHaveBeenCalled();
  });
});
