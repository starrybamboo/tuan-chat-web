import React from "react";

interface ItemDetailProps {
  itemName: string;
  itemList: any[];
  entityType?: "item" | "location" | "scene";
}

export default function ItemDetail({ itemName, itemList, entityType }: ItemDetailProps) {
  const itemData = itemList.find(item => item.name === itemName);

  if (!itemName) {
    return (
      <div className="flex h-full w-full items-center justify-center text-base-content/50">
        请选择一项
      </div>
    );
  }

  const itemInfo = itemData?.entityInfo;

  const normalizedItemInfo = itemInfo
    ? {
        name: itemData.name,
        description: itemInfo.description,
        tip: itemInfo.tip,
        image: entityType === "scene" ? undefined : itemInfo.image,
        sceneItems: itemData.sceneItems || [],
        sceneRoles: itemData.sceneRoles || [],
        sceneLocations: itemData.sceneLocations || [],
      }
    : null;

  if (!itemData || !normalizedItemInfo) {
    return (
      <div className="flex h-full w-full items-center justify-center text-base-content/50">
        未找到信息
      </div>
    );
  }

  return (
    <div className="h-full w-full flex gap-2">
      <div className="flex flex-col gap-4 p-4 bg-base-100 rounded-lg w-full overflow-y-auto">

        <h1 className="text-3xl font-bold text-secondary">{normalizedItemInfo?.name || "未命名"}</h1>
        <div className="divider my-0" />
        {entityType !== "scene" && normalizedItemInfo?.image && (
          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-medium text-base-content/60">图片</h4>
            <div className="w-32 h-32 rounded-lg overflow-hidden border border-base-300">
              <img
                src={normalizedItemInfo.image}
                alt={normalizedItemInfo.name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}
        {/* 物品描述（统一为SceneDetail样式） */}
        {normalizedItemInfo?.description && (
          <div className="w-full">
            <h4 className="font-semibold text-lg text-secondary mb-2">描述</h4>
            <p className="bg-info/10 text-info-content p-3 rounded-lg">
              {normalizedItemInfo.description}
            </p>
          </div>
        )}
        {/* KP提示（统一为SceneDetail样式） */}
        {normalizedItemInfo?.tip && (
          <div className="w-full">
            <h4 className="font-semibold text-lg mb-2 text-orange-600">KP提示</h4>
            <p className="text-gray-700 bg-orange-50 p-3 rounded-lg border-l-4 border-orange-200">
              {normalizedItemInfo.tip}
            </p>
          </div>
        )}
        {/* Scene 类型专属信息 */}
        {entityType === "scene" && (
          <>
            {normalizedItemInfo?.sceneItems && normalizedItemInfo.sceneItems.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2 text-green-600">场景物品</h4>
                <div className="flex flex-wrap gap-2">
                  {normalizedItemInfo.sceneItems.map((item: string) => (
                    <span key={item} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {normalizedItemInfo?.sceneRoles && normalizedItemInfo.sceneRoles.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2 text-blue-600">场景角色</h4>
                <div className="flex flex-wrap gap-2">
                  {normalizedItemInfo.sceneRoles.map((role: string) => (
                    <span key={role} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {normalizedItemInfo?.sceneLocations && normalizedItemInfo.sceneLocations.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2 text-purple-600">场景地点</h4>
                <div className="flex flex-wrap gap-2">
                  {normalizedItemInfo.sceneLocations.map((location: string) => (
                    <span key={location} className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                      {location}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
