import type { InpaintFocusRect } from "@/components/aiImage/types";

import {
  base64DataUrl,
  base64ToBytes,
  dataUrlToBase64,
} from "@/components/aiImage/helpers";
import {
  buildBinaryMaskGrid,
  dilateMaskGrid,
  renderMaskGridToRgba,
  resolveNovelAiMaskBufferSize,
} from "@/components/aiImage/inpaintMaskUtils";
import {
  embedNovelAiMetadataIntoPngBytes,
  extractNovelAiMetadataFromPngBytes,
  extractNovelAiMetadataFromStealthPixels,
} from "@/utils/media/novelaiImageMetadata";

export type FocusedCropRect = InpaintFocusRect;

export type FocusedTargetSize = {
  width: number;
  height: number;
};

export type PreparedInpaintPayload = {
  cropRect: FocusedCropRect | null;
  targetSize: FocusedTargetSize;
  sourceImageBase64: string;
  maskBase64: string;
};

const FOCUSED_TARGET_AREA = 1024 * 1024;
const FOCUSED_MAX_DIMENSION = 1024;
const MASK_ACTIVE_THRESHOLD = 155;
const COMPOSITE_MASK_DILATION_RADIUS = 4;
const COMPOSITE_MASK_BLUR_PX = 20;

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

export function normalizeInpaintFocusRect(
  rect: InpaintFocusRect | null | undefined,
  imageWidth: number,
  imageHeight: number,
) {
  if (!rect || imageWidth <= 0 || imageHeight <= 0)
    return null;

  const left = clamp(Math.floor(rect.left), 0, imageWidth - 1);
  const top = clamp(Math.floor(rect.top), 0, imageHeight - 1);
  const right = clamp(Math.ceil(rect.left + rect.width), left + 1, imageWidth);
  const bottom = clamp(Math.ceil(rect.top + rect.height), top + 1, imageHeight);
  return {
    left,
    top,
    width: right - left,
    height: bottom - top,
  } satisfies InpaintFocusRect;
}

export function resolveInpaintFocusRectFromPoints(
  start: { x: number; y: number },
  end: { x: number; y: number },
  imageWidth: number,
  imageHeight: number,
) {
  const left = Math.min(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);
  if (width < 1 || height < 1)
    return null;
  return normalizeInpaintFocusRect({ left, top, width, height }, imageWidth, imageHeight);
}

export function resolveInpaintCompositeMaskGrid(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  overlayOriginalImage: boolean,
) {
  const authoredMask = buildBinaryMaskGrid(data, MASK_ACTIVE_THRESHOLD);
  return overlayOriginalImage
    ? authoredMask
    : dilateMaskGrid(authoredMask, width, height, COMPOSITE_MASK_DILATION_RADIUS);
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

function createOpaqueRequestMask(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context)
    throw new Error("无法读取 Inpaint 请求蒙版。");

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  for (let index = 0; index < imageData.data.length; index += 4) {
    const value = imageData.data[index + 3] >= MASK_ACTIVE_THRESHOLD ? 255 : 0;
    imageData.data[index] = value;
    imageData.data[index + 1] = value;
    imageData.data[index + 2] = value;
    imageData.data[index + 3] = 255;
  }
  context.putImageData(imageData, 0, 0);
}

