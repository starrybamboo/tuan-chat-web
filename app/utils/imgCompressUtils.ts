import bundledImageCompressionLibUrl from "browser-image-compression/dist/browser-image-compression.js?url";

import {
  embedNovelAiMetadataIntoWebpBytes,
  extractNovelAiMetadataFromPngBytes,
  extractNovelAiMetadataFromWebpBytes,
} from "@/utils/novelaiImageMetadata";

export type MediaType = "image" | "audio" | "video" | "document" | "other";
export type MediaQuality = "original" | "low" | "medium" | "high";

export const MEDIA_COMPRESSION_PROFILES = {
  image: {
    low: {
      maxWidthOrHeight: 200,
      maxSizeKB: 30,
      quality: 0.72,
      fileType: "image/webp",
      preserveNovelAiMetadata: false,
      forceOutput: true,
    },
    medium: {
      maxWidthOrHeight: 512,
      maxSizeKB: 150,
      quality: 0.76,
      fileType: "image/webp",
      preserveNovelAiMetadata: true,
      forceOutput: true,
    },
    high: {
      maxWidthOrHeight: 2560,
      maxSizeKB: 800,
      quality: 0.82,
      fileType: "image/webp",
      preserveNovelAiMetadata: true,
      forceOutput: true,
    },
  },
  audio: {
    low: { bitrateKbps: 64, fileType: "audio/webm" },
    medium: { bitrateKbps: 128, fileType: "audio/webm" },
    high: { bitrateKbps: 192, fileType: "audio/webm" },
  },
  video: {
    low: { maxHeight: 360, crf: 42, fileType: "video/webm" },
    medium: { maxHeight: 720, crf: 36, fileType: "video/webm" },
    high: { maxHeight: 1080, crf: 32, fileType: "video/webm" },
  },
} as const;

export const BUSINESS_MEDIA_QUALITY = {
  avatarThumb: { mediaType: "image", quality: "low" },
  avatar: { mediaType: "image", quality: "medium" },
  avatarOriginal: { mediaType: "image", quality: "original" },
  originalAvatar: { mediaType: "image", quality: "original" },
  smallThumbnail: { mediaType: "image", quality: "low" },
  listCover: { mediaType: "image", quality: "medium" },
  cardCover: { mediaType: "image", quality: "medium" },
  contentImage: { mediaType: "image", quality: "high" },
  hdCover: { mediaType: "image", quality: "high" },
  videoCover: { mediaType: "image", quality: "high" },
} as const satisfies Record<string, { mediaType: MediaType; quality: MediaQuality }>;

export const IMAGE_COMPRESSION_PRESETS = {
  smallThumbnail: {
    label: "小缩略图",
    ...MEDIA_COMPRESSION_PROFILES.image.low,
  },
  listCover: {
    label: "列表封面",
    ...MEDIA_COMPRESSION_PROFILES.image.medium,
  },
  cardCover: {
    label: "卡片封面",
    ...MEDIA_COMPRESSION_PROFILES.image.medium,
  },
  contentImage: {
    label: "正文图片",
    ...MEDIA_COMPRESSION_PROFILES.image.high,
  },
  hdCover: {
    label: "高清封面",
    ...MEDIA_COMPRESSION_PROFILES.image.high,
  },
  avatar: {
    label: "头像",
    ...MEDIA_COMPRESSION_PROFILES.image.medium,
  },
  avatarThumb: {
    label: "头像缩略图",
    ...MEDIA_COMPRESSION_PROFILES.image.low,
  },
  videoCover: {
    label: "视频封面（历史 preset，映射到 high）",
    ...MEDIA_COMPRESSION_PROFILES.image.high,
  },
} as const;

export type ImageCompressionPreset = keyof typeof IMAGE_COMPRESSION_PRESETS;

export type ImageCompressionOptions = {
  maxWidthOrHeight?: number;
  maxSizeKB?: number;
  quality?: number;
  fileType?: string;
  preserveNovelAiMetadata?: boolean;
  forceOutput?: boolean;
};

export const DEFAULT_IMAGE_COMPRESSION_OPTIONS: ImageCompressionOptions = {
  maxWidthOrHeight: 2560,
  quality: 0.7,
};

type NormalizedImageCompressionOptions = {
  maxWidthOrHeight: number;
  maxSizeMB?: number;
  quality: number;
  fileType: string;
  preserveNovelAiMetadata: boolean;
  forceOutput: boolean;
};

function toAbsoluteUrl(url: string): string {
  if (typeof window === "undefined") {
    return url;
  }
  try {
    return new URL(url, window.location.href).toString();
  }
  catch {
    return url;
  }
}

function normalizeQuality(quality: number | undefined): number {
  if (!Number.isFinite(quality)) {
    return DEFAULT_IMAGE_COMPRESSION_OPTIONS.quality ?? 0.7;
  }
  return Math.min(1, Math.max(0.05, Number(quality)));
}

export function resolveImageCompressionOptions(
  options: ImageCompressionOptions = DEFAULT_IMAGE_COMPRESSION_OPTIONS,
): NormalizedImageCompressionOptions {
  const normalizedMaxWidthOrHeight = Number.isFinite(options.maxWidthOrHeight)
    ? Math.max(1, Math.floor(options.maxWidthOrHeight ?? DEFAULT_IMAGE_COMPRESSION_OPTIONS.maxWidthOrHeight ?? 2560))
    : DEFAULT_IMAGE_COMPRESSION_OPTIONS.maxWidthOrHeight ?? 2560;
  const normalizedMaxSizeMB = Number.isFinite(options.maxSizeKB)
    ? Math.max(1, Math.floor(options.maxSizeKB ?? 0)) / 1024
    : undefined;

  return {
    maxWidthOrHeight: normalizedMaxWidthOrHeight,
    maxSizeMB: normalizedMaxSizeMB,
    quality: normalizeQuality(options.quality),
    fileType: options.fileType || "image/webp",
    preserveNovelAiMetadata: options.preserveNovelAiMetadata === true,
    forceOutput: options.forceOutput === true,
  };
}

