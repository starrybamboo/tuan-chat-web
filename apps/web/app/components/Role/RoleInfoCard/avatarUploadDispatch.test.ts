import { describe, expect, it, vi } from "vitest";

import { dispatchAvatarUploadTask } from "./avatarUploadDispatch";

function createDeferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe("dispatchAvatarUploadTask", () => {
  it("第一批上传未完成时仍可派发后续批次", async () => {
    const firstUpload = createDeferred();
    const tasks = [
      vi.fn(() => firstUpload.promise),
      vi.fn(() => Promise.resolve()),
      vi.fn(() => Promise.resolve()),
    ];
    const onError = vi.fn();

    tasks.forEach(task => dispatchAvatarUploadTask(task, onError));
    await Promise.resolve();

    expect(tasks.every(task => task.mock.calls.length === 1)).toBe(true);
    expect(onError).not.toHaveBeenCalled();
    firstUpload.resolve();
  });

  it("后台任务失败时交给入口错误处理器", async () => {
    const error = new Error("upload failed");
    const onError = vi.fn();

    dispatchAvatarUploadTask(() => Promise.reject(error), onError);

    await vi.waitFor(() => {
      expect(onError).toHaveBeenCalledWith(error);
    });
  });
});