export async function prepareInpaintPayload(args: {
  sourceDataUrl: string;
  maskDataUrl: string;
  focusedArea?: InpaintFocusRect | null;
  requestWidth: number;
  requestHeight: number;
}) {
  const sourceImage = await loadImage(args.sourceDataUrl);
  const maskImage = await loadImage(args.maskDataUrl);
  const imageWidth = sourceImage.naturalWidth;
  const imageHeight = sourceImage.naturalHeight;
  const focusedArea = normalizeInpaintFocusRect(args.focusedArea, imageWidth, imageHeight);
  const cropRect = focusedArea ?? {
    left: 0,
    top: 0,
    width: imageWidth,
    height: imageHeight,
  };
  const targetSize = focusedArea
    ? resolveFocusedTargetSize(cropRect.width, cropRect.height)
    : {
        width: roundToMultipleOf64(args.requestWidth, imageWidth),
        height: roundToMultipleOf64(args.requestHeight, imageHeight),
      };

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
    throw new Error("无法裁剪 Inpaint 蒙版。");
  croppedMaskContext.clearRect(0, 0, targetSize.width, targetSize.height);
  croppedMaskContext.imageSmoothingEnabled = false;
  croppedMaskContext.drawImage(
    maskImage,
    cropRect.left,
    cropRect.top,
    cropRect.width,
    cropRect.height,
    0,
    0,
    targetSize.width,
    targetSize.height,
  );
  createOpaqueRequestMask(croppedMaskCanvas);

  return {
    cropRect: focusedArea,
    targetSize,
    sourceImageBase64: canvasToPngBase64(sourceCanvas),
    maskBase64: canvasToPngBase64(croppedMaskCanvas),
  } satisfies PreparedInpaintPayload;
}

async function buildCompositeMaskCanvas(args: {
  maskDataUrl: string;
  width: number;
  height: number;
  overlayOriginalImage: boolean;
}) {
  const maskImage = await loadImage(args.maskDataUrl);
  const lowResolutionSize = resolveNovelAiMaskBufferSize(args.width, args.height);
  const lowResolutionCanvas = document.createElement("canvas");
  lowResolutionCanvas.width = lowResolutionSize.width;
  lowResolutionCanvas.height = lowResolutionSize.height;
  const lowResolutionContext = lowResolutionCanvas.getContext("2d", { willReadFrequently: true });
  if (!lowResolutionContext)
    throw new Error("无法读取 Inpaint 合成蒙版。");
  lowResolutionContext.clearRect(0, 0, lowResolutionCanvas.width, lowResolutionCanvas.height);
  lowResolutionContext.imageSmoothingEnabled = false;
  lowResolutionContext.drawImage(maskImage, 0, 0, lowResolutionCanvas.width, lowResolutionCanvas.height);

  const lowResolutionPixels = lowResolutionContext.getImageData(0, 0, lowResolutionCanvas.width, lowResolutionCanvas.height);
  const compositeMask = resolveInpaintCompositeMaskGrid(
    lowResolutionPixels.data,
    lowResolutionCanvas.width,
    lowResolutionCanvas.height,
    args.overlayOriginalImage,
  );
  const binaryMaskPixels = lowResolutionContext.createImageData(lowResolutionCanvas.width, lowResolutionCanvas.height);
  binaryMaskPixels.data.set(renderMaskGridToRgba(compositeMask));
  lowResolutionContext.putImageData(binaryMaskPixels, 0, 0);

  const scaledMaskCanvas = document.createElement("canvas");
  scaledMaskCanvas.width = args.width;
  scaledMaskCanvas.height = args.height;
  const scaledMaskContext = scaledMaskCanvas.getContext("2d");
  if (!scaledMaskContext)
    throw new Error("无法缩放 Inpaint 合成蒙版。");
  scaledMaskContext.imageSmoothingEnabled = false;
  scaledMaskContext.drawImage(lowResolutionCanvas, 0, 0, args.width, args.height);
  if (args.overlayOriginalImage)
    return scaledMaskCanvas;

  const featheredMaskCanvas = document.createElement("canvas");
  featheredMaskCanvas.width = args.width;
  featheredMaskCanvas.height = args.height;
  const featheredMaskContext = featheredMaskCanvas.getContext("2d");
  if (!featheredMaskContext)
    throw new Error("无法羽化 Inpaint 合成蒙版。");
  featheredMaskContext.fillStyle = "#000";
  featheredMaskContext.fillRect(0, 0, args.width, args.height);
  if ("filter" in featheredMaskContext)
    featheredMaskContext.filter = `blur(${COMPOSITE_MASK_BLUR_PX}px)`;
  featheredMaskContext.drawImage(scaledMaskCanvas, 0, 0);
  if ("filter" in featheredMaskContext)
    featheredMaskContext.filter = "none";
  return featheredMaskCanvas;
}

