import { describe, expect, it, vi } from "vitest";

import { runAvatarBatchUpload } from "./avatarBatchUpload";

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });
  return { promise, resolve, reject };
}

describe("runAvatarBatchUpload", () => {
  it("并行准备上传资源，但按原顺序提交头像写入", async () => {
    const fileA = new File(["a"], "a.png", { type: "image/png" });
    const fileB = new File(["b"], "b.png", { type: "image/png" });
    const deferredA = createDeferred<{ fileName: string }>();
    const deferredB = createDeferred<{ fileName: string }>();
    const prepareUpload = vi.fn((file: File) => {
      if (file.name === "a.png") {
        return deferredA.promise;
      }
      return deferredB.promise;
    });
    const commitOrder: string[] = [];
    const progressEvents: Array<{ completed: number; total: number }> = [];

    const task = runAvatarBatchUpload({
      files: [fileA, fileB],
      prepareUpload,
      commitUpload: vi.fn(async (payload, context) => {
        commitOrder.push(`${context.index}:${payload.fileName}`);
      }),
      onProgress: (completed, total) => {
        progressEvents.push({ completed, total });
      },
    });

    await Promise.resolve();
    expect(prepareUpload).toHaveBeenCalledTimes(2);

    deferredB.resolve({ fileName: "b.png" });
    await Promise.resolve();
    expect(commitOrder).toEqual([]);

    deferredA.resolve({ fileName: "a.png" });
    await task;

    expect(commitOrder).toEqual(["0:a.png", "1:b.png"]);
    expect(progressEvents).toEqual([
      { completed: 1, total: 2 },
      { completed: 2, total: 2 },
    ]);
  });

  it("会聚合准备阶段和提交阶段错误，并继续处理后续文件", async () => {
    const fileA = new File(["a"], "a.png", { type: "image/png" });
    const fileB = new File(["b"], "b.png", { type: "image/png" });
    const fileC = new File(["c"], "c.png", { type: "image/png" });
    const onItemError = vi.fn();
    const commitUpload = vi.fn(async (payload: { fileName: string }, context: { index?: number }) => {
      if (context.index === 2) {
        throw new Error(`commit failed: ${payload.fileName}`);
      }
    });

    const result = await runAvatarBatchUpload({
      files: [fileA, fileB, fileC],
      prepareUpload: vi.fn(async (file: File) => {
        if (file.name === "b.png") {
          throw new Error("prepare failed: b.png");
        }
        return { fileName: file.name };
      }),
      commitUpload,
      onItemError,
    });

    expect(result).toEqual({ errorCount: 2 });
    expect(commitUpload).toHaveBeenCalledTimes(2);
    expect(onItemError).toHaveBeenCalledTimes(2);
    expect(onItemError.mock.calls[0]?.[1]).toMatchObject({ batch: true, index: 1, total: 3 });
    expect(onItemError.mock.calls[1]?.[1]).toMatchObject({ batch: true, index: 2, total: 3 });
  });
});
