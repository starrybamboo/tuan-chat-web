import type { MetadataImportSelectionState, PendingMetadataImportState, ResolutionSelection } from "@/components/aiImage/types";
import type { NovelAiNl2TagsResult } from "@/utils/novelaiNl2Tags";
import { useCallback, useEffect } from "react";

import type { AiImageHistoryMode } from "@/utils/aiImageHistoryDb";

import {
  DEFAULT_SIMPLE_IMAGE_SETTINGS,
} from "@/components/aiImage/constants";
import { resolveSimpleGenerateMode, sanitizeNovelAiTagInput, shouldKeepSimpleTagsEditor } from "@/components/aiImage/helpers";

const DEFAULT_INPAINT_STRENGTH = 1;
const DEFAULT_INPAINT_NOISE = 0;

interface UseAiImageSimpleActionsOptions {
  mode: AiImageHistoryMode;
  simpleMode: AiImageHistoryMode;
  simpleText: string;
  simplePrompt: string;
  simpleNegativePrompt: string;
  simpleConverted: { prompt: string; negativePrompt: string } | null;
  simpleEditorMode: "text" | "tags";
  simpleConverting: boolean;
  loading: boolean;
  pendingPreviewAction: string;
  clearSourceImageForUi: (mode: "simple" | "pro") => void;
  runGenerate: (args?: {
    prompt?: string;
    negativePrompt?: string;
    mode?: AiImageHistoryMode;
  }) => Promise<boolean>;
  setSimpleConverted: (value: NovelAiNl2TagsResult | null) => void;
  setSimpleConvertedFromText: (value: string) => void;
  setSimplePrompt: (value: string) => void;
  setSimpleNegativePrompt: (value: string) => void;
  setSimpleEditorMode: (value: "text" | "tags") => void;
  setSimplePromptTab: (value: "prompt" | "negative") => void;
  setSimpleConverting: (value: boolean) => void;
  setSimpleText: (value: string) => void;
  setSimpleWidth: (value: number) => void;
  setSimpleHeight: (value: number) => void;
  setSimpleImg2imgStrength: (value: number) => void;
  setSimpleImg2imgNoise: (value: number) => void;
  setSimpleInfillStrength: (value: number) => void;
  setSimpleInfillNoise: (value: number) => void;
  setSimpleSeed: (value: number) => void;
  setSimpleResolutionSelection: (value: ResolutionSelection) => void;
  setSelectedStyleIds: (value: string[]) => void;
  setCompareStyleId: (value: string | null) => void;
  setStyleSelectionMode: (value: "select" | "compare") => void;
  setPendingMetadataImport: (value: PendingMetadataImportState | null) => void;
  setMetadataImportSelection: (value: MetadataImportSelectionState) => void;
  setIsPageImageDragOver: (value: boolean) => void;
  showErrorToast: (message: string) => void;
  showSuccessToast: (message: string) => void;
  convertNaturalLanguageToNovelAiTags: (args: { input: string }) => Promise<NovelAiNl2TagsResult>;
  defaultMetadataImportSelection: MetadataImportSelectionState;
}

