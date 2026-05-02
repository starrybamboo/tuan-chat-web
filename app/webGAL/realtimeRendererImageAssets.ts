import { getTerreApis } from "@/webGAL/index";

async function loadImageElementFromBlob(blob: Blob): Promise<HTMLImageElement> {
  const objectUrl = URL.createObjectURL(blob);
  try {
    return await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("图片解码失败"));
      image.src = objectUrl;
    });
  }
  finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function createSquarePngBlobFromUrl(url: string, size: number): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`下载头像失败: ${response.status} ${response.statusText}`);
  }
  const sourceBlob = await response.blob();
  const image = await loadImageElementFromBlob(sourceBlob);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("创建图标画布失败");
  }

  ctx.clearRect(0, 0, size, size);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const scale = Math.max(size / image.width, size / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const offsetX = (size - drawWidth) / 2;
  const offsetY = (size - drawHeight) / 2;
  ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);

  const iconBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (!result) {
        reject(new Error("生成 PNG 图标失败"));
        return;
      }
      resolve(result);
    }, "image/png");
  });

  return iconBlob;
}

export async function uploadBlobToDirectory(blob: Blob, directory: string, fileName: string): Promise<string> {
  const file = new File([blob], fileName, { type: blob.type || "application/octet-stream" });
  const formData = new FormData();
  formData.append("files", file);
  formData.append("targetDirectory", directory);
  await getTerreApis().assetsControllerUpload(formData);
  return fileName;
}
