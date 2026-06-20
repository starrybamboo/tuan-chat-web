import type { RealtimeAssetUploadContext, RealtimeRoleAvatarSource } from "./realtimeRendererAssetUploads";

import { checkFileExist, uploadFile } from "./fileOperator";
import {
  getAndUploadFigureAsset,
  getAndUploadMiniAvatarAsset,
  getAndUploadSpriteAsset,
  uploadImageFigureAsset,
  uploadMapImageAsset,
} from "./realtimeRendererAssetUploads";

vi.mock("./fileOperator", () => ({
  checkFileExist: vi.fn(async () => true),
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

function variantGroup(baseAvatarId = 5, x = 12) {
  return {
    variantId: 100,
    roleId: 1,
    name: "校服",
    baseAvatarId,
    compositionConfig: {
      canvas: { width: 1000, height: 1600 },
      avatarSlot: { x, y: 34, width: 256, height: 256 },
      output: { format: "webp" },
    },
  };
}

describe("realtimeRendererAssetUploads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkFileExist).mockResolvedValue(true);
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

  it("上传小头像使用头像中清图而不是低清缩略图", async () => {
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
    const uploadedUrl = String(vi.mocked(uploadFile).mock.calls[0][0]);
    expect(uploadedUrl).toContain("9918");
    expect(uploadedUrl).not.toContain("low");
  });

  it("立绘组会上传 base sprite 和当前头像层并返回 composeFigure 资源", async () => {
    const context = createContext();
    const avatars = [
      {
        avatarId: 5,
        roleId: 1,
        variantId: 100,
        variantGroup: variantGroup(5),
        spriteFileId: 2048,
        avatarFileId: 9001,
      },
      {
        avatarId: 7,
        roleId: 1,
        variantId: 100,
        variantGroup: variantGroup(5),
        avatarFileId: 9918,
        spriteFileId: 4096,
      },
    ] satisfies RealtimeRoleAvatarSource[];

    const result = await getAndUploadFigureAsset(
      context,
      7,
      1,
      id => avatars.find(avatar => avatar.avatarId === id),
      () => avatars,
    );

    expect(result?.composite).toBe(true);
    expect(result?.basePath).toBe("role_1/base_5_2048.webp");
    expect(result?.avatarLayerPath).toMatch(/^role_1\/avatar_7_9918_[a-z0-9]+\.webp$/);
    expect(result?.composeLine).toContain("-base=role_1/base_5_2048.webp");
    expect(result?.composeLine).toContain(`-layer=${result?.avatarLayerPath},12,34,256,256`);
    expect(uploadFile).toHaveBeenCalledTimes(2);
    expect(vi.mocked(uploadFile).mock.calls[0][2]).toBe("base_5_2048.webp");
    expect(String(vi.mocked(uploadFile).mock.calls[1][2])).toMatch(/^avatar_7_9918_[a-z0-9]+\.webp$/);
  });

  it("合成立绘缓存会随组合配置变化刷新头像层", async () => {
    const context = createContext();
    const baseAvatar = {
      avatarId: 5,
      roleId: 1,
      variantId: 100,
      variantGroup: variantGroup(5),
      spriteFileId: 2048,
      avatarFileId: 9001,
    } satisfies RealtimeRoleAvatarSource;
    const makeCurrent = (x: number) => ({
      avatarId: 7,
      roleId: 1,
      variantId: 100,
      variantGroup: variantGroup(5, x),
      avatarFileId: 9918,
      spriteFileId: 4096,
    } satisfies RealtimeRoleAvatarSource);
    const firstCurrent = makeCurrent(12);
    const first = await getAndUploadFigureAsset(
      context,
      7,
      1,
      id => (id === 5 ? baseAvatar : firstCurrent),
      () => [baseAvatar, firstCurrent],
    );
    const second = await getAndUploadFigureAsset(
      context,
      7,
      1,
      id => (id === 5 ? baseAvatar : firstCurrent),
      () => [baseAvatar, firstCurrent],
    );
    const changedCurrent = makeCurrent(13);
    const changed = await getAndUploadFigureAsset(
      context,
      7,
      1,
      id => (id === 5 ? baseAvatar : changedCurrent),
      () => [baseAvatar, changedCurrent],
    );

    expect(first?.stateKey).toBe(second?.stateKey);
    expect(first?.stateKey).not.toBe(changed?.stateKey);
    expect(uploadFile).toHaveBeenCalledTimes(3);
    expect(vi.mocked(uploadFile).mock.calls.map(call => String(call[2]))).toEqual([
      "base_5_2048.webp",
      expect.stringMatching(/^avatar_7_9918_[a-z0-9]+\.webp$/),
      expect.stringMatching(/^avatar_7_9918_[a-z0-9]+\.webp$/),
    ]);
  });

  it("同一源图用于不同目标文件名时不会复用成错误角色文件", async () => {
    const context = createContext();

    const first = await uploadImageFigureAsset(context, "https://example.test/avatar.webp", "token_role_14993");
    const second = await uploadImageFigureAsset(context, "https://example.test/avatar.webp", "token_role_15223");

    expect(first).toBe("token_role_14993.webp");
    expect(second).toBe("token_role_15223.webp");
    expect(uploadFile).toHaveBeenCalledTimes(2);
  });

  it("图片立绘缓存命中但文件丢失时会重新上传", async () => {
    const context = createContext();
    const url = "https://example.test/avatar.webp";
    context.uploadedImageFiguresMap.set(`token_role_14562|${url}`, "token_role_14562.webp");
    vi.mocked(checkFileExist).mockResolvedValueOnce(false);

    const result = await uploadImageFigureAsset(context, url, "token_role_14562");

    expect(result).toBe("token_role_14562.webp");
    expect(checkFileExist).toHaveBeenCalledWith(
      "games/realtime_1/game/figure/",
      "token_role_14562.webp",
    );
    expect(uploadFile).toHaveBeenCalledWith(
      url,
      "games/realtime_1/game/figure/",
      "token_role_14562.webp",
    );
    expect(context.uploadedImageFiguresMap.get(`token_role_14562|${url}`)).toBe("token_role_14562.webp");
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
