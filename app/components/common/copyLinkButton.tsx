import { toast } from "react-hot-toast";

export default function CopyLinkButton() {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("链接已复制！");
    }
    catch (err) {
      toast.error("复制失败，请手动复制");
      console.error(err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="btn btn-primary"
      type="button"
    >
      复制链接
    </button>
  );
}
