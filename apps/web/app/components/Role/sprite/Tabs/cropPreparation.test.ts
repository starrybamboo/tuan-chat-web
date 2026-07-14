import { describe, expect, it, vi } from "vitest";

import { createCropPreparationKey, CurrentCropPreparation } from "./cropPreparation";

describe("CurrentCropPreparation", () => {
  it("同一裁剪参数复用已经开始的任务", async () => {
    const preparation = new CurrentCropPreparation();
    const blob = new Blob(["crop"]);
    const create = vi.fn(async () => blob);

    const first = preparation.prepare("same", create);
    const second = preparation.prepare("same", create);

    expect(second).toBe(first);
    expect(create).toHaveBeenCalledTimes(1);
    await expect(second).resolves.toBe(blob);
  });

  it("新参数替换旧任务并在失败后清理", async () => {
    const preparation = new CurrentCropPreparation();
    const failed = Promise.reject(new Error("failed"));

    preparation.prepare("old", async () => new Blob(["old"]));
    const current = preparation.prepare("new", () => failed);

    await expect(current).rejects.toThrow("failed");
    expect(preparation.read("new")).toBeUndefined();
  });
});

describe("createCropPreparationKey", () => {
  it("裁剪尺寸变化会生成不同缓存键", () => {
    const base = {
      sourceKey: "source",
      imageSrc: "blob:image",
      naturalWidth: 2000,
      naturalHeight: 3000,
      displayWidth: 400,
      displayHeight: 600,
      crop: { x: 0, y: 0, width: 400, height: 600 },
    };

    expect(createCropPreparationKey(base)).not.toBe(createCropPreparationKey({
      ...base,
      crop: { ...base.crop, width: 300 },
    }));
  });
});
