/**
 * 图像裁剪 Worker Hook
 * 管理 Web Worker Pool 的生命周期和消息传递，支持并行处理
 */

import type { PixelCrop } from "react-image-crop";

import { useEffect, useRef } from "react";

type CropParams = {
  img: HTMLImageElement;
  crop: PixelCrop;
  scale?: number;
  rotate?: number;
};

type CropMessage = {
  type: "crop";
  imageBitmap: ImageBitmap; // 使用 ImageBitmap 替代 ImageData，支持 Transferable
  crop: PixelCrop;
  scale: number;
  rotate: number;
  pixelRatio: number;
  imageNaturalWidth: number;
  imageNaturalHeight: number;
  imageDisplayWidth: number;
  imageDisplayHeight: number;
};

type CropResponse = {
  type: "success" | "error";
  blob?: Blob;
  error?: string;
};

// Worker Pool 管理
class WorkerPool {
  private workers: Worker[] = [];
  private availableWorkers: Worker[] = [];
  private queue: Array<{ params: CropParams; resolve: (blob: Blob) => void; reject: (error: Error) => void }> = [];

  constructor(size: number = navigator.hardwareConcurrency || 4) {
    // 创建 Worker 池，数量基于 CPU 核心数
    const poolSize = Math.min(size, 8); // 最多 8 个 Worker
    for (let i = 0; i < poolSize; i++) {
      const worker = new Worker(
        new URL("./imageCrop.worker.ts", import.meta.url),
        { type: "module" },
      );
      this.workers.push(worker);
      this.availableWorkers.push(worker);
    }
  }

  async cropImage(params: CropParams): Promise<Blob> {
    return new Promise((resolve, reject) => {
      // 如果有空闲 Worker，立即处理
      if (this.availableWorkers.length > 0) {
        this.processTask(params, resolve, reject);
      }
      else {
        // 否则加入队列
        this.queue.push({ params, resolve, reject });
      }
    });
  }

  private async processTask(
    params: CropParams,
    resolve: (blob: Blob) => void,
    reject: (error: Error) => void,
  ) {
    const worker = this.availableWorkers.pop();
    if (!worker) {
      // 理论上不应该发生
      this.queue.push({ params, resolve, reject });
      return;
    }

    try {
      const blob = await this.executeOnWorker(worker, params);
      resolve(blob);
    }
    catch (error) {
      reject(error instanceof Error ? error : new Error("Unknown error"));
    }
    finally {
      // Worker 完成任务，标记为可用
      this.availableWorkers.push(worker);

      // 处理队列中的下一个任务
      if (this.queue.length > 0) {
        const next = this.queue.shift();
        if (next) {
          this.processTask(next.params, next.resolve, next.reject);
        }
      }
    }
  }

  private async executeOnWorker(worker: Worker, params: CropParams): Promise<Blob> {
    const { img, crop, scale = 1, rotate = 0 } = params;

    // 使用 createImageBitmap 创建可转移的 ImageBitmap
    // 这比 canvas 操作更快，且支持零拷贝转移到 Worker
    const imageBitmap = await createImageBitmap(img);

    // 准备消息
    const message: CropMessage = {
      type: "crop",
      imageBitmap,
      crop,
      scale,
      rotate,
      pixelRatio: window.devicePixelRatio,
      imageNaturalWidth: img.naturalWidth,
      imageNaturalHeight: img.naturalHeight,
      imageDisplayWidth: img.width,
      imageDisplayHeight: img.height,
    };

    // 发送到 Worker 并等待响应
    // 使用 Transferable Objects 零拷贝转移 ImageBitmap 所有权
    return new Promise((resolve, reject) => {
      const handleMessage = (e: MessageEvent<CropResponse>) => {
        const response = e.data;

        if (response.type === "success" && response.blob) {
          worker.removeEventListener("message", handleMessage);
          resolve(response.blob);
        }
        else if (response.type === "error") {
          worker.removeEventListener("message", handleMessage);
          reject(new Error(response.error || "Unknown worker error"));
        }
      };

      worker.addEventListener("message", handleMessage);
      // 第二个参数指定 transferable 对象，实现零拷贝转移
      worker.postMessage(message, [imageBitmap]);
    });
  }

  terminate() {
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];
    this.availableWorkers = [];
    this.queue = [];
  }
}

/**
 * 使用 Web Worker Pool 进行图像裁剪，支持并行处理
 */
export function useImageCropWorker() {
  const workerPoolRef = useRef<WorkerPool | null>(null);

  useEffect(() => {
    // 创建 Worker Pool
    workerPoolRef.current = new WorkerPool();

    return () => {
      // 清理所有 Worker
      workerPoolRef.current?.terminate();
      workerPoolRef.current = null;
    };
  }, []);

  /**
   * 使用 Worker Pool 裁剪图像（支持并行）
   */
  const cropImage = async (params: CropParams): Promise<Blob> => {
    if (!workerPoolRef.current) {
      throw new Error("Worker pool not initialized");
    }

    return workerPoolRef.current.cropImage(params);
  };

  return { cropImage };
}