async function extractNovelAiMetadataFromFile(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  return extractNovelAiMetadataFromPngBytes(bytes) || extractNovelAiMetadataFromWebpBytes(bytes);
}

async function preserveWebpNovelAiMetadata(
  outputFile: File,
  sourceMetadata: Awaited<ReturnType<typeof extractNovelAiMetadataFromFile>>,
  maxSizeKB?: number,
) {
  if (!sourceMetadata || outputFile.type !== "image/webp")
    return outputFile;

  const embeddedBytes = embedNovelAiMetadataIntoWebpBytes(
    new Uint8Array(await outputFile.arrayBuffer()),
    sourceMetadata,
  );
  const verified = extractNovelAiMetadataFromWebpBytes(embeddedBytes);
  if (!verified) {
    throw new Error("NovelAI 元数据写入 WebP 后无法读回，已阻止上传");
  }

  if (Number.isFinite(maxSizeKB) && embeddedBytes.byteLength > Math.floor(maxSizeKB! * 1024)) {
    throw new Error(`保留 NovelAI 元数据后图片超过 ${maxSizeKB}KB，已阻止上传`);
  }

  return new File([embeddedBytes], outputFile.name, {
    type: "image/webp",
    lastModified: outputFile.lastModified,
  });
}

/**
 * 将图片压缩成webp，会改变原来的文件名和后缀（加上时间戳，去除空格，改为webp）
 * GIF文件将保持原格式以保留动画效果
 * @param file
 * @param options 压缩配置，quality 使用 0~1 小数
 */
export async function compressImage(
  file: File,
  options: ImageCompressionOptions = DEFAULT_IMAGE_COMPRESSION_OPTIONS,
): Promise<File> {
  if (!file.type.startsWith("image/")) {
    return file;
  }

  // 如果是GIF文件，只重命名不压缩，保持动画效果
  if (file.type === "image/gif") {
    const newName = file.name.replace(/(\.[^.]+)?$/, `_${Date.now()}.gif`).split(" ").join("");
    return new File([file], newName, {
      type: "image/gif",
    });
  }

  const { default: imageCompression } = await import("browser-image-compression");
  const compressionOptions = resolveImageCompressionOptions(options);
  const sourceMetadata = compressionOptions.preserveNovelAiMetadata
    ? await extractNovelAiMetadataFromFile(file)
    : null;

  const safeQuality = compressionOptions.quality;
  const candidateQualities = [
    safeQuality,
    Math.max(0.05, safeQuality * 0.85),
    Math.max(0.05, safeQuality * 0.7),
    Math.max(0.05, safeQuality * 0.55),
  ];

  const compressWithQuality = async (q: number): Promise<File> => {
    const compressedBlobOrFile = await imageCompression(file, {
      maxWidthOrHeight: compressionOptions.maxWidthOrHeight,
      maxSizeMB: compressionOptions.maxSizeMB,
      // 0~1，和 canvas.toBlob 的 quality 对齐
      initialQuality: q,
      fileType: compressionOptions.fileType,
      useWebWorker: true,
      // 显式指定同源脚本，避免默认回退到 jsdelivr（中国网络下可能不可用）
      libURL: toAbsoluteUrl(bundledImageCompressionLibUrl),
    });

    const extension = compressionOptions.fileType.split("/")[1] || "webp";
    const newName = file.name.replace(/(\.[^.]+)?$/, `_${Date.now()}.${extension}`).split(" ").join("");
    // browser-image-compression 返回值可能是 File 或 Blob，这里统一包一层 File
    const outputFile = new File([compressedBlobOrFile], newName, {
      type: compressionOptions.fileType,
    });
    return await preserveWebpNovelAiMetadata(outputFile, sourceMetadata, options.maxSizeKB);
  };

  // 优先选择“更小”的结果；如果压缩反而变大，则尝试降低质量重试
  let best = await compressWithQuality(candidateQualities[0]);
  if (best.size < file.size) {
    return best;
  }

  for (const q of candidateQualities.slice(1)) {
    const next = await compressWithQuality(q);
    if (next.size < best.size) {
      best = next;
    }
    if (best.size < file.size) {
      return best;
    }
  }

  // 旧链路默认避免上传体积反增；新媒体派生链路可强制输出固定格式。
  return compressionOptions.forceOutput ? best : file;
}

export function compressImageByPreset(file: File, preset: ImageCompressionPreset): Promise<File> {
  return compressImage(file, IMAGE_COMPRESSION_PRESETS[preset]);
}

export function compressSmallThumbnailImage(file: File): Promise<File> {
  return compressImageByPreset(file, "smallThumbnail");
}

export function compressListCoverImage(file: File): Promise<File> {
  return compressImageByPreset(file, "listCover");
}

export function compressCardCoverImage(file: File): Promise<File> {
  return compressImageByPreset(file, "cardCover");
}

export function compressContentImage(file: File): Promise<File> {
  return compressImageByPreset(file, "contentImage");
}

export function compressVideoCoverImage(file: File): Promise<File> {
  return compressImageByPreset(file, "videoCover");
}

export function compressHdCoverImage(file: File): Promise<File> {
  return compressImageByPreset(file, "hdCover");
}

export function compressAvatarImage(file: File): Promise<File> {
  return compressImageByPreset(file, "avatar");
}

export function compressAvatarThumbImage(file: File): Promise<File> {
  return compressImageByPreset(file, "avatarThumb");
}
