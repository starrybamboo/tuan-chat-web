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
  setSimpleConverted: (value: any) => void;
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
  setSimpleResolutionSelection: (value: string) => void;
  setSelectedStyleIds: (value: string[]) => void;
  setCompareStyleId: (value: string | null) => void;
  setStyleSelectionMode: (value: "select" | "compare") => void;
  setPendingMetadataImport: (value: any) => void;
  setMetadataImportSelection: (value: any) => void;
  setIsPageImageDragOver: (value: boolean) => void;
  showErrorToast: (message: string) => void;
  showSuccessToast: (message: string) => void;
  convertNaturalLanguageToNovelAiTags: (args: { input: string }) => Promise<any>;
  defaultMetadataImportSelection: any;
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
      showErrorToast("Please enter a natural-language prompt first.");
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
      showErrorToast("Converted result is empty. Please try again.");
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
      showErrorToast("There are no tags to return to.");
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
      showErrorToast("Prompt is empty. Please complete the tags first.");
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
    showSuccessToast("Reset simple mode to defaults.");
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
    ? "Converting..."
    : loading || pendingPreviewAction
        ? "Processing..."
        : "Convert to tags";

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
