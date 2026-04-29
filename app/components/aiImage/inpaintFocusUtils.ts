import {
  base64DataUrl,
  base64ToBytes,
  dataUrlToBase64,
} from "@/components/aiImage/helpers";
import {
  embedNovelAiMetadataIntoPngBytes,
  extractNovelAiMetadataFromPngBytes,
  extractNovelAiMetadataFromStealthPixels,
} from "@/utils/novelaiImageMetadata";

export type FocusedMaskBounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

export type FocusedCropRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type FocusedTargetSize = {
  width: number;
  height: number;
};

export type PreparedFocusedInpaintPayload = {
  cropRect: FocusedCropRect;
  targetSize: FocusedTargetSize;
  sourceImageBase64: string;
  maskBase64: string;
};

const FOCUSED_TARGET_AREA = 1024 * 1024;
const FOCUSED_MAX_DIMENSION = 1024;
const FOCUSED_PADDING_MIN = 96;
const FOCUSED_PADDING_RATIO = 0.75;
const MASK_ACTIVE_THRESHOLD = 8;

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("读取 Focused Inpaint 图片失败。"));
    img.src = dataUrl;
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function roundToMultipleOf64(value: number, fallback: number) {
  if (!Number.isFinite(value) || value <= 0)
    return fallback;
  return Math.max(64, Math.round(value / 64) * 64);
}

export function findFocusedMaskBounds(data: Uint8ClampedArray, width: number, height: number) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const active = Math.max(data[index], data[index + 1], data[index + 2], data[index + 3]) >= MASK_ACTIVE_THRESHOLD;
      if (!active)
        continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < minX || maxY < minY)
    return null;

  return {
    left: minX,
    top: minY,
    right: maxX,
    bottom: maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  } satisfies FocusedMaskBounds;
}

export function resolveFocusedCropRect(bounds: FocusedMaskBounds, imageWidth: number, imageHeight: number) {
  const maxSpan = Math.max(bounds.width, bounds.height);
  const padding = Math.max(FOCUSED_PADDING_MIN, Math.round(maxSpan * FOCUSED_PADDING_RATIO));
  const desiredWidth = clamp(bounds.width + padding * 2, 64, imageWidth);
  const desiredHeight = clamp(bounds.height + padding * 2, 64, imageHeight);
  const centerX = bounds.left + bounds.width / 2;
  const centerY = bounds.top + bounds.height / 2;
  const left = clamp(Math.round(centerX - desiredWidth / 2), 0, Math.max(0, imageWidth - desiredWidth));
  const top = clamp(Math.round(centerY - desiredHeight / 2), 0, Math.max(0, imageHeight - desiredHeight));

  return {
    left,
    top,
    width: desiredWidth,
    height: desiredHeight,
  } satisfies FocusedCropRect;
}

export function resolveFocusedTargetSize(cropWidth: number, cropHeight: number) {
  const width = Math.max(1, cropWidth);
  const height = Math.max(1, cropHeight);
  const area = width * height;
  const upscale = area < FOCUSED_TARGET_AREA ? Math.sqrt(FOCUSED_TARGET_AREA / area) : 1;
  const cappedScale = Math.min(
    upscale,
    FOCUSED_MAX_DIMENSION / width,
    FOCUSED_MAX_DIMENSION / height,
  );
  const scaledWidth = roundToMultipleOf64(width * cappedScale, width);
  const scaledHeight = roundToMultipleOf64(height * cappedScale, height);

  return {
    width: clamp(scaledWidth, 64, FOCUSED_MAX_DIMENSION),
    height: clamp(scaledHeight, 64, FOCUSED_MAX_DIMENSION),
  } satisfies FocusedTargetSize;
}

function canvasToPngBase64(canvas: HTMLCanvasElement) {
  return dataUrlToBase64(canvas.toDataURL("image/png"));
}

async function extractNovelAiMetadataFromDataUrl(dataUrl: string) {
  const imageBase64 = dataUrlToBase64(dataUrl);
  if (!imageBase64)
    return null;

  const pngMetadata = extractNovelAiMetadataFromPngBytes(base64ToBytes(imageBase64));
  if (pngMetadata)
    return pngMetadata;

  const image = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context)
    return null;

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return extractNovelAiMetadataFromStealthPixels(context.getImageData(0, 0, canvas.width, canvas.height));
}

async function preserveCompositeNovelAiMetadata(args: {
  compositedDataUrl: string;
  generatedCropDataUrl: string;
  sourceDataUrl: string;
}) {
  try {
    const metadata = await extractNovelAiMetadataFromDataUrl(args.generatedCropDataUrl)
      || await extractNovelAiMetadataFromDataUrl(args.sourceDataUrl);
    if (!metadata)
      return args.compositedDataUrl;

    const compositedBytes = base64ToBytes(dataUrlToBase64(args.compositedDataUrl));
    if (!compositedBytes.length)
      return args.compositedDataUrl;

    return base64DataUrl(
      "image/png",
      embedNovelAiMetadataIntoPngBytes(compositedBytes, metadata),
    );
  }
  catch {
    return args.compositedDataUrl;
  }
}

