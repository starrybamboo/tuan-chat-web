import type { ModuleContextType, ModuleTabItem } from "./types";
import { createContext, use, useMemo, useState } from "react";
import { useImmer } from "use-immer";
import { ModuleListEnum } from "./types";

const ModuleContext = createContext<ModuleContextType | null>(null);
export function ModuleProvider({ children }: { children: React.ReactNode }) {
  const [moduleTabItems, updateModuleTabItems] = useImmer<ModuleTabItem[]>([]); // 模组的tab列表
  const [currentSelectedTabId, _setCurrentSelectedTabId] = useState<string | null>(null); // 当前选中的tab的id
  const [stageId, _setStageId] = useState<number | null>(null); // 当前选中的模组的id
  const [activeList, _setActiveList] = useState<ModuleListEnum>(ModuleListEnum.STAGE); // 当前选中的列表, 默认暂存区

  const moduleContextValue: ModuleContextType = useMemo(() => ({
    moduleTabItems,
    currentSelectedTabId,
    stageId,
    activeList,
    setStageId(id) {
      _setStageId(id);
    },
    setCurrentSelectedTabId(item) {
      _setCurrentSelectedTabId(item);
    },
    pushModuleTabItem: (moduleTabItem) => {
      // 如果已经存在这个 tabItem, 就不添加
      const index = moduleTabItems.findIndex(item => item.id === moduleTabItem.id);
      if (index !== -1) {
        return;
      }
      updateModuleTabItems((draft) => {
        draft.push(moduleTabItem);
      });
    },
    removeModuleTabItem: (id) => {
      const index = moduleTabItems.findIndex(item => item.id === id);
      if (index !== -1) {
        updateModuleTabItems((draft) => {
          draft.splice(index, 1);
          if (id === currentSelectedTabId) {
            if (draft.length > 0) {
              _setCurrentSelectedTabId(draft[0].id);
            }
            else {
              _setCurrentSelectedTabId(null);
            }
          }
        });
      }
    },
    setActiveList: (list: ModuleListEnum) => {
      _setActiveList(list);
    },
  }), [moduleTabItems, currentSelectedTabId, stageId, activeList]);

  return (
    <ModuleContext
      value={moduleContextValue}
    >
      {children}
    </ModuleContext>
  );
}

export function useModuleContext() {
  const context = use(ModuleContext);
  if (!context) {
    throw new Error("useModuleContext must be used within a ModuleProvider");
  }
  return context;
}
