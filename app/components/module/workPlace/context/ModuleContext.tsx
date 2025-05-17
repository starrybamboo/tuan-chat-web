// ModuleContext.tsx
import type { ReactNode } from "react";
import { createContext, use, useMemo, useState } from "react";

interface ModuleContextType {
  modulePartition: string;
  setModulePartition: (value: string) => void;
  selectedRoleId: number | null;
  setSelectedRoleId: (id: number | null) => void;
}

const moduleType = {
  content: {
    role: "role",
    item: "item",
    scene: "scene",
  },
  staging: {},
  history: {},
};

const ModuleContext = createContext<ModuleContextType | undefined>(undefined);

export function ModuleProvider({ children }: { children: ReactNode }) {
  const [modulePartition, setModulePartition] = useState(moduleType.content.role);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);

  const moduleValue = useMemo(() => ({
    modulePartition,
    setModulePartition,
    selectedRoleId,
    setSelectedRoleId,
  }), [modulePartition, selectedRoleId]);

  return (
    <ModuleContext
      value={moduleValue}
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

export { moduleType };
