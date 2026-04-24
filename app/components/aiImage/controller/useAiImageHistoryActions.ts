import type { MouseEvent as ReactMouseEvent } from "react";
import { useCallback, useEffect } from "react";

import type { HistoryRowClickMode, MetadataImportSelectionState, UiMode, V4CharEditorRow } from "@/components/aiImage/types";
import type { AiImageHistoryRow } from "@/utils/aiImageHistoryDb";
import type { NovelAiImageMetadataResult } from "@/utils/novelaiImageMetadata";

import { applyHistorySettingsAction, applyImportedMetadataAction } from "@/components/aiImage/controller/metadataHistoryActions";
import { deleteAiImageHistory, listAiImageHistory } from "@/utils/aiImageHistoryDb";
import { generatedItemKey, historyRowKey, historyRowResultMatchKey, historyRowToGeneratedItem } from "@/components/aiImage/helpers";

interface UseAiImageHistoryActionsOptions {
  uiMode: UiMode;
  samplerOptions: readonly string[];
  noiseScheduleOptions: readonly string[];
  simpleWidth: number;
  simpleHeight: number;
  proWidth: number;
  proHeight: number;
  v4Chars: V4CharEditorRow[];
  results: any[];
  pinnedPreviewKey: string | null;
  directorSourcePreview: any;
  directorOutputPreview: any;
  selectedHistoryPreviewKey: string | null;
  setHistory: (value: AiImageHistoryRow[]) => void;
  setSelectedHistoryPreviewKey: (value: string | null) => void;
  setResults: (value: any) => void;
  setSelectedResultIndex: (value: any) => void;
  setPinnedPreviewKey: (value: string | null) => void;
  setDirectorSourcePreview: (value: any) => void;
  setDirectorOutputPreview: (value: any) => void;
  setIsPageImageDragOver: (value: boolean) => void;
  setSimpleConverted: (value: any) => void;
  setSimpleConvertedFromText: (value: string) => void;
  setSimplePromptTab: (value: "prompt" | "negative") => void;
  setSimpleSeed: (value: number) => void;
  setSimpleWidth: (value: number) => void;
  setSimpleHeight: (value: number) => void;
  setSimpleResolutionSelection: (value: any) => void;
  setUiMode: (value: UiMode) => void;
  clearSourceImageForUi: (value: UiMode) => void;
  setVibeTransferReferences: (value: any[]) => void;
  setPreciseReference: (value: any) => void;
  setProFeatureSectionOpen: (section: any, open: boolean) => void;
  setPrompt: (value: string) => void;
  setNegativePrompt: (value: string) => void;
  setProSeed: (value: number) => void;
  setProWidth: (value: number) => void;
  setProHeight: (value: number) => void;
  setProResolutionSelection: (value: any) => void;
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
  applyModeStrengthAndNoise: (targetUiMode: UiMode, targetMode: any, nextStrength: number | undefined, nextNoise: number | undefined) => void;
  setV4UseCoords: (value: boolean) => void;
  setV4UseOrder: (value: boolean) => void;
  setV4Chars: (value: V4CharEditorRow[]) => void;
  setCharPromptTabs: (value: Record<string, "prompt" | "negative">) => void;
  inferResolutionSelection: (width: number, height: number) => any;
  setSimpleText: (value: string) => void;
  setSimplePrompt: (value: string) => void;
  setSimpleNegativePrompt: (value: string) => void;
  setSimpleEditorMode: (value: "text" | "tags") => void;
  setProFeatureSections: (value: any) => void;
  restoreSourceImageForUi: (targetUiMode: UiMode, args: {
    dataUrl?: string | null;
    name: string;
    width?: number | null;
    height?: number | null;
  }) => any;
  showSuccessToast: (message: string) => void;
}

