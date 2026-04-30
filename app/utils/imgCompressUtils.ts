import bundledImageCompressionLibUrl from "browser-image-compression/dist/browser-image-compression.js?url";

export const IMAGE_COMPRESSION_PRESETS = {
  smallThumbnail: {
    label: "小缩略图",
    maxWidthOrHeight: 200,
    maxSizeKB: 50,
    quality: 0.72,
  },
  listCover: {
    label: "列表封面",
    maxWidthOrHeight: 320,
    maxSizeKB: 120,
    quality: 0.72,
  },
  cardCover: {
    label: "卡片封面",
    maxWidthOrHeight: 480,
    maxSizeKB: 180,
    quality: 0.74,
  },
  contentImage: {
    label: "正文图片",
    maxWidthOrHeight: 800,
    maxSizeKB: 300,
    quality: 0.76,
  },
  videoCover: {
    label: "视频封面",
    maxWidthOrHeight: 1280,
    maxSizeKB: 1024,
    quality: 0.78,
  },
  hdCover: {
    label: "高清封面",
    maxWidthOrHeight: 1920,
    maxSizeKB: 2048,
    quality: 0.82,
  },
  avatar: {
    label: "头像",
    maxWidthOrHeight: 512,
    maxSizeKB: 150,
    quality: 0.76,
  },
  avatarThumb: {
    label: "头像缩略图",
    maxWidthOrHeight: 128,
    maxSizeKB: 40,
    quality: 0.72,
  },
} as const;

export type ImageCompressionPreset = keyof typeof IMAGE_COMPRESSION_PRESETS;

export type ImageCompressionOptions = {
  maxWidthOrHeight?: number;
  maxSizeKB?: number;
  quality?: number;
  fileType?: string;
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
  };
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
    return new File([compressedBlobOrFile], newName, {
      type: compressionOptions.fileType,
    });
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

  // 仍然比原图大：回退原图（避免上传体积反增）
  return file;
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
