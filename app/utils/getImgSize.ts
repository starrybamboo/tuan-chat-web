/**
 * 异步地获取图片的尺寸。
 * @param img - 图片源，可以是 File 对象或图片的 URL 字符串。
 * @returns 一个 Promise，解析为一个包含图片宽高信息
 */
export async function getImageSize(img: File | string): Promise<{ width: number; height: number }> {
  const defaultSize = { width: -1, height: -1 };
  let objectUrl = "";

  try {
    let blob: Blob;
    if (typeof img === "string") {
      const response = await fetch(img);
      blob = await response.blob();
    }
    else {
      blob = img;
    }

    objectUrl = URL.createObjectURL(blob);
    const imageElement = new Image();
    imageElement.src = objectUrl;

    await imageElement.decode();

    return {
      width: imageElement.naturalWidth,
      height: imageElement.naturalHeight,
    };
  }
  catch (error) {
    console.error("获取图片尺寸时出错:", error);
    return defaultSize;
  }
  finally {
    // 无论成功或失败，都释放 Object URL 以避免内存泄漏
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  }
}
