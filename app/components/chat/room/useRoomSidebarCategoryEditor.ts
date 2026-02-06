import { useCallback, useState } from "react";

import type { SidebarTree } from "./sidebarTree";
import type { CategoryEditorState } from "./sidebarTreeOverlays";

type UseRoomSidebarCategoryEditorParams = {
  treeToRender: SidebarTree;
  normalizeAndSet: (next: SidebarTree, save: boolean) => void;
  toggleCategoryExpanded: (categoryId: string) => void;
  defaultCategoryName: string;
  emptyNameError: string;
};

export default function useRoomSidebarCategoryEditor({
  treeToRender,
  normalizeAndSet,
  toggleCategoryExpanded,
  defaultCategoryName,
  emptyNameError,
}: UseRoomSidebarCategoryEditorParams) {
  const [categoryEditor, setCategoryEditor] = useState<CategoryEditorState | null>(null);
  const [categoryEditorError, setCategoryEditorError] = useState<string>("");

  const openAddCategory = useCallback(() => {
    setCategoryEditor({ mode: "add", name: defaultCategoryName });
    setCategoryEditorError("");
  }, [defaultCategoryName]);

  const openRenameCategory = useCallback((categoryId: string) => {
    const current = treeToRender.categories.find(c => c.categoryId === categoryId);
    if (!current)
      return;
    setCategoryEditor({ mode: "rename", categoryId, name: current.name ?? "" });
    setCategoryEditorError("");
  }, [treeToRender.categories]);

  const updateCategoryEditorName = useCallback((name: string) => {
    setCategoryEditor(prev => prev ? { ...prev, name } : prev);
    setCategoryEditorError("");
  }, []);

  const closeCategoryEditor = useCallback(() => {
    setCategoryEditor(null);
    setCategoryEditorError("");
  }, []);

  const submitCategoryEditor = useCallback(() => {
    if (!categoryEditor)
      return;
    const name = categoryEditor.name.trim();
    if (!name) {
      setCategoryEditorError(emptyNameError);
      return;
    }
    const base = treeToRender;
    const next = JSON.parse(JSON.stringify(base)) as SidebarTree;
    let newCategoryId: string | null = null;
    if (categoryEditor.mode === "add") {
      next.categories.push({
        categoryId: (newCategoryId = `cat:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`),
        name,
        items: [],
      });
    }
    else {
      const cat = next.categories.find(c => c.categoryId === categoryEditor.categoryId);
      if (!cat)
        return;
      cat.name = name;
    }
    normalizeAndSet(next, true);
    setCategoryEditor(null);
    setCategoryEditorError("");

    if (newCategoryId) {
      toggleCategoryExpanded(newCategoryId);
    }
  }, [categoryEditor, emptyNameError, normalizeAndSet, toggleCategoryExpanded, treeToRender]);

  return {
    categoryEditor,
    categoryEditorError,
    openAddCategory,
    openRenameCategory,
    submitCategoryEditor,
    closeCategoryEditor,
    updateCategoryEditorName,
  };
}
