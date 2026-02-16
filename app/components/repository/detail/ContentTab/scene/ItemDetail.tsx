import { memo } from "react";
import MarkdownMentionViewer from "@/components/common/richText/MarkdownMentionViewer";
import { useContentPermission } from "../ContentPermissionContext";

interface ItemDetailProps {
  itemName: string;
  itemList: any[];
}

function ItemDetail({ itemName, itemList }: ItemDetailProps) {
  const permission = useContentPermission();

  const itemData = itemList.find(item => item.name === itemName);

  if (!itemName) {
    return (
      <div className="flex h-full w-full items-center justify-center text-base-content/50">
        请选择一项
      </div>
    );
  }

  const itemInfo = itemData?.entityInfo;

  // 规范化图片路径
  const normalizeImagePath = (imagePath?: string) => {
    if (!imagePath)
      return undefined;
    // 如果是相对路径 ./favicon.ico，转换为绝对路径 /favicon.ico
    if (imagePath.startsWith("./")) {
      return imagePath.substring(1);
    }
    return imagePath;
  };

  const normalizedItemInfo = itemInfo
    ? {
        name: itemData.name,
        description: itemInfo.description,
        tip: itemInfo.tip,
        image: normalizeImagePath(itemInfo.image),
      }
    : null;

  if (!itemData || !normalizedItemInfo) {
    return (
      <div className="flex h-full w-full items-center justify-center text-base-content/50 text-sm md:text-base">
        未找到信息
      </div>
    );
  }

  return (
    <div className="h-full w-full flex gap-2">
      <div className="flex flex-col gap-4 p-2 md:p-4 bg-base-100 rounded-lg w-full overflow-y-auto">
        <div className="hidden md:block">
          <h1 className="text-2xl md:text-3xl font-bold ">{normalizedItemInfo?.name || "未命名"}</h1>
        </div>
        {normalizedItemInfo?.image && (
          <div className="flex flex-col gap-2">
            <h4 className="text-xs md:text-sm font-medium text-base-content/60">图片</h4>
            <div className="w-32 h-32 rounded-lg overflow-hidden border border-base-300">
              <img
                src={normalizedItemInfo.image}
                alt={normalizedItemInfo.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // 如果图片加载失败，使用默认图片
                  (e.target as HTMLImageElement).src = "/favicon.ico";
                }}
              />
            </div>
          </div>
        )}
        {/* 物品描述（统一为SceneDetail样式） */}
        {normalizedItemInfo?.description && (
          <div className="w-full">
            <h4 className="font-semibold text-base md:text-lg  mb-2">描述</h4>
            <div className="bg-info/10  p-3 rounded-lg text-sm md:text-base">
              <MarkdownMentionViewer markdown={normalizedItemInfo.description} />
            </div>
          </div>
        )}
        {/* KP提示（统一为SceneDetail样式） */}
        {permission === "kp" && normalizedItemInfo?.tip && (
          <div className="w-full">
            <h4 className="font-semibold text-base md:text-lg mb-2 text-orange-600">KP提示</h4>
            <div className=" bg-orange-50/10 p-3 rounded-lg border-l-4 border-orange-200 text-sm md:text-base">
              <MarkdownMentionViewer markdown={normalizedItemInfo.tip} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 使用 memo 导出，避免父组件更新时不必要的重渲染
export default memo(ItemDetail);
