import type { PixelCrop } from "react-image-crop";

import { afterEach, describe, expect, it, vi } from "vitest";

import { DeferredCropCommit } from "./deferredCropCommit";

function createCrop(x: number): PixelCrop {
  return { unit: "px", x, y: 0, width: 100, height: 100 };
}

describe("DeferredCropCommit", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("连续坐标变化只提交最后一个值", () => {
    vi.useFakeTimers();
    const commits: PixelCrop[] = [];
    const scheduler = new DeferredCropCommit(crop => commits.push(crop), 50);

    scheduler.schedule("source-a", createCrop(0));
    commits.length = 0;
    for (let x = 1; x <= 64; x += 1) {
      scheduler.schedule("source-a", createCrop(x));
    }

    vi.advanceTimersByTime(49);
    expect(commits).toHaveLength(0);
    vi.advanceTimersByTime(1);
    expect(commits).toEqual([createCrop(64)]);
  });

  it("交互结束立即提交并清除尾随任务", () => {
    vi.useFakeTimers();
    const commits: PixelCrop[] = [];
    const scheduler = new DeferredCropCommit(crop => commits.push(crop), 50);

    scheduler.schedule("source-a", createCrop(0));
    commits.length = 0;
    scheduler.schedule("source-a", createCrop(20));
    scheduler.flush();

    expect(commits).toEqual([createCrop(20)]);
    vi.advanceTimersByTime(50);
    expect(commits).toHaveLength(1);
  });

  it("切换图片时立即提交首个裁剪值", () => {
    const commits: PixelCrop[] = [];
    const scheduler = new DeferredCropCommit(crop => commits.push(crop), 50);
    const crop = createCrop(0);

    scheduler.schedule("source-a", crop);
    scheduler.schedule("source-b", crop);

    expect(commits).toEqual([crop, crop]);
  });

  it("取消与重置会清理等待中的提交", () => {
    vi.useFakeTimers();
    const commits: PixelCrop[] = [];
    const scheduler = new DeferredCropCommit(crop => commits.push(crop), 50);

    scheduler.schedule("source-a", createCrop(0));
    commits.length = 0;
    scheduler.schedule("source-a", createCrop(10));
    expect(scheduler.getLatest()).toEqual(createCrop(10));

    scheduler.cancel();
    vi.advanceTimersByTime(50);
    expect(commits).toHaveLength(0);

    scheduler.reset();
    expect(scheduler.getLatest()).toBeUndefined();
  });
});
