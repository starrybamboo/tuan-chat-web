import { useCallback, useMemo, useState } from "react";

import type { AiImageStylePreset } from "@/utils/aiImageStylePresets";

import { getAiImageCompareStylePresets, getAiImageStylePresets } from "@/utils/aiImageStylePresets";

export function useAiImageStyleState() {
  const [isStylePickerOpen, setIsStylePickerOpen] = useState<boolean>(false);
  const [styleSelectionMode, setStyleSelectionMode] = useState<"select" | "compare">("select");
  const [selectedStyleIds, setSelectedStyleIds] = useState<string[]>([]);
  const [compareStyleId, setCompareStyleId] = useState<string | null>(null);

  const stylePresets = useMemo(() => getAiImageStylePresets(), []);
  const compareStylePresets = useMemo(() => getAiImageCompareStylePresets(), []);

  const selectedStylePresets = useMemo(() => {
    const index = new Map<string, AiImageStylePreset>(stylePresets.map(preset => [preset.id, preset]));
    return selectedStyleIds.map(id => index.get(id)).filter(Boolean) as AiImageStylePreset[];
  }, [selectedStyleIds, stylePresets]);

  const compareStylePreset = useMemo(() => {
    if (!compareStyleId)
      return null;
    return compareStylePresets.find(preset => preset.id === compareStyleId) ?? null;
  }, [compareStyleId, compareStylePresets]);

  const selectedStyleTags = useMemo(() => {
    return selectedStylePresets.flatMap((preset) => {
      if (preset.tags.length)
        return preset.tags;
      const fallback = String(preset.title || "").trim();
      return fallback ? [fallback] : [];
    });
  }, [selectedStylePresets]);

  const selectedStyleNegativeTags = useMemo(() => {
    return selectedStylePresets.flatMap(preset => preset.negativeTags);
  }, [selectedStylePresets]);

  const compareStyleTags = useMemo(() => {
    if (!compareStylePreset)
      return [];
    if (compareStylePreset.tags.length)
      return compareStylePreset.tags;
    const fallback = String(compareStylePreset.title || "").trim();
    return fallback ? [fallback] : [];
  }, [compareStylePreset]);

  const compareStyleNegativeTags = useMemo(() => {
    return compareStylePreset?.negativeTags ?? [];
  }, [compareStylePreset]);

  const activeStyleIds = styleSelectionMode === "compare"
    ? (compareStyleId ? [compareStyleId] : [])
    : selectedStyleIds;
  const activeStylePresets = styleSelectionMode === "compare"
    ? (compareStylePreset ? [compareStylePreset] : [])
    : selectedStylePresets;
  const activeStyleTags = styleSelectionMode === "compare" ? compareStyleTags : selectedStyleTags;
  const activeStyleNegativeTags = styleSelectionMode === "compare" ? compareStyleNegativeTags : selectedStyleNegativeTags;

  const handleToggleStyle = useCallback((id: string) => {
    setStyleSelectionMode("select");
    setSelectedStyleIds((prev) => {
      if (prev.includes(id))
        return prev.filter(item => item !== id);
      return [...prev, id];
    });
  }, []);

  const handleSelectCompareStyle = useCallback((id: string) => {
    setStyleSelectionMode("compare");
    setCompareStyleId((prev) => {
      if (prev === id)
        return null;
      return id;
    });
  }, []);

  const handleClearStyles = useCallback(() => {
    setSelectedStyleIds([]);
  }, []);

  const handleClearActiveStyles = useCallback(() => {
    if (styleSelectionMode === "compare") {
      setCompareStyleId(null);
      return;
    }
    setSelectedStyleIds([]);
  }, [styleSelectionMode]);

  return {
    isStylePickerOpen,
    setIsStylePickerOpen,
    styleSelectionMode,
    setStyleSelectionMode,
    selectedStyleIds,
    setSelectedStyleIds,
    compareStyleId,
    setCompareStyleId,
    stylePresets,
    compareStylePresets,
    selectedStylePresets,
    activeStyleIds,
    activeStylePresets,
    activeStyleTags,
    activeStyleNegativeTags,
    handleToggleStyle,
    handleSelectCompareStyle,
    handleClearStyles,
    handleClearActiveStyles,
  };
}
