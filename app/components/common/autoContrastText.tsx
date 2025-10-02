// 代码来源https://cloud.tencent.com/developer/article/1965216?from=15425

export default async function checkBack(img: string) {
  return new Promise((resolve) => {
    // 计算图片中间值
    function analysisColor(rgbaArray: ImageData) {
      if (!rgbaArray)
        return "black"; // 默认返回黑色

      const data = rgbaArray.data;
      const pixels = [];
      const centerX = Math.floor(rgbaArray.width / 2);
      const centerY = Math.floor(rgbaArray.height / 2);

      // 计算中间4x4区域(可以根据需要调整区域大小)
      const areaSize = 4;
      const startX = Math.max(0, centerX - areaSize);
      const endX = Math.min(rgbaArray.width, centerX + areaSize);
      const startY = Math.max(0, centerY - areaSize);
      const endY = Math.min(rgbaArray.height, centerY + areaSize);

      // 收集中间区域所有像素
      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          const pos = (y * rgbaArray.width + x) * 4;
          pixels.push({
            r: data[pos],
            g: data[pos + 1],
            b: data[pos + 2],
            a: data[pos + 3],
          });
        }
      }

      // 计算平均颜色
      let totalR = 0;
      let totalG = 0;
      let totalB = 0;
      pixels.forEach((pixel) => {
        totalR += pixel.r;
        totalG += pixel.g;
        totalB += pixel.b;
      });

      const avgR = totalR / pixels.length;
      const avgG = totalG / pixels.length;
      const avgB = totalB / pixels.length;

      // 计算亮度 (使用感知亮度公式)
      const brightness = (0.299 * avgR + 0.587 * avgG + 0.114 * avgB) / 255;

      // 根据亮度决定文字颜色
      return brightness > 0.5 ? "black" : "white";
    }

    function setFontColor(color: string) {
      // 这里可以添加设置字体颜色的逻辑
      // 例如更新CSS变量或直接设置元素样式
      document.documentElement.style.setProperty("--text-color", color);
    }

    const c4 = document.createElement("canvas"); // 压缩尺寸计算用
    c4.width = 16;
    c4.height = 16;
    const ctx4 = c4.getContext("2d");

    if (!ctx4) {
      setFontColor("black");
      resolve(false);
      return;
    }

    // 识别图片
    const image = new Image();
    image.onload = () => {
      ctx4.drawImage(image, 0, 0, 17, 16); // 绘制图片到 Canvas
      const imageData = ctx4.getImageData(0, 0, 17, 16); // 获取图像数据
      const color = analysisColor(imageData); // 分析颜色分布
      setFontColor(color); // 设置字体颜色
      resolve(true); // 完成Promise
    };

    // 下载图片，解决图片跨域问题
    const xhr = new XMLHttpRequest();
    xhr.open("get", img, true);
    xhr.responseType = "blob";
    xhr.onload = function loaded() {
      if (this.status === 200) {
        const blob = this.response;
        image.src = window.URL.createObjectURL(blob);
      }
    };
    xhr.send();
  });
}
