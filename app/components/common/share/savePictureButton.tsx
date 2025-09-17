import { SharpDownload } from "@/icons";
import domtoimage from "dom-to-image";
import QRCode from "qrcode";
import toast from "react-hot-toast";

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
      const QRCodeDataUrl = QRCode ? await QRCode.toDataURL(qrLink, { width: 100 }) : null;

      // 有二维码生成完整图片
      if (QRCodeDataUrl) {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const CardImg = new Image();
        const QRImg = new Image();
        CardImg.src = ImageDataUrl;
        QRImg.src = QRCodeDataUrl;

        // 绘图
      
        CardImg.onload = () => {
          canvas.width = CardImg.width;
          canvas.height = CardImg.height;
          ctx?.drawImage(CardImg, 0, 0);
          QRImg.onload = () => {
            // 暂时放到右下角
            ctx?.drawImage(QRImg, canvas.width - 100 - 10, canvas.height - 100 - 10, 100, 100);
            const link = document.createElement("a");
            link.href = canvas.toDataURL("image/png");
            link.download = "image.png";
            link.click();
          };
        };
      }
      else {
      // 无二维码直接导出
        const link = document.createElement("a");
        link.href = ImageDataUrl;
        link.download = "image.png";
        link.click();
      }
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