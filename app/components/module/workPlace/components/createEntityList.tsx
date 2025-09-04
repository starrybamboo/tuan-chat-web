import type { StageEntityResponse } from "api";
import { useCallback, useEffect, useMemo, useState } from "react";
import ItemDetail from "../../detail/ContentTab/scene/ItemDetail";
import { getEntityListByType } from "../../detail/moduleUtils";

function EntityListItem(
  { entity, isSelected, onChange, onDelete }: {
    entity: StageEntityResponse;
    isSelected?: boolean;
    onChange?: (name: string) => void;
    onDelete?: (entity: StageEntityResponse) => void;
  },
) {
  const handleSelectItem = useCallback(() => {
    if (onChange && entity.name) {
      onChange(entity.name);
    }
  }, [onChange, entity.name]);

  return (
    <div
      className={`group w-full p-3 cursor-pointer transition-all duration-200 ease-in-out border-l-4 ${isSelected
        ? "border-accent bg-base-100 font-medium"
        : "border-transparent hover:border-accent/50 hover:bg-base-100"
      } relative`}
      onClick={handleSelectItem}
    >
      <div className="flex justify-between items-center">
        <span className="text-base font-medium">
          {entity.name}
        </span>
        {onDelete && (
          <button
            type="button"
            className="btn btn-ghost btn-xs md:opacity-0 md:group-hover:opacity-100 opacity-70 hover:bg-base-300 rounded-full p-1 hover:[&>svg]:stroke-error"
            onClick={(e) => {
              onDelete(entity);
              e.stopPropagation();
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

type EntityType = "item" | "location" | "scene";

interface ItemsProps {
  moduleData: any;
  entityType?: EntityType;
  onDelete?: (entity: StageEntityResponse) => void;
}

export default function CreateEntityList({ moduleData: moduleInfo, entityType = "item", onDelete }: ItemsProps) {
  // 选中的实体唯一标识符为name
  const [selectedName, setSelectedName] = useState<string | null>(null);

  const entityList: any[] = useMemo(() => {
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
      {/* 移动端下拉菜单 */}
      <div className="md:hidden">
        <select
          className="select w-full border-0 rounded-none bg-base-200 font-bold text-lg"
          value={selectedName || ""}
          onChange={e => setName(e.target.value)}
        >
          <option value="" disabled>
            {entityList.length > 0 ? "请选择一个实体" : "没有数据"}
          </option>
          {entityList.map((entity) => {
            const name: string = entity.name ?? "未命名";
            return (
              <option key={name} value={name}>
                {name}
              </option>
            );
          })}
        </select>
      </div>

      {/* 桌面端实体列表 */}
      <div className="hidden md:block basis-92 shrink-0 bg-base-100 max-h-128 overflow-y-auto">
        {entityList.length > 0
          ? entityList.map((entity) => {
              const name: string = entity.name ?? "未命名";
              return (
                <EntityListItem
                  key={name}
                  entity={entity}
                  isSelected={selectedName === name}
                  onChange={setName}
                  onDelete={onDelete}
                />
              );
            })
          : (
              <div className="w-full text-center py-8">
                没有数据
              </div>
            )}
      </div>

      {/* 分隔线 */}
      <div className="grow p-2 md:border-l-2 border-base-content/10 border-solid">
        {selectedName
          ? (
              <ItemDetail itemName={selectedName} itemList={entityList} entityType={entityType} />
            )
          : (
              <div className="flex h-full w-full items-center justify-center">
                请选择一个查看详细信息
              </div>
            )}
      </div>
    </div>
  );
}
