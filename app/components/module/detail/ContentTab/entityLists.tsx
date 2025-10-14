import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { getEntityListByType } from "../moduleUtils";
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
          ? "border-accent bg-base-100 font-medium"
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

// 使用 memo 包裹组件，避免父组件（ContentTab）重渲染时不必要的重新渲染
function EntityList({ moduleData: moduleInfo, entityType = "item" }: ItemsProps) {
  // 选中的实体唯一标识符为name
  const [selectedName, setSelectedName] = useState<string | null>(null);
  // 控制侧边栏是否收起
  const [isCollapsed, setIsCollapsed] = useState(false);

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

      {/* 桌面端布局 */}
      {!isCollapsed && (
        <div className="hidden md:flex shrink-0 flex-col basis-92 transition-all duration-300">
          {/* 收起/展开按钮 - 固定在顶部 */}
          <div
            className="sticky top-0 z-10 flex items-center justify-between bg-base-200/95 backdrop-blur-sm px-3 py-2 cursor-pointer hover:bg-base-300/95 transition-colors duration-200 border-b border-base-300"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title="收起列表"
          >
            <span className="text-sm font-semibold text-base-content/70">实体列表</span>
            <svg
              className="w-4 h-4 transition-transform duration-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </div>

          {/* 实体列表 */}
          <div className="flex-1 bg-base-100 overflow-y-auto">
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
                  <div className="w-full text-center py-8">
                    没有数据
                  </div>
                )}
          </div>
        </div>
      )}

      {/* 收起状态下的展开按钮 */}
      {isCollapsed && (
        <div
          className="hidden md:flex shrink-0 w-8 items-start justify-center pt-4 bg-base-200 cursor-pointer hover:bg-base-300 transition-colors duration-200"
          onClick={() => setIsCollapsed(false)}
          title="展开列表"
        >
          <svg
            className="w-5 h-5 rotate-180"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </div>
      )}

      {/* 分隔线 */}
      <div className="flex-1 p-2 md:border-l-2 border-base-content/10 border-solid min-w-0">
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

// 使用 memo 导出，避免 React Flow 状态更新时触发此组件重渲染
export default memo(EntityList);
