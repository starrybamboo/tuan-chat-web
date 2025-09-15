import { SharpDownload } from "@/icons";
import domtoimage from "dom-to-image";
// import QRCode from "qrcode";
import toast from "react-hot-toast";

interface SavePictureButtonProps {
  targetRef: React.RefObject<HTMLElement>;
  className?: string;
}

export default function SavePictureButton({ targetRef, className }: SavePictureButtonProps) {
  const handleShare = async () => {
    try {
      const dataUrl = await domtoimage.toPng(targetRef.current);
      const link = document.createElement("a");
      link.href = dataUrl;
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
