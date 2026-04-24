import type { Dispatch, SetStateAction, MouseEvent as ReactMouseEvent } from "react";

import { useCallback, useEffect } from "react";

import type {
  HistoryRowClickMode,
  MetadataImportSelectionState,
  NovelAiEmotion,
  PreciseReferenceRow,
  ProFeatureSectionKey,
  ResolutionSelection,
  UiMode,
  V4CharEditorRow,
  VibeTransferReferenceRow,
} from "@/components/aiImage/types";
import type { AiImageHistoryMode, AiImageHistoryRow } from "@/utils/aiImageHistoryDb";
import type { NovelAiImageMetadataResult } from "@/utils/novelaiImageMetadata";
import type { NovelAiNl2TagsResult } from "@/utils/novelaiNl2Tags";

import { applyHistorySettingsAction, applyImportedMetadataAction } from "@/components/aiImage/controller/metadataHistoryActions";
import { deleteAiImageHistory, listAiImageHistory } from "@/utils/aiImageHistoryDb";
import { generatedItemKey, historyRowKey, historyRowResultMatchKey, historyRowToGeneratedItem } from "@/components/aiImage/helpers";

type ProFeatureSectionsState = Record<ProFeatureSectionKey, boolean>;

interface UseAiImageHistoryActionsOptions {
  uiMode: UiMode;
  samplerOptions: readonly string[];
  noiseScheduleOptions: readonly string[];
  simpleWidth: number;
  simpleHeight: number;
  proWidth: number;
  proHeight: number;
  v4Chars: V4CharEditorRow[];
  results: AiImageHistoryRow[] | ReturnType<typeof historyRowToGeneratedItem>[];
  pinnedPreviewKey: string | null;
  directorSourcePreview: ReturnType<typeof historyRowToGeneratedItem> | null;
  directorOutputPreview: ReturnType<typeof historyRowToGeneratedItem> | null;
  selectedHistoryPreviewKey: string | null;
  setHistory: (value: AiImageHistoryRow[]) => void;
  setSelectedHistoryPreviewKey: (value: string | null) => void;
  setResults: Dispatch<SetStateAction<ReturnType<typeof historyRowToGeneratedItem>[]>>;
  setSelectedResultIndex: Dispatch<SetStateAction<number>>;
  setPinnedPreviewKey: (value: string | null) => void;
  setDirectorSourcePreview: Dispatch<SetStateAction<ReturnType<typeof historyRowToGeneratedItem> | null>>;
  setDirectorOutputPreview: Dispatch<SetStateAction<ReturnType<typeof historyRowToGeneratedItem> | null>>;
  setIsPageImageDragOver: (value: boolean) => void;
  setSimpleConverted: (value: NovelAiNl2TagsResult | null) => void;
  setSimpleConvertedFromText: (value: string) => void;
  setSimplePromptTab: (value: "prompt" | "negative") => void;
  setSimpleSeed: (value: number) => void;
  setSimpleWidth: (value: number) => void;
  setSimpleHeight: (value: number) => void;
  setSimpleResolutionSelection: (value: ResolutionSelection) => void;
  setUiMode: (value: UiMode) => void;
  clearSourceImageForUi: (value: UiMode) => void;
  setVibeTransferReferences: (value: VibeTransferReferenceRow[]) => void;
  setPreciseReference: (value: PreciseReferenceRow | null) => void;
  setProFeatureSectionOpen: (section: ProFeatureSectionKey, open: boolean) => void;
  setPrompt: (value: string) => void;
  setNegativePrompt: (value: string) => void;
  setProSeed: (value: number) => void;
  setProWidth: (value: number) => void;
  setProHeight: (value: number) => void;
  setProResolutionSelection: (value: ResolutionSelection) => void;
  setProImageCount: (value: number) => void;
  setProSteps: (value: number) => void;
  setProScale: (value: number) => void;
  setProSampler: (value: string) => void;
  setProNoiseSchedule: (value: string) => void;
  setProCfgRescale: (value: number) => void;
  setProUcPreset: (value: number) => void;
  setProQualityToggle: (value: boolean) => void;
  setProDynamicThresholding: (value: boolean) => void;
  setProSmea: (value: boolean) => void;
  setProSmeaDyn: (value: boolean) => void;
  applyModeStrengthAndNoise: (targetUiMode: UiMode, targetMode: AiImageHistoryMode | undefined, nextStrength: number | undefined, nextNoise: number | undefined) => void;
  setV4UseCoords: (value: boolean) => void;
  setV4UseOrder: (value: boolean) => void;
  setV4Chars: (value: V4CharEditorRow[]) => void;
  setCharPromptTabs: (value: Record<string, "prompt" | "negative">) => void;
  inferResolutionSelection: (width: number, height: number) => ResolutionSelection;
  setSimpleText: (value: string) => void;
  setSimplePrompt: (value: string) => void;
  setSimpleNegativePrompt: (value: string) => void;
  setSimpleEditorMode: (value: "text" | "tags") => void;
  setProFeatureSections: (value: ProFeatureSectionsState) => void;
  restoreSourceImageForUi: (targetUiMode: UiMode, args: {
    dataUrl?: string | null;
    name: string;
    width?: number | null;
    height?: number | null;
  }) => boolean;
  showSuccessToast: (message: string) => void;
}

