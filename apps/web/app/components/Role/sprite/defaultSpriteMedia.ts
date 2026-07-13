import type { GeneratedMediaUploadFiles, UploadedMediaFile, UploadMediaFileOptions } from "@/utils/media/mediaUpload";
import type { SpriteCropContext } from "api";

import { generateOriginalFirstImageUploadFiles, uploadGeneratedMediaFiles } from "@/utils/media/mediaUpload";

type ImageDimensions = {
  width: number;
  height: number;
};

type DefaultSpriteMediaUploadDeps = {
  generateOriginalFirstImageUploadFiles?: typeof generateOriginalFirstImageUploadFiles;
  readImageFileDimensions?: (file: File) => Promise<ImageDimensions>;
  uploadGeneratedMediaFiles?: (payload: GeneratedMediaUploadFiles, options?: UploadMediaFileOptions) => Promise<UploadedMediaFile>;
};

export type DefaultSpriteMediaUploadResult = {
  origin: UploadedMediaFile;
  sprite: UploadedMediaFile;
  spriteCropContext: SpriteCropContext;
};

export function createFullSpriteCropContext(
  dimensions: ImageDimensions,
  sourceOriginFileId: number,
): SpriteCropContext {
  const width = Math.round(dimensions.width);
  const height = Math.round(dimensions.height);
  if (!width || !height || !sourceOriginFileId) {
    throw new Error("无法生成默认立绘裁剪上下文");
  }

  return {
    sourceOriginFileId,
    sourceWidth: width,
    sourceHeight: height,
    crop: {
      x: 0,
      y: 0,
      width,
      height,
    },
    outputWidth: width,
    outputHeight: height,
  };
}

export async function readImageFileDimensions(file: File): Promise<ImageDimensions> {
  if (typeof globalThis.createImageBitmap === "function") {
    const bitmap = await globalThis.createImageBitmap(file);
    try {
      return {
        width: bitmap.width,
        height: bitmap.height,
      };
    }
    finally {
      bitmap.close();
    }
  }

  if (typeof Image === "undefined" || typeof URL === "undefined") {
    throw new Error("当前环境不支持读取图片尺寸");
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    return await new Promise<ImageDimensions>((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        resolve({
          width: image.naturalWidth || image.width,
          height: image.naturalHeight || image.height,
        });
      };
      image.onerror = () => reject(new Error("读取图片尺寸失败"));
      image.src = objectUrl;
    });
  }
  finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function uploadOriginAndDefaultSpriteMedia(
  file: File,
  options: UploadMediaFileOptions = {},
  deps: DefaultSpriteMediaUploadDeps = {},
): Promise<DefaultSpriteMediaUploadResult> {
  const generate = deps.generateOriginalFirstImageUploadFiles ?? generateOriginalFirstImageUploadFiles;
  const upload = deps.uploadGeneratedMediaFiles ?? uploadGeneratedMediaFiles;
  const readDimensions = deps.readImageFileDimensions ?? readImageFileDimensions;

  const payload = await generate(file, options.scene);
  if (payload.mediaType !== "image") {
    throw new Error("默认立绘只能使用图片文件");
  }

  const dimensions = await readDimensions(payload.original);
  const origin = await upload(payload, {
    ...options,
    completeAfterPrimaryQuality: true,
    deferPrimaryCompletion: true,
  });

  return {
    origin,
    sprite: origin,
    spriteCropContext: createFullSpriteCropContext(dimensions, origin.fileId),
  };
}
