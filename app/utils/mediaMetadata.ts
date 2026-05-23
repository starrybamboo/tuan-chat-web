export type MediaDimensions = {
  height: number;
  width: number;
};

function createObjectUrl(file: File): string {
  if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
    throw new TypeError("当前环境不支持读取媒体元数据");
  }
  return URL.createObjectURL(file);
}

function revokeObjectUrl(url: string): void {
  try {
    URL.revokeObjectURL(url);
  }
  catch {
    // ignore
  }
}

/**
 * 读取音视频时长，返回四舍五入后的秒数。
 */
export async function readMediaDuration(file: File): Promise<number | undefined> {
  const objectUrl = createObjectUrl(file);

  try {
    return await new Promise<number | undefined>((resolve) => {
      const element = document.createElement(file.type.startsWith("video/") ? "video" : "audio");
      const cleanup = () => {
        element.onloadedmetadata = null;
        element.onerror = null;
        revokeObjectUrl(objectUrl);
      };

      element.preload = "metadata";
      element.src = objectUrl;
      element.onloadedmetadata = () => {
        const duration = Number.isFinite(element.duration) && element.duration > 0
          ? Math.max(1, Math.round(element.duration))
          : undefined;
        cleanup();
        resolve(duration);
      };
      element.onerror = () => {
        cleanup();
        resolve(undefined);
      };
    });
  }
  catch {
    revokeObjectUrl(objectUrl);
    return undefined;
  }
}

/**
 * 读取图片尺寸。
 */
export async function readImageDimensions(file: File): Promise<MediaDimensions> {
  const objectUrl = createObjectUrl(file);

  return await new Promise<MediaDimensions>((resolve, reject) => {
    const image = new Image();
    const cleanup = () => {
      image.onload = null;
      image.onerror = null;
      revokeObjectUrl(objectUrl);
    };

    image.onload = () => {
      cleanup();
      resolve({
        height: image.naturalHeight || image.height,
        width: image.naturalWidth || image.width,
      });
    };
    image.onerror = () => {
      cleanup();
      reject(new Error("无法读取图片尺寸"));
    };
    image.src = objectUrl;
  });
}

/**
 * 读取视频尺寸。
 */
export async function readVideoDimensions(file: File): Promise<MediaDimensions> {
  const objectUrl = createObjectUrl(file);

  return await new Promise<MediaDimensions>((resolve, reject) => {
    const video = document.createElement("video");
    const cleanup = () => {
      video.onloadedmetadata = null;
      video.onerror = null;
      revokeObjectUrl(objectUrl);
    };

    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const width = video.videoWidth;
      const height = video.videoHeight;
      cleanup();
      if (width > 0 && height > 0) {
        resolve({ height, width });
        return;
      }
      reject(new Error("无法读取视频尺寸"));
    };
    video.onerror = () => {
      cleanup();
      reject(new Error("无法读取视频尺寸"));
    };
    video.src = objectUrl;
  });
}