export function useAiImageHistoryActions(options: UseAiImageHistoryActionsOptions) {
  const refreshHistory = useCallback(async () => {
    const rows = await listAiImageHistory({ limit: 30 });
    options.setHistory(rows);
  }, [options]);

  useEffect(() => {
    void refreshHistory();
  }, [refreshHistory]);

  const applyImportedMetadata = useCallback((metadata: NovelAiImageMetadataResult, selection: MetadataImportSelectionState) => {
    applyImportedMetadataAction({
      metadata,
      selection,
      uiMode: options.uiMode,
      simpleWidth: options.simpleWidth,
      simpleHeight: options.simpleHeight,
      proWidth: options.proWidth,
      proHeight: options.proHeight,
      v4Chars: options.v4Chars,
      samplerOptions: options.samplerOptions,
      noiseScheduleOptions: options.noiseScheduleOptions,
      setIsPageImageDragOver: options.setIsPageImageDragOver,
      setSimpleConverted: options.setSimpleConverted,
      setSimpleConvertedFromText: options.setSimpleConvertedFromText,
      setSimplePromptTab: options.setSimplePromptTab,
      setSimpleSeed: options.setSimpleSeed,
      setSimpleWidth: options.setSimpleWidth,
      setSimpleHeight: options.setSimpleHeight,
      setSimpleResolutionSelection: options.setSimpleResolutionSelection,
      setUiMode: options.setUiMode,
      clearSourceImageForUi: options.clearSourceImageForUi,
      setVibeTransferReferences: options.setVibeTransferReferences,
      setPreciseReference: options.setPreciseReference,
      setProFeatureSectionOpen: options.setProFeatureSectionOpen,
      setPrompt: options.setPrompt,
      setNegativePrompt: options.setNegativePrompt,
      setProSeed: options.setProSeed,
      setProWidth: options.setProWidth,
      setProHeight: options.setProHeight,
      setProResolutionSelection: options.setProResolutionSelection,
      setProImageCount: options.setProImageCount,
      setProSteps: options.setProSteps,
      setProScale: options.setProScale,
      setProSampler: options.setProSampler,
      setProNoiseSchedule: options.setProNoiseSchedule,
      setProCfgRescale: options.setProCfgRescale,
      setProUcPreset: options.setProUcPreset,
      setProQualityToggle: options.setProQualityToggle,
      setProDynamicThresholding: options.setProDynamicThresholding,
      setProSmea: options.setProSmea,
      setProSmeaDyn: options.setProSmeaDyn,
      applyModeStrengthAndNoise: options.applyModeStrengthAndNoise,
      setV4UseCoords: options.setV4UseCoords,
      setV4UseOrder: options.setV4UseOrder,
      setV4Chars: options.setV4Chars,
      setCharPromptTabs: options.setCharPromptTabs,
      inferResolutionSelection: options.inferResolutionSelection,
    });
  }, [options]);

  const handleApplyHistorySettings = useCallback((row: AiImageHistoryRow, clickMode: Exclude<HistoryRowClickMode, "preview">) => {
    applyHistorySettingsAction({
      row,
      clickMode,
      uiMode: options.uiMode,
      samplerOptions: options.samplerOptions,
      noiseScheduleOptions: options.noiseScheduleOptions,
      setSelectedHistoryPreviewKey: options.setSelectedHistoryPreviewKey,
      setSimpleSeed: options.setSimpleSeed,
      setProSeed: options.setProSeed,
      showSuccessToast: options.showSuccessToast,
      restoreSourceImageForUi: options.restoreSourceImageForUi,
      setSimpleText: options.setSimpleText,
      setSimpleConverted: options.setSimpleConverted,
      setSimpleConvertedFromText: options.setSimpleConvertedFromText,
      setSimplePrompt: options.setSimplePrompt,
      setSimpleNegativePrompt: options.setSimpleNegativePrompt,
      setSimpleEditorMode: options.setSimpleEditorMode,
      setSimplePromptTab: options.setSimplePromptTab,
      setSimpleWidth: options.setSimpleWidth,
      setSimpleHeight: options.setSimpleHeight,
      setSimpleResolutionSelection: options.setSimpleResolutionSelection,
      applyModeStrengthAndNoise: options.applyModeStrengthAndNoise,
      clearSourceImageForUi: options.clearSourceImageForUi,
      setPrompt: options.setPrompt,
      setNegativePrompt: options.setNegativePrompt,
      setV4UseCoords: options.setV4UseCoords,
      setV4UseOrder: options.setV4UseOrder,
      setV4Chars: options.setV4Chars,
      setCharPromptTabs: options.setCharPromptTabs,
      setVibeTransferReferences: options.setVibeTransferReferences,
      setPreciseReference: options.setPreciseReference,
      setProFeatureSections: options.setProFeatureSections,
      setProWidth: options.setProWidth,
      setProHeight: options.setProHeight,
      setProResolutionSelection: options.setProResolutionSelection,
      setProImageCount: options.setProImageCount,
      setProSteps: options.setProSteps,
      setProScale: options.setProScale,
      setProSampler: options.setProSampler,
      setProNoiseSchedule: options.setProNoiseSchedule,
      setProCfgRescale: options.setProCfgRescale,
      setProUcPreset: options.setProUcPreset,
      setProQualityToggle: options.setProQualityToggle,
      setProDynamicThresholding: options.setProDynamicThresholding,
      setProSmea: options.setProSmea,
      setProSmeaDyn: options.setProSmeaDyn,
      inferResolutionSelection: options.inferResolutionSelection,
    });
  }, [options]);

  const handleHistoryRowClick = useCallback((row: AiImageHistoryRow, event: ReactMouseEvent<HTMLButtonElement>) => {
    const clickMode: HistoryRowClickMode = (event.metaKey || event.ctrlKey)
      ? (event.shiftKey ? "settings-with-seed" : "settings")
      : (event.shiftKey ? "seed" : "preview");

    if (clickMode === "preview") {
      options.setSelectedHistoryPreviewKey(historyRowKey(row));
      return;
    }

    handleApplyHistorySettings(row, clickMode);
  }, [handleApplyHistorySettings, options]);

  const handleDeleteHistoryRow = useCallback(async (row: AiImageHistoryRow) => {
    if (typeof row.id !== "number")
      return;

    const rowKey = historyRowKey(row);
    const rowResultMatchKey = historyRowResultMatchKey(row);
    const rowGeneratedItemKey = generatedItemKey(historyRowToGeneratedItem(row));
    const deleteIndex = options.results.findIndex(item => generatedItemKey(item) === rowResultMatchKey);
    const nextResults = deleteIndex >= 0
      ? options.results.filter((_, index) => index !== deleteIndex)
      : options.results;

    await deleteAiImageHistory(row.id);
    await refreshHistory();
    if (options.selectedHistoryPreviewKey === rowKey)
      options.setSelectedHistoryPreviewKey(null);
    if (options.directorSourcePreview && generatedItemKey(options.directorSourcePreview) === rowGeneratedItemKey)
      options.setDirectorSourcePreview(null);
    if (options.directorOutputPreview && generatedItemKey(options.directorOutputPreview) === rowGeneratedItemKey)
      options.setDirectorOutputPreview(null);
    if (options.pinnedPreviewKey === `history:${rowKey}` || (deleteIndex >= 0 && options.pinnedPreviewKey === `current:${rowResultMatchKey}`))
      options.setPinnedPreviewKey(null);

    if (deleteIndex >= 0) {
      options.setResults(nextResults);
      options.setSelectedResultIndex((prev: number) => {
        if (!nextResults.length)
          return 0;
        if (prev > deleteIndex)
          return prev - 1;
        return Math.min(prev, nextResults.length - 1);
      });
    }
  }, [options, refreshHistory]);

  return {
    refreshHistory,
    applyImportedMetadata,
    handleApplyHistorySettings,
    handleHistoryRowClick,
    handleDeleteHistoryRow,
  };
}