export function useAiImageSimpleActions({
  mode,
  simpleMode,
  simpleText,
  simplePrompt,
  simpleNegativePrompt,
  simpleConverted,
  simpleEditorMode,
  simpleConverting,
  loading,
  pendingPreviewAction,
  clearSourceImageForUi,
  runGenerate,
  setSimpleConverted,
  setSimpleConvertedFromText,
  setSimplePrompt,
  setSimpleNegativePrompt,
  setSimpleEditorMode,
  setSimplePromptTab,
  setSimpleConverting,
  setSimpleText,
  setSimpleWidth,
  setSimpleHeight,
  setSimpleImg2imgStrength,
  setSimpleImg2imgNoise,
  setSimpleInfillStrength,
  setSimpleInfillNoise,
  setSimpleSeed,
  setSimpleResolutionSelection,
  setSelectedStyleIds,
  setCompareStyleId,
  setStyleSelectionMode,
  setPendingMetadataImport,
  setMetadataImportSelection,
  setIsPageImageDragOver,
  showErrorToast,
  showSuccessToast,
  convertNaturalLanguageToNovelAiTags,
  defaultMetadataImportSelection,
}: UseAiImageSimpleActionsOptions) {
  useEffect(() => {
    if (simpleEditorMode !== "tags")
      return;
    if (shouldKeepSimpleTagsEditor({
      mode: simpleMode,
      prompt: simplePrompt,
      negativePrompt: simpleNegativePrompt,
      hasConvertedDraft: Boolean(simpleConverted),
    }))
      return;

    setSimpleConvertedFromText("");
    setSimpleEditorMode("text");
    setSimplePromptTab("prompt");
  }, [
    setSimpleConvertedFromText,
    setSimpleEditorMode,
    setSimplePromptTab,
    simpleConverted,
    simpleEditorMode,
    simpleMode,
    simpleNegativePrompt,
    simplePrompt,
  ]);

  const handleSimpleConvertToTags = useCallback(async () => {
    const trimmed = simpleText.trim();
    if (!trimmed) {
      showErrorToast("请先输入自然语言描述。");
      return;
    }

    setSimpleConverting(true);
    try {
      const converted = await convertNaturalLanguageToNovelAiTags({ input: trimmed });
      setSimpleConverted(converted);
      setSimpleConvertedFromText(trimmed);
      setSimplePromptTab("prompt");
    }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showErrorToast(message);
    }
    finally {
      setSimpleConverting(false);
    }
  }, [
    convertNaturalLanguageToNovelAiTags,
    setSimpleConverted,
    setSimpleConvertedFromText,
    setSimpleConverting,
    setSimplePromptTab,
    showErrorToast,
    simpleText,
  ]);

  const handleAcceptSimpleConverted = useCallback(() => {
    if (!simpleConverted?.prompt.trim()) {
      showErrorToast("转换结果为空，请重试。");
      return;
    }

    setSimplePrompt(simpleConverted.prompt);
    setSimpleNegativePrompt(simpleConverted.negativePrompt);
    setSimpleConverted(null);
    setSimpleConvertedFromText(simpleText.trim());
    setSimpleEditorMode("tags");
    setSimplePromptTab("prompt");
  }, [
    setSimpleConverted,
    setSimpleConvertedFromText,
    setSimpleEditorMode,
    setSimpleNegativePrompt,
    setSimplePrompt,
    setSimplePromptTab,
    showErrorToast,
    simpleConverted,
    simpleText,
  ]);

  const handleRejectSimpleConverted = useCallback(() => {
    setSimpleConverted(null);
    setSimpleConvertedFromText("");
  }, [setSimpleConverted, setSimpleConvertedFromText]);

  const handleReturnToSimpleText = useCallback(() => {
    setSimpleConverted(null);
    setSimpleConvertedFromText("");
    setSimpleEditorMode("text");
    setSimplePromptTab("prompt");
  }, [setSimpleConverted, setSimpleConvertedFromText, setSimpleEditorMode, setSimplePromptTab]);

  const handleReturnToSimpleTags = useCallback(() => {
    if (!sanitizeNovelAiTagInput(simplePrompt) && !sanitizeNovelAiTagInput(simpleNegativePrompt)) {
      showErrorToast("当前没有可返回的 tags。");
      return;
    }
    setSimpleConverted(null);
    setSimpleConvertedFromText(simpleText.trim());
    setSimpleEditorMode("tags");
    setSimplePromptTab("prompt");
  }, [
    setSimpleConverted,
    setSimpleConvertedFromText,
    setSimpleEditorMode,
    setSimplePromptTab,
    showErrorToast,
    simpleNegativePrompt,
    simplePrompt,
    simpleText,
  ]);

  const handleSimpleGenerateFromTags = useCallback(async () => {
    const nextGenerateMode = resolveSimpleGenerateMode(mode);
    if (nextGenerateMode === "txt2img" && !sanitizeNovelAiTagInput(simplePrompt)) {
      showErrorToast("Prompt 为空，请先补全 tags。");
      return;
    }
    await runGenerate({ mode: nextGenerateMode, prompt: simplePrompt, negativePrompt: simpleNegativePrompt });
  }, [mode, runGenerate, showErrorToast, simpleNegativePrompt, simplePrompt]);

  const handleClearSimpleDraft = useCallback(() => {
    clearSourceImageForUi("simple");
    setSimpleText("");
    setSimpleConverted(null);
    setSimpleConvertedFromText("");
    setSimplePrompt("");
    setSimpleNegativePrompt("");
    setSimpleEditorMode("text");
    setSimplePromptTab("prompt");
    setSimpleWidth(DEFAULT_SIMPLE_IMAGE_SETTINGS.width);
    setSimpleHeight(DEFAULT_SIMPLE_IMAGE_SETTINGS.height);
    setSimpleImg2imgStrength(DEFAULT_SIMPLE_IMAGE_SETTINGS.strength);
    setSimpleImg2imgNoise(DEFAULT_SIMPLE_IMAGE_SETTINGS.noise);
    setSimpleInfillStrength(DEFAULT_INPAINT_STRENGTH);
    setSimpleInfillNoise(DEFAULT_INPAINT_NOISE);
    setSimpleSeed(DEFAULT_SIMPLE_IMAGE_SETTINGS.seed);
    setSimpleResolutionSelection(DEFAULT_SIMPLE_IMAGE_SETTINGS.simpleResolutionSelection);
    setSelectedStyleIds([]);
    setCompareStyleId(null);
    setStyleSelectionMode("select");
    setPendingMetadataImport(null);
    setMetadataImportSelection(defaultMetadataImportSelection);
    setIsPageImageDragOver(false);
    showSuccessToast("已将简单模式重置为默认值。");
  }, [
    clearSourceImageForUi,
    defaultMetadataImportSelection,
    setCompareStyleId,
    setIsPageImageDragOver,
    setMetadataImportSelection,
    setPendingMetadataImport,
    setSelectedStyleIds,
    setSimpleConverted,
    setSimpleConvertedFromText,
    setSimpleEditorMode,
    setSimpleHeight,
    setSimpleImg2imgNoise,
    setSimpleImg2imgStrength,
    setSimpleInfillNoise,
    setSimpleInfillStrength,
    setSimpleNegativePrompt,
    setSimplePrompt,
    setSimplePromptTab,
    setSimpleResolutionSelection,
    setSimpleSeed,
    setSimpleText,
    setSimpleWidth,
    setStyleSelectionMode,
    showSuccessToast,
  ]);

  const simpleConvertLabel = simpleConverting
    ? "转换中..."
    : loading || pendingPreviewAction
        ? "处理中..."
        : "转为 tags";

  return {
    handleSimpleConvertToTags,
    handleAcceptSimpleConverted,
    handleRejectSimpleConverted,
    handleReturnToSimpleText,
    handleReturnToSimpleTags,
    handleSimpleGenerateFromTags,
    handleClearSimpleDraft,
    simpleConvertLabel,
  };
}
