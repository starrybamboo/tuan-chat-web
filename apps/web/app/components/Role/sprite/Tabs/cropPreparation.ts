export type CropPreparationKeyInput = {
  sourceKey: string;
  imageSrc: string;
  naturalWidth: number;
  naturalHeight: number;
  displayWidth: number;
  displayHeight: number;
  crop: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

export function createCropPreparationKey(input: CropPreparationKeyInput) {
  const { crop } = input;
  return [
    input.sourceKey,
    input.imageSrc,
    input.naturalWidth,
    input.naturalHeight,
    input.displayWidth,
    input.displayHeight,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
  ].join("|");
}

/** 只保留当前图片最新裁剪任务，确认时可直接复用已开始的 Worker 结果。 */
export class CurrentCropPreparation {
  private current: { key: string; promise: Promise<Blob> } | undefined;

  prepare(key: string, create: () => Promise<Blob>) {
    const prepared = this.read(key);
    if (prepared) {
      return prepared;
    }

    const task = { key, promise: create() };
    this.current = task;
    void task.promise.catch(() => {
      if (this.current === task) {
        this.current = undefined;
      }
    });
    return task.promise;
  }

  read(key: string) {
    return this.current?.key === key ? this.current.promise : undefined;
  }

  clear() {
    this.current = undefined;
  }
}
