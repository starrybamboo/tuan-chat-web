import { useModuleInfoQuery } from "api/hooks/moduleQueryHooks";
import { useCallback, useEffect, useState } from "react";
import { getEntityListByType } from "./moduleUtils";

function ItemListItem(
  { itemId, name, isSelected, onChange }: {
    itemId: number;
    name?: string;
    isSelected?: boolean;
    onChange?: (itemId: number) => void;
  },
) {
  const handleSelectItem = useCallback(() => {
    if (onChange) {
      onChange(itemId);
    }
  }, [onChange, itemId]);

  return (
    <div
      className={`w-full p-3 cursor-pointer transition-all duration-200 ease-in-out border-l-4 ${
        isSelected
          ? "border-primary bg-base-100 text-primary font-medium"
          : "border-transparent hover:border-primary/50 hover:bg-base-100"
      }`}
      onClick={handleSelectItem}
    >
      <span className="text-base font-medium">
        {name || "未命名物品"}
      </span>
    </div>
  );
}

function ItemDetail(
  { itemId, itemList }: { itemId: number; itemList: any[] },
) {
  // 尝试多种方式查找物品
  const itemData = itemList.find((item) => {
    const info = item.entityInfo;
    return info?.itemId === itemId || info?.moduleItemId === itemId;
  }) || itemList[itemId]; // 如果没找到，尝试用index直接访问

  if (!itemId) {
    return (
      <div className="flex h-full w-full items-center justify-center text-base-content/50">
        请选择一个物品
      </div>
    );
  }

  const itemInfo = itemData?.entityInfo;

  // 处理可能的字段名差异
  const normalizedItemInfo = itemInfo
    ? {
        itemId: itemInfo.itemId || itemInfo.moduleItemId,
        name: itemInfo.name,
        description: itemInfo.description,
        tip: itemInfo.tip,
        image: itemInfo.image,
        type: itemInfo.type,
        extra: itemInfo.extra,
        ruleId: itemInfo.ruleId,
        createTime: itemInfo.createTime || itemInfo.create_time,
        updateTime: itemInfo.updateTime || itemInfo.update_time,
        state: itemInfo.state,
      }
    : null;

  if (!itemData || !normalizedItemInfo) {
    return (
      <div className="flex h-full w-full items-center justify-center text-base-content/50">
        未找到物品信息
      </div>
    );
  }

  // 获取物品状态显示文本
  const getItemStateText = (state?: number) => {
    if (state === 0) {
      return "正常";
    }
    if (state === 1) {
      return "归档";
    }
    return "未知";
  };

  // 渲染额外属性
  const renderExtraInfo = (extra?: Record<string, string>) => {
    if (!extra || Object.keys(extra).length === 0) {
      return <span className="text-base-content/60">无额外属性</span>;
    }
    return (
      <div className="space-y-2">
        {Object.entries(extra).map(([key, value]) => (
          <div key={key} className="flex items-start gap-2">
            <span className="font-medium text-sm min-w-0 flex-shrink-0">
              {key}
              :
            </span>
            <span className="text-sm text-base-content/80 break-words">{value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="h-full w-full flex gap-2">
      {/* 物品信息部分 */}
      <div className="flex flex-col gap-4 p-4 bg-base-100 rounded-lg w-full overflow-y-auto">
        {/* 物品名称和基本信息 */}
        <div className="flex items-center gap-4 flex-wrap">
          <h2 className="text-xl font-bold">{normalizedItemInfo?.name || "未命名物品"}</h2>
          <span className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full">
            ID:
            {" "}
            {normalizedItemInfo?.itemId}
          </span>
          {normalizedItemInfo?.type && (
            <span className="px-2 py-1 text-xs bg-secondary/10 text-secondary rounded-full">
              {normalizedItemInfo.type}
            </span>
          )}
          {normalizedItemInfo?.state !== undefined && (
            <span
              className={`px-2 py-1 text-xs rounded-full ${
                normalizedItemInfo.state === 0
                  ? "bg-success/10 text-success"
                  : "bg-warning/10 text-warning"
              }`}
            >
              {getItemStateText(normalizedItemInfo.state)}
            </span>
          )}
        </div>

        {/* 物品图片 */}
        {normalizedItemInfo?.image && (
          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-medium text-base-content/60">物品图片</h4>
            <div className="w-32 h-32 rounded-lg overflow-hidden border border-base-300">
              <img
                src={normalizedItemInfo.image}
                alt={normalizedItemInfo.name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        {/* 物品描述 */}
        {normalizedItemInfo?.description && (
          <div className="text-base-content/80">
            <h4 className="text-sm font-medium mb-2 text-base-content/60">物品描述</h4>
            <p className="whitespace-pre-wrap text-sm bg-base-200 p-3 rounded-lg">
              {normalizedItemInfo.description}
            </p>
          </div>
        )}

        {/* 获取提示 */}
        {normalizedItemInfo?.tip && (
          <div className="text-base-content/80">
            <h4 className="text-sm font-medium mb-2 text-base-content/60">获取提示</h4>
            <p className="whitespace-pre-wrap text-sm bg-info/10 text-info p-3 rounded-lg border border-info/20">
              {normalizedItemInfo.tip}
            </p>
          </div>
        )}

        {/* 规则ID */}
        {normalizedItemInfo?.ruleId && (
          <div className="text-sm">
            <span className="text-base-content/60">关联规则ID: </span>
            <span className="font-mono text-xs bg-base-200 px-2 py-1 rounded">
              {normalizedItemInfo.ruleId}
            </span>
          </div>
        )}

        {/* 时间信息 */}
        {(normalizedItemInfo?.createTime || normalizedItemInfo?.updateTime) && (
          <div className="grid grid-cols-2 gap-2 text-sm">
            {normalizedItemInfo?.createTime && (
              <div className="flex flex-col gap-1">
                <span className="text-base-content/60">创建时间</span>
                <span className="font-mono text-xs">
                  {new Date(normalizedItemInfo.createTime).toLocaleString("zh-CN")}
                </span>
              </div>
            )}
            {normalizedItemInfo?.updateTime && (
              <div className="flex flex-col gap-1">
                <span className="text-base-content/60">更新时间</span>
                <span className="font-mono text-xs">
                  {new Date(normalizedItemInfo.updateTime).toLocaleString("zh-CN")}
                </span>
              </div>
            )}
          </div>
        )}

        {/* 额外属性 */}
        {normalizedItemInfo?.extra && (
          <div className="text-sm">
            <h4 className="text-base-content/60 mb-2">额外属性</h4>
            <div className="bg-base-200 p-3 rounded-lg">
              {renderExtraInfo(normalizedItemInfo.extra)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Items({ moduleId }: { moduleId: number }) {
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const { data: moduleInfo, isLoading: _isModuleLoading } = useModuleInfoQuery(moduleId);

  // 从模组信息中获取所有物品
  const itemList = getEntityListByType(moduleInfo, "item");

  const setItemId = useCallback((itemId: number) => {
    setSelectedItemId(itemId);
  }, []);

  // 自动选择第一个物品的函数
  const selectFirstItem = useCallback(() => {
    if (itemList.length > 0 && selectedItemId === null) {
      const firstItemInfo = itemList[0].entityInfo;
      const firstItemId = firstItemInfo?.itemId || firstItemInfo?.moduleItemId || firstItemInfo?.id || 0;
      setItemId(firstItemId);
    }
  }, [itemList, selectedItemId, setItemId]);

  // 当物品列表加载完成且有数据时，自动选择第一个物品
  useEffect(() => {
    selectFirstItem();
  }, [selectFirstItem]);

  return (
    <div className="flex w-full min-h-128 bg-base-200">
      {/* 左侧物品列表 */}
      <div className="basis-92 shrink-0 bg-base-200 max-h-128 overflow-y-auto">
        {itemList.length > 0
          ? itemList.map((itemEntity, index) => {
              const itemInfo = itemEntity.entityInfo;

              // 使用 itemId 或其他字段作为唯一标识
              const itemId = itemInfo?.itemId || itemInfo?.moduleItemId || itemInfo?.id || index;
              const name = itemInfo?.name;

              return (
                <ItemListItem
                  key={itemId}
                  itemId={itemId!}
                  name={name}
                  isSelected={selectedItemId === itemId}
                  onChange={setItemId}
                />
              );
            })
          : (
              <div className="w-full text-center text-base-content/50 py-8">
                没有物品数据
              </div>
            )}
      </div>

      {/* 分隔线 */}
      <div className="grow p-2 border-l-2 border-base-content/10 border-solid">
        {selectedItemId
          ? (
              <ItemDetail itemId={selectedItemId} itemList={itemList} />
            )
          : (
              <div className="flex h-full w-full items-center justify-center text-base-content/50">
                请选择一个物品查看详细信息
              </div>
            )}
      </div>
    </div>
  );
}
