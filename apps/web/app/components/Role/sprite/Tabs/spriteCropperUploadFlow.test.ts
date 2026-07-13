import type { RoleAvatar } from "api";

import { describe, expect, it, vi } from "vitest";

import {
  getCropSubmitTaskKey,
  isCropSubmitWaitingForUpload,
  resolveCropSubmitAvatar,
  SpriteCropSubmissionCoordinator,
} from "./spriteCropperUploadFlow";

function createAvatar(overrides: Partial<RoleAvatar> = {}): RoleAvatar {
  return {
    roleId: 7,
    avatarId: 11,
    ...overrides,
  } as RoleAvatar;
}

describe("spriteCropperUploadFlow", () => {
  it("临时头像在最终提交阶段等待上传完成", async () => {
    const optimisticAvatar = createAvatar({ avatarId: -1 }) as RoleAvatar & {
      optimisticUploadPending: boolean;
    };
    optimisticAvatar.optimisticUploadPending = true;
    const uploadedAvatar = createAvatar({ avatarId: 21, originFileId: 31, spriteFileId: 41 });
    const waitForAvatarUpload = vi.fn().mockResolvedValue(uploadedAvatar);

    await expect(resolveCropSubmitAvatar(optimisticAvatar, waitForAvatarUpload)).resolves.toBe(uploadedAvatar);
    expect(waitForAvatarUpload).toHaveBeenCalledWith(optimisticAvatar);
  });

  it("已预留正 ID 的乐观头像仍等待媒体绑定完成", async () => {
    const reservedAvatar = createAvatar({ avatarId: 22 }) as RoleAvatar & {
      optimisticUploadPending: boolean;
    };
    reservedAvatar.optimisticUploadPending = true;
    const uploadedAvatar = createAvatar({ avatarId: 22, originFileId: 32, spriteFileId: 42 });
    const waitForAvatarUpload = vi.fn().mockResolvedValue(uploadedAvatar);

    expect(isCropSubmitWaitingForUpload(reservedAvatar)).toBe(true);
    await expect(resolveCropSubmitAvatar(reservedAvatar, waitForAvatarUpload)).resolves.toBe(uploadedAvatar);
  });

  it("已完成上传的头像直接进入提交", async () => {
    const uploadedAvatar = createAvatar({ originFileId: 33, spriteFileId: 43 });
    const waitForAvatarUpload = vi.fn();

    expect(isCropSubmitWaitingForUpload(uploadedAvatar)).toBe(false);
    await expect(resolveCropSubmitAvatar(uploadedAvatar, waitForAvatarUpload)).resolves.toBe(uploadedAvatar);
    expect(waitForAvatarUpload).not.toHaveBeenCalled();
  });

  it("乐观头像缺少等待任务时给出明确错误", async () => {
    const optimisticAvatar = createAvatar({ avatarId: -1 });

    await expect(resolveCropSubmitAvatar(optimisticAvatar)).rejects.toThrow("图片上传任务已中断");
  });

  it("最终头像提交同时等待原图和立绘后台提交", async () => {
    const optimisticAvatar = createAvatar({ avatarId: -1 }) as RoleAvatar & {
      optimisticUploadKey: string;
      optimisticUploadPending: boolean;
    };
    optimisticAvatar.optimisticUploadKey = "upload-1";
    optimisticAvatar.optimisticUploadPending = true;
    const uploadedAvatar = createAvatar({ avatarId: 21, originFileId: 31 }) as RoleAvatar & {
      optimisticUploadKey: string;
    };
    uploadedAvatar.optimisticUploadKey = "upload-1";
    let resolveUpload!: (avatar: RoleAvatar) => void;
    const uploadPromise = new Promise<RoleAvatar>(resolve => {
      resolveUpload = resolve;
    });
    const coordinator = new SpriteCropSubmissionCoordinator();
    const spritePromise = coordinator.enqueue(optimisticAvatar, async () => {
      const resolvedAvatar = await uploadPromise;
      return { ...resolvedAvatar, spriteFileId: 41 };
    });
    const finalSubmitAvatar = coordinator.resolve(optimisticAvatar, async () => await uploadPromise);
    let finalSubmitResolved = false;
    void finalSubmitAvatar.then(() => {
      finalSubmitResolved = true;
    });

    await Promise.resolve();
    expect(finalSubmitResolved).toBe(false);
    resolveUpload(uploadedAvatar);
    await expect(finalSubmitAvatar)
      .resolves.toMatchObject({ avatarId: 21, spriteFileId: 41 });
    await expect(spritePromise).resolves.toMatchObject({ spriteFileId: 41 });
  });

  it("同一头像连续裁剪按队列顺序提交，新的头像可以并行提交", async () => {
    const first = createAvatar({ avatarId: 10 });
    const second = createAvatar({ avatarId: 10 });
    const other = createAvatar({ avatarId: 11 });
    const coordinator = new SpriteCropSubmissionCoordinator();
    let secondStarted = false;
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>(resolve => {
      releaseFirst = resolve;
    });
    const firstTask = coordinator.enqueue(first, async () => {
      await firstGate;
      return { ...first, spriteFileId: 101 };
    });
    const secondTask = coordinator.enqueue(second, async () => {
      secondStarted = true;
      return { ...second, spriteFileId: 102 };
    });
    const otherTask = coordinator.enqueue(other, async () => ({ ...other, spriteFileId: 201 }));

    await expect(otherTask).resolves.toMatchObject({ spriteFileId: 201 });
    expect(secondStarted).toBe(false);

    releaseFirst();
    await expect(secondTask).resolves.toMatchObject({ spriteFileId: 102 });
    await expect(firstTask).resolves.toMatchObject({ spriteFileId: 101 });
  });

  it("乐观头像预留服务端 ID 后保持同一提交键", () => {
    const optimisticAvatar = createAvatar({ avatarId: -1 }) as RoleAvatar & {
      optimisticUploadKey: string;
    };
    optimisticAvatar.optimisticUploadKey = "stable-upload";
    const reservedAvatar = {
      ...optimisticAvatar,
      avatarId: 31,
    };

    expect(getCropSubmitTaskKey(optimisticAvatar)).toBe("upload:stable-upload");
    expect(getCropSubmitTaskKey(reservedAvatar)).toBe("upload:stable-upload");
  });

  it("后台立绘失败会传递到最终头像提交", async () => {
    const avatar = createAvatar({ avatarId: 12 });
    const coordinator = new SpriteCropSubmissionCoordinator();
    const error = new Error("sprite upload failed");
    coordinator.enqueue(avatar, async () => {
      throw error;
    });

    await expect(coordinator.resolve(avatar)).rejects.toBe(error);
  });
});
