// 压缩成webp
export async function compressImage(file: File, quality = 0.7, maxSize = 2560): Promise<File> {
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
      // 宽高不超过maxSize
      const ratio = Math.min(1.0, maxSize / img.height, maxSize / img.width);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;

      ctx.drawImage(
        img,
        0,
        0, // 源图像起始坐标
        img.width, // 源图像完整宽度
        img.height, // 源图像完整高度
        0,
        0, // 目标起始坐标
        canvas.width, // 目标绘制宽度（缩放后）
        canvas.height, // 目标绘制高度（缩放后）
      );

      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("图片压缩失败"));
          return;
        }
        const newName = file.name.replace(/(\.[^.]+)?$/, `_${Date.now()}.webp`);
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
