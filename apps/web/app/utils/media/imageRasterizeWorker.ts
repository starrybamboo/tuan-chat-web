type RasterizeImageWorkerProfile = {
  maxSizeKB: number;
  maxWidthOrHeight: number;
  quality: number;
};

type RasterizeImageWorkerRequest = {
  bitmap: ImageBitmap;
  profile: RasterizeImageWorkerProfile;
};

type RasterizeImageWorkerResponse = {
  blob?: Blob;
  error?: string;
};

function drawBitmapToCanvas(bitmap: ImageBitmap, width: number, height: number): OffscreenCanvas {
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("当前环境不支持图片派生文件生成");
  }
  context.drawImage(bitmap, 0, 0, width, height);
  return canvas;
}

async function rasterizeBitmapToWebp(bitmap: ImageBitmap, profile: RasterizeImageWorkerProfile): Promise<Blob> {
  const sourceWidth = Math.max(1, bitmap.width);
  const sourceHeight = Math.max(1, bitmap.height);
  const maxSize = Math.max(1, profile.maxWidthOrHeight);
  const scale = Math.min(1, maxSize / Math.max(sourceWidth, sourceHeight));
  const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
  const targetHeight = Math.max(1, Math.round(sourceHeight * scale));
  let currentCanvas = drawBitmapToCanvas(bitmap, targetWidth, targetHeight);
  let best: Blob | null = null;
  const candidateQualities = [
    profile.quality,
    Math.max(0.05, profile.quality * 0.85),
    Math.max(0.05, profile.quality * 0.7),
    Math.max(0.05, profile.quality * 0.55),
    Math.max(0.05, profile.quality * 0.4),
  ];
  const maxBytes = profile.maxSizeKB * 1024;

  for (let round = 0; round < 5; round += 1) {
    for (const candidateQuality of candidateQualities) {
      const blob = await currentCanvas.convertToBlob({
        quality: candidateQuality,
        type: "image/webp",
      });
      if (!best || blob.size < best.size) {
        best = blob;
      }
      if (blob.size <= maxBytes) {
        return blob;
      }
    }

    if (best && best.size <= maxBytes) {
      return best;
    }

    const shrink = 0.75;
    const nextWidth = Math.max(1, Math.round(currentCanvas.width * shrink));
    const nextHeight = Math.max(1, Math.round(currentCanvas.height * shrink));
    const nextCanvas = new OffscreenCanvas(nextWidth, nextHeight);
    const nextContext = nextCanvas.getContext("2d");
    if (!nextContext) {
      throw new Error("当前环境不支持图片派生文件生成");
    }
    nextContext.drawImage(currentCanvas, 0, 0, nextWidth, nextHeight);
    currentCanvas = nextCanvas;
  }

  throw new Error(`图片派生文件超过 ${profile.maxSizeKB}KB`);
}

self.onmessage = (event: MessageEvent<RasterizeImageWorkerRequest>) => {
  void (async () => {
    const { bitmap, profile } = event.data;
    try {
      const blob = await rasterizeBitmapToWebp(bitmap, profile);
      bitmap.close();
      const response: RasterizeImageWorkerResponse = { blob };
      self.postMessage(response);
    }
    catch (error) {
      bitmap.close();
      const response: RasterizeImageWorkerResponse = {
        error: error instanceof Error ? error.message : String(error),
      };
      self.postMessage(response);
    }
  })();
};

export {};
