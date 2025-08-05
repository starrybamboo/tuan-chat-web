import { useCallback, useEffect, useMemo, useState } from "react";
import { getEnhancedSceneList, getEntityListByType } from "../moduleUtils";
import ItemDetail from "./scene/ItemDetail";

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
          ? "border-accent bg-base-100 text-accent font-medium"
          : "border-transparent hover:border-accent/50 hover:bg-base-100"
      }`}
      onClick={handleSelectItem}
    >
      <span className="text-base font-medium">
        {name}
      </span>
    </div>
  );
}

type EntityType = "item" | "location" | "scene";

interface ItemsProps {
  moduleData: any;
  entityType?: EntityType;
}

export default function EntityList({ moduleData: moduleInfo, entityType = "item" }: ItemsProps) {
  // 选中的实体唯一标识符为name
  const [selectedName, setSelectedName] = useState<string | null>(null);

  const entityList: any[] = useMemo(() => {
    if (entityType === "scene") {
      return getEnhancedSceneList(moduleInfo);
    }
    return getEntityListByType(moduleInfo, entityType);
  }, [moduleInfo, entityType]);

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
              <div className="w-full text-center text-accent py-8">
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
              <div className="flex h-full w-full items-center justify-center text-accent">
                请选择一个查看详细信息
              </div>
            )}
      </div>
    </div>
  );
}
