export function getImageSize(imgFile: File) {
  return new Promise<{ width: number; height: number }>((resolve) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve({ width: img.naturalWidth || 114, height: img.naturalHeight || 114 });
    };
    img.onerror = () => resolve({ width: 114, height: 114 }); // 失败时使用默认值
    img.src = URL.createObjectURL(imgFile);
  });
}
