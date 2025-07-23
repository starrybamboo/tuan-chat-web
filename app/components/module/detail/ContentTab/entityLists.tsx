import { useModuleInfoQuery } from "api/hooks/moduleQueryHooks";
import { useCallback, useEffect, useState } from "react";
import { getEntityListByType } from "../moduleUtils";

function EntityListItem(
  { name, isSelected, onChange }: {
    name: string;
    isSelected?: boolean;
    onChange?: (name: string) => void;
  },
) {
  const handleSelectItem = useCallback(() => {
    if (onChange && name) {
      onChange(name);
    }
  }, [onChange, name]);

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
        {name}
      </span>
    </div>
  );
}

interface ItemDetailProps {
  itemName: string;
  itemList: any[];
  entityType?: EntityType;
}

function ItemDetail({ itemName, itemList, entityType }: ItemDetailProps) {
  // 新接口：唯一标识符为 name
  const itemData = itemList.find(item => item.name === itemName);

  if (!itemName) {
    return (
      <div className="flex h-full w-full items-center justify-center text-base-content/50">
        请选择一个物品
      </div>
    );
  }

  const itemInfo = itemData?.entityInfo;

  // 处理可能的字段名差异，字段含义参考 ModuleItemRequest：
  // description: 可以直接展示给玩家的描述
  // tip: 对kp的提醒（检定，PL需要做什么来获得线索）
  // image: 物品图片
  // 对于 scene 类型没有 image 字段
  const normalizedItemInfo = itemInfo
    ? {
        name: itemData.name,
        description: itemInfo.description,
        tip: itemInfo.tip,
        image: entityType === "scene" ? undefined : itemInfo.image,
      }
    : null;

  if (!itemData || !normalizedItemInfo) {
    return (
      <div className="flex h-full w-full items-center justify-center text-base-content/50">
        未找到物品信息
      </div>
    );
  }

  // // 获取物品状态显示文本
  // const getItemStateText = (state?: number) => {
  //   if (state === 0) {
  //     return "正常";
  //   }
  //   if (state === 1) {
  //     return "归档";
  //   }
  //   return "未知";
  // };

  // // 渲染额外属性
  // const renderExtraInfo = (extra?: Record<string, string>) => {
  //   if (!extra || Object.keys(extra).length === 0) {
  //     return <span className="text-base-content/60">无额外属性</span>;
  //   }
  //   return (
  //     <div className="space-y-2">
  //       {Object.entries(extra).map(([key, value]) => (
  //         <div key={key} className="flex items-start gap-2">
  //           <span className="font-medium text-sm min-w-0 flex-shrink-0">
  //             {key}
  //             :
  //           </span>
  //           <span className="text-sm text-base-content/80 break-words">{value}</span>
  //         </div>
  //       ))}
  //     </div>
  //   );
  // };

  return (
    <div className="h-full w-full flex gap-2">
      {/* 物品信息部分 */}
      <div className="flex flex-col gap-4 p-4 bg-base-100 rounded-lg w-full overflow-y-auto">
        {/* 物品名称和基本信息 */}
        <div className="flex items-center gap-4 flex-wrap">
          <h2 className="text-xl font-bold">{normalizedItemInfo?.name || "未命名物品"}</h2>
          {/* <span className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full">
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
          )} */}
        </div>

        {/* 物品图片（Scene 类型无图片） */}
        {entityType !== "scene" && normalizedItemInfo?.image && (
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

        {/* 物品描述（可直接展示给玩家） */}
        {normalizedItemInfo?.description && (
          <div className="text-base-content/80">
            <h4 className="text-sm font-medium mb-2 text-base-content/60">物品描述</h4>
            <p className="whitespace-pre-wrap text-sm bg-base-200 p-3 rounded-lg">
              {normalizedItemInfo.description}
            </p>
          </div>
        )}

        {/* 对KP的提醒（检定/PL获得线索方式） */}
        {normalizedItemInfo?.tip && (
          <div className="text-base-content/80">
            <h4 className="text-sm font-medium mb-2 text-base-content/60">KP提示</h4>
            <p className="whitespace-pre-wrap text-sm bg-info/10 text-info p-3 rounded-lg border border-info/20">
              {normalizedItemInfo.tip}
            </p>
          </div>
        )}

        {/* 规则ID */}
        {/* {normalizedItemInfo?.ruleId && (
          <div className="text-sm">
            <span className="text-base-content/60">关联规则ID: </span>
            <span className="font-mono text-xs bg-base-200 px-2 py-1 rounded">
              {normalizedItemInfo.ruleId}
            </span>
          </div>
        )} */}

        {/* 时间信息 */}
        {/* {(normalizedItemInfo?.createTime || normalizedItemInfo?.updateTime) && (
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
        )} */}

        {/* 额外属性 */}
        {/* {normalizedItemInfo?.extra && (
          <div className="text-sm">
            <h4 className="text-base-content/60 mb-2">额外属性</h4>
            <div className="bg-base-200 p-3 rounded-lg">
              {renderExtraInfo(normalizedItemInfo.extra)}
            </div>
          </div>
        )} */}
      </div>
    </div>
  );
}

type EntityType = "item" | "location" | "scene";

interface ItemsProps {
  moduleId: number;
  entityType?: EntityType;
}

export default function EntityList({ moduleId, entityType = "item" }: ItemsProps) {
  // 选中的实体唯一标识符为name
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const { data: moduleInfo } = useModuleInfoQuery(moduleId);

  // 根据类型获取实体列表
  const entityList = getEntityListByType(moduleInfo, entityType);

  const setName = useCallback((name: string) => {
    setSelectedName(name);
  }, []);

  // 自动选择第一个实体
  const selectFirst = useCallback(() => {
    if (entityList.length > 0 && selectedName === null) {
      const firstName = entityList[0].name ?? "";
      if (firstName)
        setName(firstName);
    }
  }, [entityList, selectedName, setName]);

  useEffect(() => {
    selectFirst();
  }, [selectFirst]);

  return (
    <div className="flex w-full flex-col max-w-screen md:flex-row md:min-h-128 bg-base-100">
      {/* 左侧实体列表 */}
      <div className="basis-92 shrink-0 bg-base-100 max-h-128 overflow-y-auto">
        {entityList.length > 0
          ? entityList.map((entity) => {
              const name: string = entity.name ?? "未命名";
              return (
                <EntityListItem
                  key={name}
                  name={name}
                  isSelected={selectedName === name}
                  onChange={setName}
                />
              );
            })
          : (
              <div className="w-full text-center text-base-content/50 py-8">
                没有数据
              </div>
            )}
      </div>

      {/* 分隔线 */}
      <div className="grow p-2 border-l-2 border-base-content/10 border-solid">
        {selectedName
          ? (
              <ItemDetail itemName={selectedName} itemList={entityList} entityType={entityType} />
            )
          : (
              <div className="flex h-full w-full items-center justify-center text-base-content/50">
                请选择一个查看详细信息
              </div>
            )}
      </div>
    </div>
  );
}
