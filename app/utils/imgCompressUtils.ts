// 压缩成webp
export async function compressImage(file: File, quality = 0.8): Promise<File> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      return resolve(file); // 非图片类型直接返回原文件
    }
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      // 保持原始尺寸，仅调整质量
      canvas.width = img.width;
      canvas.height = img.height;

      ctx.drawImage(img, 0, 0);

      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("图片压缩失败"));
          return;
        }
        // 保持原始文件名但修改扩展名为webp
        const newName = file.name.replace(/\.[^.]+$/, ".webp");
        const compressedFile = new File([blob], newName, {
          type: "image/webp",
        });
        resolve(compressedFile);
      }, "image/webp", quality);
    };
    reader.onerror = reject;
    img.onerror = reject;
    reader.readAsDataURL(file);
  });
}
