import type { Dispatch, SetStateAction } from "react";

import { useCallback } from "react";

import type { V4CharEditorRow, V4CharGender, VibeTransferReferenceRow } from "@/components/aiImage/types";

import { getNextAvailableV4CharGridCell, newV4CharEditorRow, normalizeV4CharGridRows } from "@/components/aiImage/helpers";

type UseAiImageCharacterActionsOptions = {
  v4UseCoords: boolean;
  setV4Chars: Dispatch<SetStateAction<V4CharEditorRow[]>>;
  setCharPromptTabs: Dispatch<SetStateAction<Record<string, "prompt" | "negative">>>;
  setProFeatureSectionOpen: (section: "characterPrompts", open: boolean) => void;
  setV4UseCoords: Dispatch<SetStateAction<boolean>>;
  setVibeTransferReferences: Dispatch<SetStateAction<VibeTransferReferenceRow[]>>;
};

export function useAiImageCharacterActions({
  v4UseCoords,
  setV4Chars,
  setCharPromptTabs,
  setProFeatureSectionOpen,
  setV4UseCoords,
  setVibeTransferReferences,
}: UseAiImageCharacterActionsOptions) {
  const handleAddV4Char = useCallback((options?: { defaultPrompt?: string; gender?: V4CharGender }) => {
    const row = {
      ...newV4CharEditorRow({ gender: options?.gender ?? "other" }),
      prompt: options?.defaultPrompt ?? "",
    };
    setV4Chars((prev: V4CharEditorRow[]) => {
      if (!v4UseCoords)
        return [...prev, row];
      const nextCell = getNextAvailableV4CharGridCell(prev);
      return [
        ...prev,
        {
          ...row,
          centerX: nextCell.centerX,
          centerY: nextCell.centerY,
        },
      ];
    });
    setCharPromptTabs((prev: Record<string, "prompt" | "negative">) => ({ ...prev, [row.id]: "prompt" }));
    setProFeatureSectionOpen("characterPrompts", true);
  }, [setCharPromptTabs, setProFeatureSectionOpen, setV4Chars, v4UseCoords]);

  const handleRemoveV4Char = useCallback((id: string) => {
    setV4Chars((prev: V4CharEditorRow[]) => prev.filter(item => item.id !== id));
    setCharPromptTabs((prev: Record<string, "prompt" | "negative">) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, [setCharPromptTabs, setV4Chars]);

  const handleMoveV4Char = useCallback((id: string, direction: -1 | 1) => {
    setV4Chars((prev: V4CharEditorRow[]) => {
      const idx = prev.findIndex(item => item.id === id);
      if (idx < 0)
        return prev;
      const nextIdx = idx + direction;
      if (nextIdx < 0 || nextIdx >= prev.length)
        return prev;
      const next = prev.slice();
      const [moved] = next.splice(idx, 1);
      next.splice(nextIdx, 0, moved);
      return next;
    });
  }, [setV4Chars]);

  const handleUpdateV4Char = useCallback((id: string, patch: Partial<V4CharEditorRow>) => {
    setV4Chars((prev: V4CharEditorRow[]) => prev.map(item => (item.id === id ? { ...item, ...patch } : item)));
  }, [setV4Chars]);

  const handleSetV4UseCoords = useCallback((enabled: boolean) => {
    setV4UseCoords((prev: boolean) => {
      if (prev === enabled)
        return prev;
      return enabled;
    });
    if (!enabled)
      return;
    setV4Chars((prev: V4CharEditorRow[]) => {
      const next = normalizeV4CharGridRows(prev);
      return next === prev ? prev : next;
    });
  }, [setV4Chars, setV4UseCoords]);

  const handleUpdateVibeReference = useCallback((id: string, patch: Partial<VibeTransferReferenceRow>) => {
    setVibeTransferReferences((prev: VibeTransferReferenceRow[]) => prev.map(item => (item.id === id ? { ...item, ...patch } : item)));
  }, [setVibeTransferReferences]);

  const handleRemoveVibeReference = useCallback((id: string) => {
    setVibeTransferReferences((prev: VibeTransferReferenceRow[]) => prev.filter(item => item.id !== id));
  }, [setVibeTransferReferences]);

  return {
    handleAddV4Char,
    handleRemoveV4Char,
    handleMoveV4Char,
    handleUpdateV4Char,
    handleSetV4UseCoords,
    handleUpdateVibeReference,
    handleRemoveVibeReference,
  };
}
