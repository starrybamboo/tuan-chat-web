import { SharpDownload } from "@/icons";
import domtoimage from "dom-to-image";
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
      // 将targetRef转换为图片
      const ImageDataUrl = await domtoimage.toPng(targetRef.current);

      // 生成二维码
      const QRCodeDataUrl = await QRCode.toDataURL(qrLink, { width: 100 });

      // 随机数量团子
      const tuanPicsUrls = [
        "http://39.103.58.31:9000/avatar/avatar/b51e8b24e434946fa7daac7f43da2ff1_7450.webp",
        "http://39.103.58.31:9000/avatar/avatar/bedc6e7259afd1b00dcecaebff6d75c7_11256.webp",
        "http://39.103.58.31:9000/avatar/avatar/2482bc79c85235e3d8c84417293dac8f_13192.webp",
        "http://39.103.58.31:9000/avatar/avatar/9a9760f951b59d50571e3c136ba55a2e_15012.webp",
        "http://39.103.58.31:9000/avatar/avatar/1ada3a88c27d7629dbb59faaa4a2e265_16514.webp",
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

      const extraHeight = 150; // 底部额外高度
      canvas.width = 500;
      canvas.height = CardImg.height + extraHeight;
      if (ctx) {
        // 图片渲染
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(CardImg, 0, 0);
        ctx.drawImage(QRImg, 0, canvas.height - 150, 150, 150);
        ctx?.drawImage(TuanImg, canvas.width - 200, canvas.height - 200, 200, 200);

        // 旋转坐标系以实现斜向文本
        ctx.save();
        ctx.translate(canvas.width - 160, canvas.height - 20);// 移动坐标系原点到文字位置
        ctx.rotate(-20 * Math.PI / 180);
        ctx.font = "bold 40px Arial";
        ctx.fillStyle = "rgba(128, 128, 128, 0.4)";
        ctx.fillText("tuan-chat", -60, -100);
        ctx?.restore();
      }
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
