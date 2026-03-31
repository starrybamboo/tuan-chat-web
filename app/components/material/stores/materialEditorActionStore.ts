import { create } from "zustand";

import type { MaterialEditorActionScope } from "@/components/chat/chatPage.types";

export type MaterialEditorActionController = {
  packageId: number;
  addFolder: (parentNodeKey?: string | null) => void;
  addMaterial: (parentNodeKey?: string | null) => void;
  deleteNode: (nodeKey: string) => void;
};

type MaterialEditorActionStoreState = {
  controllers: Partial<Record<MaterialEditorActionScope, MaterialEditorActionController>>;
  setController: (scope: MaterialEditorActionScope, controller: MaterialEditorActionController) => void;
  clearController: (scope: MaterialEditorActionScope) => void;
};

export const useMaterialEditorActionStore = create<MaterialEditorActionStoreState>(set => ({
  controllers: {},
  setController: (scope, controller) => {
    set(state => ({
      controllers: {
        ...state.controllers,
        [scope]: controller,
      },
    }));
  },
  clearController: (scope) => {
    set((state) => {
      if (!state.controllers[scope]) {
        return state;
      }
      const nextControllers = { ...state.controllers };
      delete nextControllers[scope];
      return { controllers: nextControllers };
    });
  },
}));
