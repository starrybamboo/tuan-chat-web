import type { RealtimeAssetUploadContext, RealtimeRoleAvatarSource } from "./realtimeRendererAssetUploads";

import { uploadFile } from "./fileOperator";
import {
  getAndUploadMiniAvatarAsset,
  getAndUploadSpriteAsset,
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