export async function prepareFocusedInpaintPayload(args: {
  sourceDataUrl: string;
  maskDataUrl: string;
}) {
  const sourceImage = await loadImage(args.sourceDataUrl);
  const maskImage = await loadImage(args.maskDataUrl);
  const imageWidth = sourceImage.naturalWidth;
  const imageHeight = sourceImage.naturalHeight;

  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = imageWidth;
  maskCanvas.height = imageHeight;
  const maskContext = maskCanvas.getContext("2d", { willReadFrequently: true });
  if (!maskContext)
    throw new Error("无法读取 Focused Inpaint 蒙版。");
  maskContext.drawImage(maskImage, 0, 0, imageWidth, imageHeight);
  const maskPixels = maskContext.getImageData(0, 0, imageWidth, imageHeight);
  const bounds = findFocusedMaskBounds(maskPixels.data, imageWidth, imageHeight);
  if (!bounds)
    return null;

  const cropRect = resolveFocusedCropRect(bounds, imageWidth, imageHeight);
  const targetSize = resolveFocusedTargetSize(cropRect.width, cropRect.height);

  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = targetSize.width;
  sourceCanvas.height = targetSize.height;
  const sourceContext = sourceCanvas.getContext("2d");
  if (!sourceContext)
    throw new Error("无法裁剪 Focused Inpaint 源图。");
  sourceContext.imageSmoothingEnabled = true;
  sourceContext.drawImage(
    sourceImage,
    cropRect.left,
    cropRect.top,
    cropRect.width,
    cropRect.height,
    0,
    0,
    targetSize.width,
    targetSize.height,
  );

  const croppedMaskCanvas = document.createElement("canvas");
  croppedMaskCanvas.width = targetSize.width;
  croppedMaskCanvas.height = targetSize.height;
  const croppedMaskContext = croppedMaskCanvas.getContext("2d");
  if (!croppedMaskContext)
    throw new Error("无法裁剪 Focused Inpaint 蒙版。");
  croppedMaskContext.imageSmoothingEnabled = true;
  croppedMaskContext.drawImage(
    maskCanvas,
    cropRect.left,
    cropRect.top,
    cropRect.width,
    cropRect.height,
    0,
    0,
    targetSize.width,
    targetSize.height,
  );

  return {
    cropRect,
    targetSize,
    sourceImageBase64: canvasToPngBase64(sourceCanvas),
    maskBase64: canvasToPngBase64(croppedMaskCanvas),
  } satisfies PreparedFocusedInpaintPayload;
}

export async function compositeFocusedInpaintResult(args: {
  sourceDataUrl: string;
  generatedCropDataUrl: string;
  fullMaskDataUrl: string;
  cropRect: FocusedCropRect;
}) {
  const sourceImage = await loadImage(args.sourceDataUrl);
  const generatedCropImage = await loadImage(args.generatedCropDataUrl);
  const fullMaskImage = await loadImage(args.fullMaskDataUrl);

  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = sourceImage.naturalWidth;
  outputCanvas.height = sourceImage.naturalHeight;
  const outputContext = outputCanvas.getContext("2d", { willReadFrequently: true });
  if (!outputContext)
    throw new Error("无法合成 Focused Inpaint 结果。");
  outputContext.drawImage(sourceImage, 0, 0, outputCanvas.width, outputCanvas.height);

  const cropCanvas = document.createElement("canvas");
  cropCanvas.width = args.cropRect.width;
  cropCanvas.height = args.cropRect.height;
  const cropContext = cropCanvas.getContext("2d", { willReadFrequently: true });
  if (!cropContext)
    throw new Error("无法读取 Focused Inpaint 结果。");
  cropContext.imageSmoothingEnabled = true;
  cropContext.drawImage(generatedCropImage, 0, 0, cropCanvas.width, cropCanvas.height);

  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = args.cropRect.width;
  maskCanvas.height = args.cropRect.height;
  const maskContext = maskCanvas.getContext("2d", { willReadFrequently: true });
  if (!maskContext)
    throw new Error("无法读取 Focused Inpaint 蒙版。");
  maskContext.imageSmoothingEnabled = true;
  maskContext.drawImage(
    fullMaskImage,
    args.cropRect.left,
    args.cropRect.top,
    args.cropRect.width,
    args.cropRect.height,
    0,
    0,
    args.cropRect.width,
    args.cropRect.height,
  );

  const sourceCrop = outputContext.getImageData(args.cropRect.left, args.cropRect.top, args.cropRect.width, args.cropRect.height);
  const generatedCrop = cropContext.getImageData(0, 0, args.cropRect.width, args.cropRect.height);
  const maskCrop = maskContext.getImageData(0, 0, args.cropRect.width, args.cropRect.height);
  const blended = outputContext.createImageData(args.cropRect.width, args.cropRect.height);

  for (let index = 0; index < blended.data.length; index += 4) {
    const alpha = maskCrop.data[index] / 255;
    blended.data[index] = Math.round(sourceCrop.data[index] * (1 - alpha) + generatedCrop.data[index] * alpha);
    blended.data[index + 1] = Math.round(sourceCrop.data[index + 1] * (1 - alpha) + generatedCrop.data[index + 1] * alpha);
    blended.data[index + 2] = Math.round(sourceCrop.data[index + 2] * (1 - alpha) + generatedCrop.data[index + 2] * alpha);
    blended.data[index + 3] = 255;
  }

  outputContext.putImageData(blended, args.cropRect.left, args.cropRect.top);
  const compositedDataUrl = outputCanvas.toDataURL("image/png");
  return await preserveCompositeNovelAiMetadata({
    compositedDataUrl,
    generatedCropDataUrl: args.generatedCropDataUrl,
    sourceDataUrl: args.sourceDataUrl,
  });
}
