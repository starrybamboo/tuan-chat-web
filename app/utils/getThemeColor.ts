/** 随机初始化中心点 */
function randomInit(pixels: [number, number, number][], k: number) {
  const centers: { r: number; g: number; b: number; count: number }[] = [];
  const used = new Set<number>();
  while (centers.length < k) {
    const idx = Math.floor(Math.random() * pixels.length);
    if (!used.has(idx)) {
      used.add(idx);
      const [r, g, b] = pixels[idx];
      centers.push({ r, g, b, count: 0 });
    }
  }
  return centers;
}

/** 将每个像素分配到最近的中心 */
function assignToClusters(
  pixels: [number, number, number][],
  centers: { r: number; g: number; b: number; count?: number }[],
) {
  const clusters = centers.map(() => [] as [number, number, number][]);
  for (const [r, g, b] of pixels) {
    let minDist = Infinity;
    let idx = 0;
    for (let i = 0; i < centers.length; i++) {
      const c = centers[i];
      const dist = (r - c.r) ** 2 + (g - c.g) ** 2 + (b - c.b) ** 2;
      if (dist < minDist) {
        minDist = dist;
        idx = i;
      }
    }
    clusters[idx].push([r, g, b]);
  }
  return clusters;
}

/** 重新计算每个簇的平均值 */
function recomputeCenters(
  clusters: [number, number, number][][],
): { r: number; g: number; b: number; count: number }[] {
  return clusters.map((cluster) => {
    if (cluster.length === 0)
      return { r: 0, g: 0, b: 0, count: 0 };
    let rSum = 0;
    let gSum = 0;
    let bSum = 0;
    for (const [r, g, b] of cluster) {
      rSum += r;
      gSum += g;
      bSum += b;
    }
    return {
      r: Math.round(rSum / cluster.length),
      g: Math.round(gSum / cluster.length),
      b: Math.round(bSum / cluster.length),
      count: cluster.length,
    };
  });
}

/** 从聚类结果中选像素最多的簇作为主色 */
function pickLargestCluster(
  centers: { r: number; g: number; b: number; count: number }[],
) {
  return centers.sort((a, b) => b.count - a.count)[0];
}

/** RGB 转 HEX */
function rgbToHex(r: number, g: number, b: number) {
  const toHex = (c: number) => c.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/**
 * 获取图片主题色
 * @param img - 图片源，可以是 File 对象或图片的 URL 字符串。
 * @param quality - 质量，质量越高主色越准确，性能开销越大。
 * @returns 返回一个 Promise，解析为主色的 HEX 字符串，例如 "#87CEEB"
 */
export async function getThemeColor(
  img: File | string,
  quality: "low" | "medium" | "high",
): Promise<string> {
  let objectUrl = "";

  try {
    // 获取 Blob
    let blob: Blob;
    if (typeof img === "string") {
      const response = await fetch(img);
      // 检查网络请求是否成功
      if (!response.ok) {
        console.error(`getThemeColor.ts:94 1. 图片 URL Fetch 失败，状态码: ${response.status}. 返回默认色。`);
        return "#00000000"; // 返回透明色或默认色
      }
      blob = await response.blob();
    }
    else {
      blob = img;
    }

    objectUrl = URL.createObjectURL(blob);
    const imageElement = new Image();
    // 设置 crossOrigin 解决 CORS 问题
    imageElement.crossOrigin = "anonymous";
    imageElement.src = objectUrl;

    // 图像解码失败时会抛出 EncodingError
    await imageElement.decode();

    // 绘图
    const canvas = document.createElement("canvas");
    canvas.width = imageElement.naturalWidth;
    canvas.height = imageElement.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.error("getThemeColor.ts:117 3. 错误: 无法获取 Canvas 2D 上下文");
      return "#00000000";
    }

    ctx.drawImage(imageElement, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    // 采样
    const sampleCount = quality === "low" ? 1000 : quality === "medium" ? 4000 : 10000;
    const sampledPixels: [number, number, number][] = [];
    const step = Math.max(4, Math.floor(pixels.length / (sampleCount * 4)) * 4);

    for (let i = 0; i < pixels.length && sampledPixels.length < sampleCount; i += step) {
      sampledPixels.push([pixels[i], pixels[i + 1], pixels[i + 2]]);
    }

    if (sampledPixels.length === 0) {
      console.error("getThemeColor.ts:135 4. 错误: 采样后像素数组为空。");
      return "#00000000";
    }

    // 设置 K 和 K-Means 聚类
    const k = quality === "low" ? 3 : quality === "medium" ? 6 : 10;

    const inits = 5; // 尝试次数，越大越不容易陷入局部最优
    let bestCenters: { r: number; g: number; b: number; count: number }[] = [];
    let bestLargestCount = -1;

    for (let init = 0; init < inits; init++) {
      let centers = randomInit(sampledPixels, k);
      const iterations = 5;
      for (let iter = 0; iter < iterations; iter++) {
        const clusters = assignToClusters(sampledPixels, centers);
        centers = recomputeCenters(clusters);
      }
      const dominant = pickLargestCluster(centers);
      if (dominant.count > bestLargestCount) {
        bestLargestCount = dominant.count;
        bestCenters = centers;
      }
    }

    const dominant = pickLargestCluster(bestCenters);

    const hexColor = rgbToHex(dominant.r, dominant.g, dominant.b);
    return hexColor;
  }
  catch (error) {
    console.error("getThemeColor.ts:160 获取图片主色时捕获到错误:", error);
    // 发生错误时返回默认/透明色，避免应用崩溃
    return "#00000000";
  }
  finally {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  }
}