type GeneratedImageItem = ReturnType<typeof historyRowToGeneratedItem>;

export function useAiImageHistoryActions({
  uiMode,
  samplerOptions,
  noiseScheduleOptions,
  simpleWidth,
  simpleHeight,
  proWidth,
  proHeight,
  v4Chars,
  results,
  pinnedPreviewKey,
  directorSourcePreview,
  directorOutputPreview,
  selectedHistoryPreviewKey,
  setHistory,
  setSelectedHistoryPreviewKey,
  setResults,
  setSelectedResultIndex,
  setPinnedPreviewKey,
  setDirectorSourcePreview,
  setDirectorOutputPreview,
  setIsPageImageDragOver,
  setSimpleConverted,
  setSimpleConvertedFromText,
  setSimplePromptTab,
  setSimpleSeed,
  setSimpleWidth,
  setSimpleHeight,
  setSimpleResolutionSelection,
  setUiMode,
  clearSourceImageForUi,
  setVibeTransferReferences,
  setPreciseReference,
  setProFeatureSectionOpen,
  setPrompt,
  setNegativePrompt,
  setProSeed,
  setProWidth,
  setProHeight,
  setProResolutionSelection,
  setProImageCount,
  setProSteps,
  setProScale,
  setProSampler,
  setProNoiseSchedule,
  setProCfgRescale,
  setProUcPreset,
  setProQualityToggle,
  setProDynamicThresholding,
  setProSmea,
  setProSmeaDyn,
  applyModeStrengthAndNoise,
  setV4UseCoords,
  setV4UseOrder,
  setV4Chars,
  setCharPromptTabs,
  inferResolutionSelection,
  setSimpleText,
  setSimplePrompt,
  setSimpleNegativePrompt,
  setSimpleEditorMode,
  setProFeatureSections,
  restoreSourceImageForUi,
  showSuccessToast,
}: UseAiImageHistoryActionsOptions) {
  const refreshHistory = useCallback(async () => {
    const rows = await listAiImageHistory({ limit: 30 });
    setHistory(rows);
  }, [setHistory]);

  useEffect(() => {
    void refreshHistory();
  }, [refreshHistory]);

  const applyImportedMetadata = useCallback((metadata: NovelAiImageMetadataResult, selection: MetadataImportSelectionState) => {
    applyImportedMetadataAction({
      metadata,
      selection,
      current: {
        uiMode,
        simpleWidth,
        simpleHeight,
        proWidth,
        proHeight,
        v4Chars,
        samplerOptions,
        noiseScheduleOptions,
      },
      shared: {
        setIsPageImageDragOver,
        setUiMode,
        clearSourceImageForUi,
        applyModeStrengthAndNoise,
        inferResolutionSelection,
      },
      simple: {
        setSimpleConverted,
        setSimpleConvertedFromText,
        setSimplePromptTab,
        setSimpleSeed,
        setSimpleWidth,
        setSimpleHeight,
        setSimpleResolutionSelection,
      },
      pro: {
        setPrompt,
        setNegativePrompt,
        setProSeed,
        setProWidth,
        setProHeight,
        setProResolutionSelection,
        setProImageCount,
        setProSteps,
        setProScale,
        setProSampler,
        setProNoiseSchedule,
        setProCfgRescale,
        setProUcPreset,
        setProQualityToggle,
        setProDynamicThresholding,
        setProSmea,
        setProSmeaDyn,
        setProFeatureSectionOpen,
      },
      characters: {
        setV4UseCoords,
        setV4UseOrder,
        setV4Chars,
        setCharPromptTabs,
      },
      references: {
        setVibeTransferReferences,
        setPreciseReference,
      },
    });
  }, [
    applyModeStrengthAndNoise,
    clearSourceImageForUi,
    inferResolutionSelection,
    noiseScheduleOptions,
    proHeight,
    proWidth,
    samplerOptions,
    setCharPromptTabs,
    setIsPageImageDragOver,
    setNegativePrompt,
    setPreciseReference,
    setProCfgRescale,
    setProDynamicThresholding,
    setProFeatureSectionOpen,
    setProHeight,
    setProImageCount,
    setProNoiseSchedule,
    setProQualityToggle,
    setProResolutionSelection,
    setProScale,
    setProSeed,
    setProSmea,
    setProSmeaDyn,
    setProSampler,
    setProSteps,
    setProUcPreset,
    setProWidth,
    setPrompt,
    setSimpleConverted,
    setSimpleConvertedFromText,
    setSimpleHeight,
    setSimplePromptTab,
    setSimpleResolutionSelection,
    setSimpleSeed,
    setSimpleWidth,
    setUiMode,
    setV4Chars,
    setV4UseCoords,
    setV4UseOrder,
    setVibeTransferReferences,
    simpleHeight,
    simpleWidth,
    uiMode,
    v4Chars,
  ]);

  const handleApplyHistorySettings = useCallback((row: AiImageHistoryRow, clickMode: Exclude<HistoryRowClickMode, "preview">) => {
    applyHistorySettingsAction({
      row,
      clickMode,
      uiMode,
      samplerOptions,
      noiseScheduleOptions,
      shared: {
        setSelectedHistoryPreviewKey,
        showSuccessToast,
        restoreSourceImageForUi,
        clearSourceImageForUi,
        applyModeStrengthAndNoise,
        inferResolutionSelection,
      },
      simple: {
        setSimpleSeed,
        setSimpleText,
        setSimpleConverted,
        setSimpleConvertedFromText,
        setSimplePrompt,
        setSimpleNegativePrompt,
        setSimpleEditorMode,
        setSimplePromptTab,
        setSimpleWidth,
        setSimpleHeight,
        setSimpleResolutionSelection,
      },
      pro: {
        setPrompt,
        setNegativePrompt,
        setProSeed,
        setProFeatureSections,
        setProWidth,
        setProHeight,
        setProResolutionSelection,
        setProImageCount,
        setProSteps,
        setProScale,
        setProSampler,
        setProNoiseSchedule,
        setProCfgRescale,
        setProUcPreset,
        setProQualityToggle,
        setProDynamicThresholding,
        setProSmea,
        setProSmeaDyn,
      },
      characters: {
        setV4UseCoords,
        setV4UseOrder,
        setV4Chars,
        setCharPromptTabs,
      },
      references: {
        setVibeTransferReferences,
        setPreciseReference,
      },
    });
  }, [
    applyModeStrengthAndNoise,
    clearSourceImageForUi,
    inferResolutionSelection,
    noiseScheduleOptions,
    restoreSourceImageForUi,
    samplerOptions,
    setCharPromptTabs,
    setNegativePrompt,
    setPreciseReference,
    setProCfgRescale,
    setProDynamicThresholding,
    setProFeatureSections,
    setProHeight,
    setProImageCount,
    setProNoiseSchedule,
    setProQualityToggle,
    setProResolutionSelection,
    setProScale,
    setProSeed,
    setProSmea,
    setProSmeaDyn,
    setProSampler,
    setProSteps,
    setProUcPreset,
    setProWidth,
    setPrompt,
    setSelectedHistoryPreviewKey,
    setSimpleConverted,
    setSimpleConvertedFromText,
    setSimpleEditorMode,
    setSimpleHeight,
    setSimpleNegativePrompt,
    setSimplePrompt,
    setSimplePromptTab,
    setSimpleResolutionSelection,
    setSimpleSeed,
    setSimpleText,
    setSimpleWidth,
    setV4Chars,
    setV4UseCoords,
    setV4UseOrder,
    setVibeTransferReferences,
    showSuccessToast,
    uiMode,
  ]);

  const handleHistoryRowClick = useCallback((row: AiImageHistoryRow, event: ReactMouseEvent<HTMLButtonElement>) => {
    const clickMode: HistoryRowClickMode = (event.metaKey || event.ctrlKey)
      ? (event.shiftKey ? "settings-with-seed" : "settings")
      : (event.shiftKey ? "seed" : "preview");

    if (clickMode === "preview") {
      setSelectedHistoryPreviewKey(historyRowKey(row));
      return;
    }

    handleApplyHistorySettings(row, clickMode);
  }, [handleApplyHistorySettings, setSelectedHistoryPreviewKey]);

  const handleDeleteHistoryRow = useCallback(async (row: AiImageHistoryRow) => {
    if (typeof row.id !== "number")
      return;

    const rowKey = historyRowKey(row);
    const rowResultMatchKey = historyRowResultMatchKey(row);
    const rowGeneratedItemKey = generatedItemKey(historyRowToGeneratedItem(row));
    const nextResults = (results as GeneratedImageItem[]).filter(item => generatedItemKey(item) !== rowResultMatchKey);
    const deleteIndex = (results as GeneratedImageItem[]).findIndex(item => generatedItemKey(item) === rowResultMatchKey);

    await deleteAiImageHistory(row.id);
    await refreshHistory();

    if (selectedHistoryPreviewKey === rowKey)
      setSelectedHistoryPreviewKey(null);
    if (directorSourcePreview && generatedItemKey(directorSourcePreview) === rowGeneratedItemKey)
      setDirectorSourcePreview(null);
    if (directorOutputPreview && generatedItemKey(directorOutputPreview) === rowGeneratedItemKey)
      setDirectorOutputPreview(null);
    if (pinnedPreviewKey === `history:${rowKey}` || (deleteIndex >= 0 && pinnedPreviewKey === `current:${rowResultMatchKey}`))
      setPinnedPreviewKey(null);

    if (deleteIndex >= 0) {
      setResults(nextResults);
      setSelectedResultIndex((prev) => {
        if (!nextResults.length)
          return 0;
        if (prev > deleteIndex)
          return prev - 1;
        return Math.min(prev, nextResults.length - 1);
      });
    }
  }, [
    directorOutputPreview,
    directorSourcePreview,
    pinnedPreviewKey,
    refreshHistory,
    results,
    selectedHistoryPreviewKey,
    setDirectorOutputPreview,
    setDirectorSourcePreview,
    setPinnedPreviewKey,
    setResults,
    setSelectedHistoryPreviewKey,
    setSelectedResultIndex,
  ]);

  return {
    refreshHistory,
    applyImportedMetadata,
    handleApplyHistorySettings,
    handleHistoryRowClick,
    handleDeleteHistoryRow,
  };
}
