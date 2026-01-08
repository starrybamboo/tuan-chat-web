import { createContext, use } from "react";

export interface ModuleContextValue {
  stageId: number | null;
  removeModuleTabItem: (tabId: string) => void;
}

const ModuleContext = createContext<ModuleContextValue | null>(null);

export function ModuleContextProvider(props: {
  value: ModuleContextValue;
  children: React.ReactNode;
}) {
  const { value, children } = props;
  return <ModuleContext value={value}>{children}</ModuleContext>;
}

export function useModuleContext(): ModuleContextValue {
  const ctx = use(ModuleContext);
  return (
    ctx ?? {
      stageId: null,
      removeModuleTabItem: () => {},
    }
  );
}
