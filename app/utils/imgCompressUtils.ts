/**
 * 将图片压缩成webp，会改变原来的文件名和后缀（加上时间戳，去除空格，改为webp）
 * GIF文件将保持原格式以保留动画效果
 * @param file
 * @param quality
 * @param maxSize
 */
export async function compressImage(file: File, quality = 0.7, maxSize = 2560): Promise<File> {
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

  const safeQuality = Math.min(1, Math.max(0.05, quality));
  const candidateQualities = [
    safeQuality,
    Math.max(0.05, safeQuality * 0.85),
    Math.max(0.05, safeQuality * 0.7),
    Math.max(0.05, safeQuality * 0.55),
  ];

  const compressWithQuality = async (q: number): Promise<File> => {
    const compressedBlobOrFile = await imageCompression(file, {
      maxWidthOrHeight: maxSize,
      // 0~1，和 canvas.toBlob 的 quality 对齐
      initialQuality: q,
      fileType: "image/webp",
      useWebWorker: true,
    });

    const newName = file.name.replace(/(\.[^.]+)?$/, `_${Date.now()}.webp`).split(" ").join("");
    // browser-image-compression 返回值可能是 File 或 Blob，这里统一包一层 File
    return new File([compressedBlobOrFile], newName, {
      type: "image/webp",
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
