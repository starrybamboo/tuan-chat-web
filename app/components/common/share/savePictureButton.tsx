import { SharpDownload } from "@/icons";
import * as htmltoimage from "html-to-image";
import QRCode from "qrcode";
import toast from "react-hot-toast";

// 加载图片函数
function LoadingImg(imgUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // 请求跨域加载许可
    img.onload = () => resolve(img); // 加载成功
    img.onerror = _err => reject(new Error(`加载失败：${imgUrl}`)); // 加载失败
    img.src = imgUrl; // 设置外部 URL
  });
}

interface SavePictureButtonProps {
  targetRef: React.RefObject<HTMLElement>;
  qrLink: string;
  className?: string;
}

export default function SavePictureButton({ targetRef, qrLink, className }: SavePictureButtonProps) {
  const handleShare = async () => {
    try {
      // 暂时移除googleFonts，避免跨域问题
      const googleFonts = Array.from(document.querySelectorAll("link[href*=\"fonts.googleapis.com\"]"));
      googleFonts.forEach(link => link.remove());

      // 原始容器
      if (!targetRef.current) {
        toast.error("未找到目标元素，无法保存");
        return;
      }
      const cloneNode = targetRef?.current.cloneNode(true) as HTMLElement;

      // 新的容器，用于截图
      const newNode = document.createElement("div");
      const avatar = cloneNode.querySelector(".feed-avatar") as HTMLElement;
      const container = cloneNode.querySelector(".feed-container") as HTMLElement;
      newNode.style.position = "relative";
      newNode.style.width = "500px";
      newNode.style.height = "auto";
      // newNode.style.display = "flex";
      // newNode.style.padding = "0";
      newNode.style.background = "#fff";
      newNode.style.padding = "20px";

      if (avatar) {
        newNode.appendChild(avatar);
        // avatar.style.left = "40px"
        // avatar.style.top = "0px";
        // avatar.style.zIndex = "10";
        // avatar.style.margin = "0px";
        // avatar.style.padding = "20px";
      }
      if (container) {
        newNode.appendChild(container);
        // container.style.position = "static";
        // container.style.marginTop = "0px"
        // container.style.width = "auto";
        // container.style.padding = "0px";
      }

      // 隐藏容器
      const tempDiv = document.createElement("div");
      tempDiv.style.position = "fixed";
      tempDiv.style.left = "-9999px";
      tempDiv.style.top = "0";
      tempDiv.style.zIndex = "-1";
      tempDiv.appendChild(newNode);
      document.body.appendChild(tempDiv);

      const ImageDataUrl = await htmltoimage.toPng(newNode);

      // 恢复googleFonts
      googleFonts.forEach(link => document.head.appendChild(link));

      // 生成二维码
      const QRCodeDataUrl = await QRCode.toDataURL(qrLink, { width: 100 });

      // 随机数量团子
      const tuanPicsUrls = [
        "/tuanImages/tuanImage1.webp",
        "/tuanImages/tuanImage2.webp",
        "/tuanImages/tuanImage3.webp",
        "/tuanImages/tuanImage4.webp",
        "/tuanImages/tuanImage5.webp",
      ];
      const tuanPicsUrl = tuanPicsUrls[Math.floor(Math.random() * tuanPicsUrls.length)];

      // 有二维码生成完整图片
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      // 绘图
      const [CardImg, QRImg, TuanImg] = await Promise.all([
        LoadingImg(ImageDataUrl),
        LoadingImg(QRCodeDataUrl),
        LoadingImg(tuanPicsUrl),
      ]);
      // 使用 CardImg 的实际尺寸来计算 Canvas 尺寸
      const finalCardHeight = CardImg.height;
      const finalCardWidth = CardImg.width;

      const EXTRA_HEIGHT = finalCardWidth / 4;

      canvas.width = finalCardWidth;
      canvas.height = finalCardHeight + EXTRA_HEIGHT; // Canvas 总高度 = 截图高度 + 底部留白
      if (ctx) {
        // 图片渲染
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(CardImg, 0, 0);
        ctx.drawImage(QRImg, 20, canvas.height - 300, 300, 300);
        ctx?.drawImage(TuanImg, canvas.width - 400, canvas.height - 300, 300, 300);

        // 旋转坐标系以实现斜向文本
        ctx.save();
        ctx.translate(canvas.width - 160, canvas.height - 20);// 移动坐标系原点到文字位置
        ctx.rotate(-20 * Math.PI / 180);
        ctx.font = "bold 40px Arial";
        ctx.fillStyle = "rgba(128, 128, 128, 0.4)";
        ctx.fillText("tuan-chat", -60, -100);
        ctx?.restore();
      }
      // 移除临时容器
      document.body.removeChild(tempDiv);

      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = "image.png";
      link.click();
    }
    catch (err) {
      console.error(err);
      toast.error("保存图片失败，请稍后重试");
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className={`btn btn-primary ${className}`}
    >
      <SharpDownload className="w-5 h-5" />
      保存图片
    </button>
  );
}
