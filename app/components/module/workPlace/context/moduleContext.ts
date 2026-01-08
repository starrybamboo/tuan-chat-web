import { createContext, use } from "react";

export type ModuleContextValue = {
  stageId: number | null;
  removeModuleTabItem: (tabId: string) => void;
};

export const ModuleContext = createContext<ModuleContextValue | null>(null);

export function useModuleContext(): ModuleContextValue {
  const ctx = use(ModuleContext);
  return (
    ctx ?? {
      stageId: null,
      removeModuleTabItem: () => {},
    }
  );
}
