import type { CollectionList } from "../../../api/models/CollectionList";
import { useEffect, useState } from "react";
import { CollectionListDetailDesktop } from "./CollectionListDetailDesktop";
import { CollectionListDetailMobile } from "./CollectionListDetailMobile";

interface CollectionListDetailProps {
  collectionList?: CollectionList;
  isLoading?: boolean;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (collectionList: CollectionList) => void;
  onDelete?: (collectionListId: number) => void;
  onRemoveResource?: (collectionId: number) => void;
}

/**
 * 收藏列表详情弹窗组件 - 响应式入口组件
 * 根据屏幕大小自动选择桌面端或移动端组件
 */
export function CollectionListDetail(props: CollectionListDetailProps) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 768;
    }
    return false;
  });

  useEffect(() => {
    const checkIsMobile = () => {
      const isMobileView = window.innerWidth < 768;
      setIsMobile((prev) => {
        if (prev !== isMobileView) {
          return isMobileView;
        }
        return prev;
      });
    };

    // 监听窗口大小变化
    window.addEventListener("resize", checkIsMobile);

    return () => {
      window.removeEventListener("resize", checkIsMobile);
    };
  }, []);

  // 根据屏幕大小渲染不同的组件
  if (isMobile) {
    return <CollectionListDetailMobile {...props} />;
  }

  return <CollectionListDetailDesktop {...props} />;
}

export default CollectionListDetail;
