import { SharpDownload } from "@/icons";
import toast from "react-hot-toast";

export default function SavePictureButton() {
  return (
    <button
      type="button"
      onClick={() => {
        toast.error("功能开发中");
        return Promise.resolve();
      }}
      className="btn btn-primary"
    >
      <SharpDownload className="w-5 h-5" />
      保存图片
    </button>

  );
}
