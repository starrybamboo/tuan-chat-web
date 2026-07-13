import type { PixelCrop } from "react-image-crop";

export const DEFAULT_CROP_COMMIT_DELAY_MS = 50;

function isSamePixelCrop(left: PixelCrop | undefined, right: PixelCrop | undefined) {
  return left === right || Boolean(
    left
    && right
    && left.x === right.x
    && left.y === right.y
    && left.width === right.width
    && left.height === right.height,
  );
}

/** 将高频裁剪坐标保存在实例内，只向 React 提交交互末尾的最终值。 */
export class DeferredCropCommit {
  private committedCrop: PixelCrop | undefined;
  private latestCrop: PixelCrop | undefined;
  private sourceKey = "";
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly commit: (crop: PixelCrop) => void,
    private readonly delayMs = DEFAULT_CROP_COMMIT_DELAY_MS,
  ) {}

  schedule(sourceKey: string, crop: PixelCrop) {
    const isFirstCropForSource = this.sourceKey !== sourceKey;
    if (isFirstCropForSource) {
      this.sourceKey = sourceKey;
      this.committedCrop = undefined;
    }
    this.latestCrop = crop;
    this.cancelTimer();

    if (isFirstCropForSource) {
      this.commitLatest();
      return;
    }

    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.commitLatest();
    }, this.delayMs);
  }

  flush() {
    this.cancelTimer();
    this.commitLatest();
  }

  cancel() {
    this.cancelTimer();
  }

  reset() {
    this.cancelTimer();
    this.committedCrop = undefined;
    this.latestCrop = undefined;
    this.sourceKey = "";
  }

  getLatest() {
    return this.latestCrop;
  }

  private cancelTimer() {
    if (this.timer !== undefined) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  private commitLatest() {
    if (!this.latestCrop || isSamePixelCrop(this.committedCrop, this.latestCrop)) {
      return;
    }
    this.committedCrop = this.latestCrop;
    this.commit(this.latestCrop);
  }
}
