import type { ModuleContextType, ModuleTabItem, TabId } from "./types";
import { createContext, use, useCallback, useMemo, useState } from "react";
import { useImmer } from "use-immer";
import { ModuleListEnum } from "./types";

const ModuleContext = createContext<ModuleContextType | null>(null);
export function ModuleProvider({ children }: { children: React.ReactNode }) {
  const [moduleTabItems, updateModuleTabItems] = useImmer<ModuleTabItem[]>([]); // 模组的tab列表
  const [currentSelectedTabId, _setCurrentSelectedTabId] = useState<TabId | null>(null); // 当前选中的tab的id
  const [stageId, _setStageId] = useState<TabId | null>(null); // 当前选中的模组的id
  const [activeList, _setActiveList] = useState<ModuleListEnum>(ModuleListEnum.STAGE); // 当前选中的列表, 默认暂存区

  // 保持回调的引用稳定，避免依赖 setXxx 触发下游 useEffect 重复执行
  const setStageIdCb = useCallback((id: TabId | null) => {
    _setStageId((prev) => {
      if (prev === id)
        return prev;
      // 仅在切换到新 stageId 时，清空 tab 列表
      updateModuleTabItems([]);
      return id;
    });
  }, [updateModuleTabItems]);

  const setCurrentSelectedTabIdCb = useCallback((item: TabId | null) => {
    _setCurrentSelectedTabId(item);
  }, []);

  const pushModuleTabItemCb = useCallback((moduleTabItem: ModuleTabItem) => {
    // 如果已经存在这个 tabItem, 就不添加
    updateModuleTabItems((draft) => {
      const index = draft.findIndex(i => i.id === moduleTabItem.id);
      if (index === -1)
        draft.push(moduleTabItem);
    });
  }, [updateModuleTabItems]);

  const removeModuleTabItemCb = useCallback((id: TabId) => {
    updateModuleTabItems((draft) => {
      const index = draft.findIndex(item => item.id === id);
      if (index !== -1) {
        draft.splice(index, 1);
        if (id === currentSelectedTabId) {
          if (draft.length > 0)
            _setCurrentSelectedTabId(draft[0].id);
          else
            _setCurrentSelectedTabId(null);
        }
      }
    });
  }, [currentSelectedTabId, updateModuleTabItems]);

  const updateModuleTabLabelCb = useCallback((id: TabId, label: string) => {
    updateModuleTabItems((draft) => {
      const found = draft.find(item => item.id === id);
      if (found) {
        found.label = label;
      }
    });
  }, [updateModuleTabItems]);

  const setActiveListCb = useCallback((list: ModuleListEnum) => {
    _setActiveList(list);
  }, []);

  const updateModuleTabContentNameCb = useCallback((id: TabId, name: string) => {
    updateModuleTabItems((draft) => {
      const found = draft.find(item => item.id === id);
      if (found && found.content) {
        // content 是 StageEntityResponse，保持 name 同步，避免编辑器里读到旧名字
        (found.content as any).name = name;
      }
    });
  }, [updateModuleTabItems]);

  const moduleContextValue: ModuleContextType = useMemo(() => ({
    moduleTabItems,
    currentSelectedTabId,
    stageId,
    activeList,
    setStageId: setStageIdCb,
    setCurrentSelectedTabId: setCurrentSelectedTabIdCb,
    pushModuleTabItem: pushModuleTabItemCb,
    removeModuleTabItem: removeModuleTabItemCb,
    updateModuleTabLabel: updateModuleTabLabelCb,
    updateModuleTabContentName: updateModuleTabContentNameCb,
    setActiveList: setActiveListCb,
  }), [
    moduleTabItems,
    currentSelectedTabId,
    stageId,
    activeList,
    setStageIdCb,
    setCurrentSelectedTabIdCb,
    pushModuleTabItemCb,
    removeModuleTabItemCb,
    updateModuleTabLabelCb,
    updateModuleTabContentNameCb,
    setActiveListCb,
  ]);

  return (
    <ModuleContext
      value={moduleContextValue}
    >
      {children}
    </ModuleContext>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useModuleContext() {
  const context = use(ModuleContext);
  if (!context) {
    throw new Error("useModuleContext must be used within a ModuleProvider");
  }
  return context;
}
