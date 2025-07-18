import type { ModuleContextType, ModuleTabItem } from "./types";
import { createContext, use, useMemo, useState } from "react";
import { useImmer } from "use-immer";

const ModuleContext = createContext<ModuleContextType | null>(null);
export function ModuleProvider({ children }: { children: React.ReactNode }) {
  const [moduleTabItems, updateModuleTabItems] = useImmer<ModuleTabItem[]>([]);
  const [currentSelectedTabId, _setCurrentSelectedTabId] = useState<string | null>(null);
  const [stageId, _setStageId] = useState<number | null>(null);

  const moduleContextValue: ModuleContextType = useMemo(() => ({
    moduleTabItems,
    currentSelectedTabId,
    stageId,
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
  }), [moduleTabItems, currentSelectedTabId, stageId, updateModuleTabItems]);

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
