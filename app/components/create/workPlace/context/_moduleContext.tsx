import type { ModuleContextType, ModuleTabItem, TabId } from "./types";
import { createContext, use, useCallback, useMemo, useRef, useState } from "react";
import { useImmer } from "use-immer";
import { ModuleListEnum } from "./types";

const ModuleContext = createContext<ModuleContextType | null>(null);
export function ModuleProvider({ children }: { children: React.ReactNode }) {
  const [moduleTabItems, updateModuleTabItems] = useImmer<ModuleTabItem[]>([]); // 模组的tab列表
  const [currentSelectedTabId, _setCurrentSelectedTabId] = useState<TabId | null>(null); // 当前选中的tab的id
  const [stageId, _setStageId] = useState<TabId | null>(null); // 当前选中的模组暂存区的id
  const [moduleId, _setModuleId] = useState<TabId | null>(null); // 当前模组的模组id
  const [activeList, _setActiveList] = useState<ModuleListEnum>(ModuleListEnum.STAGE); // 当前选中的列表, 默认暂存区
  // 选中锁，用于在重命名等操作期间阻止外部意外改变 currentSelectedTabId
  const selectionLockRef = useRef<{ expire: number; reason?: string } | null>(null);
  const selectionLockTimer = useRef<number | null>(null);
  // 切换页面时保存；保持一个永不为 null 的函数，避免调用处判空带来竞态
  const tabSaveFunctionRef = useRef<() => void>(() => {});

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

  const setModuleIdCb = useCallback((id: TabId | null) => {
    _setModuleId((prev) => {
      if (prev === id)
        return prev;
      updateModuleTabItems([]);
      return id;
    });
  }, [updateModuleTabItems]);

  const setCurrentSelectedTabIdCb = useCallback((item: TabId | null) => {
    const now = Date.now();
    // 锁定期间直接忽略外部切换
    if (selectionLockRef.current && selectionLockRef.current.expire > now) {
      return;
    }
    _setCurrentSelectedTabId((prev) => {
      // 重复设置同一个 tab，直接忽略，减少无意义保存
      if (prev === item) {
        return prev;
      }
      // 在真正切换之前先保存“旧” tab（此时旧组件仍未卸载）
      try {
        if (tabSaveFunctionRef.current) {
          tabSaveFunctionRef.current();
        }
      }
      catch (e) {
        console.error("auto save (before tab switch) failed", e);
      }
      return item;
    });
  }, []);

  const setTabSaveFunctionCb = useCallback((fn: () => void) => {
    // 始终存放一个函数，fn 不存在时回退到 no-op
    tabSaveFunctionRef.current = fn || (() => {});
  }, []);

  const forceSetCurrentSelectedTabIdCb = useCallback((item: TabId | null) => {
    _setCurrentSelectedTabId(item);
  }, []);

  const beginSelectionLockCb = useCallback((reason?: string, ttlMs: number = 300) => {
    const expire = Date.now() + ttlMs;
    selectionLockRef.current = { expire, reason };
    if (selectionLockTimer.current) {
      window.clearTimeout(selectionLockTimer.current);
    }
    selectionLockTimer.current = window.setTimeout(() => {
      if (selectionLockRef.current && selectionLockRef.current.expire <= Date.now()) {
        selectionLockRef.current = null;
      }
    }, ttlMs + 50);
  }, []);

  const endSelectionLockCb = useCallback(() => {
    selectionLockRef.current = null;
    if (selectionLockTimer.current) {
      window.clearTimeout(selectionLockTimer.current);
      selectionLockTimer.current = null;
    }
  }, []);

  const pushModuleTabItemCb = useCallback((moduleTabItem: ModuleTabItem) => {
    // 如果已经存在这个 tabItem, 就不添加
    updateModuleTabItems((draft) => {
      const index = draft.findIndex(i => i.id === moduleTabItem.id);
      if (index === -1)
        draft.push(moduleTabItem);
      else
        draft[index] = moduleTabItem;
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
    moduleId,
    activeList,
    setStageId: setStageIdCb,
    setModuleId: setModuleIdCb,
    setCurrentSelectedTabId: setCurrentSelectedTabIdCb,
    setTabSaveFunction: setTabSaveFunctionCb,
    forceSetCurrentSelectedTabId: forceSetCurrentSelectedTabIdCb,
    pushModuleTabItem: pushModuleTabItemCb,
    removeModuleTabItem: removeModuleTabItemCb,
    updateModuleTabLabel: updateModuleTabLabelCb,
    updateModuleTabContentName: updateModuleTabContentNameCb,
    setActiveList: setActiveListCb,
    beginSelectionLock: beginSelectionLockCb,
    endSelectionLock: endSelectionLockCb,
  }), [moduleTabItems, currentSelectedTabId, stageId, moduleId, activeList, setStageIdCb, setModuleIdCb, setCurrentSelectedTabIdCb, setTabSaveFunctionCb, forceSetCurrentSelectedTabIdCb, pushModuleTabItemCb, removeModuleTabItemCb, updateModuleTabLabelCb, updateModuleTabContentNameCb, setActiveListCb, beginSelectionLockCb, endSelectionLockCb]);

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
