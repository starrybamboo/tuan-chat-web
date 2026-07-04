import { toast } from "react-hot-toast";

import { Button } from "@/components/common/Button";
import { Link } from "@/icons";

type CopyLinkButtonProps = {
  title?: string;
  className?: string;
}
export default function CopyLinkButton({ title, className }: CopyLinkButtonProps) {
  const textToCopy = title ? `【${title}】${window.location.href}` : `${window.location.href}`;
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      toast.success("链接已复制！");
    }
    catch (err) {
      toast.error("复制失败，请手动复制");
      console.error(err);
    }
  };

  return (
    <Button variant="primary" icon={<Link className="w-5 h-5" />} onClick={handleCopy} className={className}>
      复制链接
    </Button>
  );
}
