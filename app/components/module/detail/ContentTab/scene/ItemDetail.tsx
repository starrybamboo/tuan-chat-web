import { useMemo, useState } from "react";

interface ItemDetailProps {
  itemName: string;
  itemList: any[];
  entityType?: "item" | "location" | "scene";
  moduleInfo?: any;
}

export default function ItemDetail({ itemName, itemList, entityType, moduleInfo }: ItemDetailProps) {
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const selectedEntityInfo = useMemo(() => {
    if (!selectedEntity || !Array.isArray(moduleInfo)) {
      return null;
    }
    const entity = moduleInfo.find((e: any) => e.name === selectedEntity);
    return entity ? entity.entityInfo : null;
  }, [selectedEntity, moduleInfo]);

  const itemData = itemList.find(item => item.name === itemName);

  if (!itemName) {
    return (
      <div className="flex h-full w-full items-center justify-center text-base-content/50">
        请选择一项
      </div>
    );
  }

  const itemInfo = itemData?.entityInfo;

  // if (entityType === "scene") {
  //   console.warn("props:", itemName, itemList, entityType);
  //   console.warn("itemData:", itemData);
  //   console.warn("itemInfo:", itemInfo);
  // }

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
        image: entityType === "scene" ? undefined : normalizeImagePath(itemInfo.image),
        sceneItems: itemData.sceneItems || [],
        sceneRoles: itemData.sceneRoles || [],
        sceneLocations: itemData.sceneLocations || [],
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
        {entityType !== "scene" && normalizedItemInfo?.image && (
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
            <p className="bg-info/10  p-3 rounded-lg text-sm md:text-base">
              {normalizedItemInfo.description}
            </p>
          </div>
        )}
        {/* KP提示（统一为SceneDetail样式） */}
        {normalizedItemInfo?.tip && (
          <div className="w-full">
            <h4 className="font-semibold text-base md:text-lg mb-2 text-orange-600">KP提示</h4>
            <p className=" bg-orange-50/10 p-3 rounded-lg border-l-4 border-orange-200 text-sm md:text-base">
              {normalizedItemInfo.tip}
            </p>
          </div>
        )}
        {/* Scene 类型专属信息 */}
        {entityType === "scene" && (
          <>
            {normalizedItemInfo?.sceneItems && normalizedItemInfo.sceneItems.length > 0 && (
              <div>
                <h4 className="font-semibold text-xs md:text-sm mb-2 text-green-600">场景物品</h4>
                <div className="flex flex-wrap gap-2">
                  {normalizedItemInfo.sceneItems.map((item: string) => (
                    <span
                      key={item}
                      className={`bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs md:text-sm font-medium cursor-pointer border border-green-300 ${selectedEntity === item ? "ring-2 ring-green-500" : ""}`}
                      onClick={() => {
                        setSelectedEntity(item);
                      }}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {normalizedItemInfo?.sceneRoles && normalizedItemInfo.sceneRoles.length > 0 && (
              <div>
                <h4 className="font-semibold text-xs md:text-sm mb-2 text-blue-600">场景角色</h4>
                <div className="flex flex-wrap gap-2">
                  {normalizedItemInfo.sceneRoles.map((role: string) => (
                    <span
                      key={role}
                      className={`bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs md:text-sm font-medium cursor-pointer border border-blue-300 ${selectedEntity === role ? "ring-2 ring-blue-500" : ""}`}
                      onClick={() => {
                        setSelectedEntity(role);
                      }}
                    >
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {normalizedItemInfo?.sceneLocations && normalizedItemInfo.sceneLocations.length > 0 && (
              <div>
                <h4 className="font-semibold text-xs md:text-sm mb-2 text-purple-600">场景地点</h4>
                <div className="flex flex-wrap gap-2">
                  {normalizedItemInfo.sceneLocations.map((location: string) => (
                    <span
                      key={location}
                      className={`bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs md:text-sm font-medium cursor-pointer border border-purple-300 ${selectedEntity === location ? "ring-2 ring-purple-500" : ""}`}
                      onClick={() => {
                        setSelectedEntity(location);
                      }}
                    >
                      {location}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {/* 选中实体详情渲染 */}
            {selectedEntityInfo
              ? (
                  <div className="mt-6 p-4 rounded-lg border border-base-300 bg-base-200">
                    <h4 className="font-bold text-base md:text-lg mb-2 text-primary">{selectedEntity}</h4>
                    {selectedEntityInfo.image && (
                      <div className="mb-2">
                        <img
                          src={normalizeImagePath(selectedEntityInfo.image)}
                          alt={selectedEntityInfo.name || selectedEntity || ""}
                          className="w-24 h-24 object-cover rounded"
                          onError={(e) => {
                            // 如果图片加载失败，使用默认图片
                            (e.target as HTMLImageElement).src = "/favicon.ico";
                          }}
                        />
                      </div>
                    )}
                    {selectedEntityInfo.description && (
                      <div className="mb-2">
                        <span className="font-semibold text-base-content/70 text-xs md:text-sm">描述：</span>
                        <span className="text-xs md:text-sm">{selectedEntityInfo.description}</span>
                      </div>
                    )}
                    {selectedEntityInfo.tip && (
                      <div className="mb-2">
                        <span className="font-semibold text-orange-600 text-xs md:text-sm">KP提示：</span>
                        <span className="text-xs md:text-sm">{selectedEntityInfo.tip}</span>
                      </div>
                    )}
                  </div>
                )
              : (
                  (normalizedItemInfo?.sceneItems?.length > 0
                    || normalizedItemInfo?.sceneRoles?.length > 0
                    || normalizedItemInfo?.sceneLocations?.length > 0) && (
                    <div className="mt-6 p-4 rounded-lg border border-base-300 bg-base-200">
                      <h4 className="font-bold text-base md:text-lg mb-2 text-primary">请选择一个实体以查看详情</h4>
                      <p className="text-base-content/60 text-xs md:text-sm">点击上方的实体标签来查看详细信息</p>
                    </div>
                  )
                )}
          </>
        )}
      </div>
    </div>
  );
}