export async function compositeInpaintResult(args: {
  sourceDataUrl: string;
  generatedDataUrl: string;
  fullMaskDataUrl: string;
  cropRect: FocusedCropRect | null;
  overlayOriginalImage: boolean;
}) {
  const sourceImage = await loadImage(args.sourceDataUrl);
  const generatedImage = await loadImage(args.generatedDataUrl);
  const outputWidth = args.cropRect ? sourceImage.naturalWidth : generatedImage.naturalWidth;
  const outputHeight = args.cropRect ? sourceImage.naturalHeight : generatedImage.naturalHeight;
  const destinationRect = args.cropRect ?? {
    left: 0,
    top: 0,
    width: outputWidth,
    height: outputHeight,
  };

  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = outputWidth;
  outputCanvas.height = outputHeight;
  const outputContext = outputCanvas.getContext("2d", { willReadFrequently: true });
  if (!outputContext)
    throw new Error("无法合成 Inpaint 结果。");
  outputContext.drawImage(sourceImage, 0, 0, outputCanvas.width, outputCanvas.height);

  const cropCanvas = document.createElement("canvas");
  cropCanvas.width = destinationRect.width;
  cropCanvas.height = destinationRect.height;
  const cropContext = cropCanvas.getContext("2d", { willReadFrequently: true });
  if (!cropContext)
    throw new Error("无法读取 Inpaint 结果。");
  cropContext.imageSmoothingEnabled = true;
  cropContext.drawImage(generatedImage, 0, 0, cropCanvas.width, cropCanvas.height);

  const fullMaskCanvas = await buildCompositeMaskCanvas({
    maskDataUrl: args.fullMaskDataUrl,
    width: outputWidth,
    height: outputHeight,
    overlayOriginalImage: args.overlayOriginalImage,
  });
  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = destinationRect.width;
  maskCanvas.height = destinationRect.height;
  const maskContext = maskCanvas.getContext("2d", { willReadFrequently: true });
  if (!maskContext)
    throw new Error("无法读取 Inpaint 蒙版。");
  maskContext.imageSmoothingEnabled = true;
  maskContext.drawImage(
    fullMaskCanvas,
    destinationRect.left,
    destinationRect.top,
    destinationRect.width,
    destinationRect.height,
    0,
    0,
    destinationRect.width,
    destinationRect.height,
  );

  const sourceCrop = outputContext.getImageData(destinationRect.left, destinationRect.top, destinationRect.width, destinationRect.height);
  const generatedCrop = cropContext.getImageData(0, 0, destinationRect.width, destinationRect.height);
  const maskCrop = maskContext.getImageData(0, 0, destinationRect.width, destinationRect.height);
  const blended = outputContext.createImageData(destinationRect.width, destinationRect.height);

  for (let index = 0; index < blended.data.length; index += 4) {
    const alpha = maskCrop.data[index] / 255;
    blended.data[index] = Math.round(sourceCrop.data[index] * (1 - alpha) + generatedCrop.data[index] * alpha);
    blended.data[index + 1] = Math.round(sourceCrop.data[index + 1] * (1 - alpha) + generatedCrop.data[index + 1] * alpha);
    blended.data[index + 2] = Math.round(sourceCrop.data[index + 2] * (1 - alpha) + generatedCrop.data[index + 2] * alpha);
    blended.data[index + 3] = 255;
  }

  outputContext.putImageData(blended, destinationRect.left, destinationRect.top);
  const compositedDataUrl = outputCanvas.toDataURL("image/png");
  return await preserveCompositeNovelAiMetadata({
    compositedDataUrl,
    generatedCropDataUrl: args.generatedDataUrl,
    sourceDataUrl: args.sourceDataUrl,
  });
}
