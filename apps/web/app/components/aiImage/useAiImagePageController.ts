import { useCallback, useEffect, useState } from "react";

import type {
  ActivePreviewAction,
  DirectorToolId,
  GeneratedImageItem,
  ImportedSourceImagePayload,
  InpaintDialogSource,
  MetadataImportSelectionState,
  PendingMetadataImportState,
  ProFeatureSectionKey,
  UiMode,
  V4CharEditorRow,
} from "@/components/aiImage/types";
import type { NovelAiNl2TagsResult } from "@/utils/novelaiNl2Tags";

import {
  augmentNovelImageViaProxy,
  generateNovelImageViaProxy,
} from "@/components/aiImage/api";
import {
  DEFAULT_DIRECTOR_TOOL_ID,
  DEFAULT_IMAGE_MODEL,
  DEFAULT_INPAINT_NEGATIVE_PROMPT,
  DEFAULT_INPAINT_PROMPT,
  DIRECTOR_TOOL_OPTIONS_BY_ID,
  NOVELAI_FREE_FIXED_IMAGE_COUNT,
  PREVIEW_ACTION_LABELS,
  STORAGE_UI_MODE_KEY,
} from "@/components/aiImage/constants";
import { useAiImageCharacterActions } from "@/components/aiImage/controller/useAiImageCharacterActions";
import { useAiImageDimensionsState } from "@/components/aiImage/controller/useAiImageDimensionsState";
import { useAiImageGenerationActions } from "@/components/aiImage/controller/useAiImageGenerationActions";
import { useAiImageHistoryActions } from "@/components/aiImage/controller/useAiImageHistoryActions";
import { useAiImageImportActions } from "@/components/aiImage/controller/useAiImageImportActions";
import { useAiImageInpaintActions } from "@/components/aiImage/controller/useAiImageInpaintActions";
import {
  createAiImageHistoryPaneProps,
} from "@/components/aiImage/controller/useAiImagePageViewModels";
import { useAiImagePreviewActions } from "@/components/aiImage/controller/useAiImagePreviewActions";
import { useAiImagePreviewState } from "@/components/aiImage/controller/useAiImagePreviewState";
import { useAiImageSimpleActions } from "@/components/aiImage/controller/useAiImageSimpleActions";
import { useAiImageStyleState } from "@/components/aiImage/controller/useAiImageStyleState";
import {
  createProFeatureSectionState,
  getNovelAiFreeGenerationViolation,
  hasMetadataSettingsPayload,
  hasNonEmptyText,
  normalizeV4CharGridRows,
  readImagePixels,
  readImageSize,
  readLocalStorageString,
  resolveSimpleGenerateMode,
  sanitizeNovelAiTagInput,
  writeLocalStorageString,
} from "@/components/aiImage/helpers";
import { appToast } from "@/components/common/appToast/appToast";
import {
  addAiImageHistoryBatch,
} from "@/utils/aiImageHistoryDb";
import {
  extractNovelAiMetadataFromPngBytes,
  extractNovelAiMetadataFromStealthPixels,
} from "@/utils/media/novelaiImageMetadata";
import { convertNaturalLanguageToNovelAiTags } from "@/utils/novelaiNl2Tags";

const DEFAULT_METADATA_IMPORT_SELECTION: MetadataImportSelectionState = {
  prompt: true,
  undesiredContent: true,
  characters: true,
  appendCharacters: false,
  settings: true,
  seed: true,
  cleanImports: false,
};

export function useAiImagePageController() {
  const [uiMode, setUiMode] = useState<UiMode>(() => {
    const stored = readLocalStorageString(STORAGE_UI_MODE_KEY, "simple").trim();
    return stored === "pro" ? "pro" : "simple";
  });
  useEffect(() => {
    writeLocalStorageString(STORAGE_UI_MODE_KEY, uiMode);
  }, [uiMode]);

  const [simpleInfillPrompt, setSimpleInfillPrompt] = useState(DEFAULT_INPAINT_PROMPT);
  const [simpleInfillNegativePrompt, setSimpleInfillNegativePrompt] = useState(DEFAULT_INPAINT_NEGATIVE_PROMPT);
  const [proInfillPrompt, setProInfillPrompt] = useState(DEFAULT_INPAINT_PROMPT);
  const [proInfillNegativePrompt, setProInfillNegativePrompt] = useState(DEFAULT_INPAINT_NEGATIVE_PROMPT);
  const [infillAppendPrompt, setInfillAppendPrompt] = useState("");

  const [simpleText, setSimpleText] = useState("");
  const [, setSimpleConvertedFromText] = useState("");
  const [simpleConverted, setSimpleConverted] = useState<NovelAiNl2TagsResult | null>(null);
  const [simplePrompt, setSimplePrompt] = useState("");
  const [simpleNegativePrompt, setSimpleNegativePrompt] = useState("");
  const [simpleEditorMode, setSimpleEditorMode] = useState<"text" | "tags">("text");
  const [simplePromptTab, setSimplePromptTab] = useState<"prompt" | "negative">("prompt");
  const [simpleConverting, setSimpleConverting] = useState<boolean>(false);
  const [isPageImageDragOver, setIsPageImageDragOver] = useState<boolean>(false);
  const [proPromptTab, setProPromptTab] = useState<"prompt" | "negative">("prompt");
  const [charPromptTabs, setCharPromptTabs] = useState<Record<string, "prompt" | "negative">>({});

  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");

  const [v4UseCoords, setV4UseCoords] = useState<boolean>(false);
  const [v4UseOrder, setV4UseOrder] = useState<boolean>(true);
  const [v4Chars, setV4Chars] = useState<V4CharEditorRow[]>([]);
  const [proFeatureSections, setProFeatureSections] = useState<Record<ProFeatureSectionKey, boolean>>(() => createProFeatureSectionState());

  // This page intentionally uses a single fixed model so simple mode does not expose an extra choice that users cannot meaningfully evaluate from the result.
  const model = DEFAULT_IMAGE_MODEL;

  useEffect(() => {
    if (!v4UseCoords)
      return;
    queueMicrotask(() => setV4Chars((prev) => {
      const next = normalizeV4CharGridRows(prev);
      return next === prev ? prev : next;
    }));
  }, [v4Chars, v4UseCoords]);

  const setProFeatureSectionOpen = useCallback((section: ProFeatureSectionKey, open: boolean) => {
    setProFeatureSections((prev) => {
      if (prev[section] === open)
        return prev;
      return { ...prev, [section]: open };
    });
  }, []);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState("");
  const [pendingMetadataImport, setPendingMetadataImport] = useState<PendingMetadataImportState | null>(null);
  const [metadataImportSelection, setMetadataImportSelection] = useState<MetadataImportSelectionState>(DEFAULT_METADATA_IMPORT_SELECTION);
  const [isDirectorToolsOpen, setIsDirectorToolsOpen] = useState<boolean>(false);
  const [isDirectorImageDragOver, setIsDirectorImageDragOver] = useState<boolean>(false);
  const [activeDirectorTool, setActiveDirectorTool] = useState<DirectorToolId>(DEFAULT_DIRECTOR_TOOL_ID);
  const [pendingPreviewAction, setPendingPreviewAction] = useState<ActivePreviewAction>("");
  const [directorSourceItems, setDirectorSourceItems] = useState<GeneratedImageItem[]>([]);
  const [directorSourcePreview, setDirectorSourcePreview] = useState<GeneratedImageItem | null>(null);
  const [directorOutputPreview, setDirectorOutputPreview] = useState<GeneratedImageItem | null>(null);
  const [directorColorizePrompt, setDirectorColorizePrompt] = useState("");
  const [directorColorizeDefry, setDirectorColorizeDefry] = useState<number>(0);
  const [inpaintDialogSource, setInpaintDialogSource] = useState<InpaintDialogSource | null>(null);

  const showSuccessToast = useCallback((message: string) => {
    appToast.success(message);
  }, []);

  const showErrorToast = useCallback((message: string) => {
    appToast.error(message);
  }, []);

  const {
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
    activeStyleTags,
    activeStyleNegativeTags,
    activeStylePresets,
    handleToggleStyle,
    handleSelectCompareStyle,
    handleClearStyles,
  } = useAiImageStyleState();
  const {
    samplerOptions,
    noiseScheduleOptions,
    simpleMode,
    mode,
    setModeForUi,
    sourceImageDataUrl,
    sourceImageBase64,
    sourceImageSize,
    setSimpleInfillMaskDataUrl,
    setProInfillMaskDataUrl,
    infillMaskDataUrl,
    infillFocusedArea,
    overlayOriginalImage,
    setSimpleInfillFocusedArea,
    setSimpleOverlayOriginalImage,
    setProInfillFocusedArea,
    setProOverlayOriginalImage,
    clearInfillMaskForUi,
    width,
    height,
    widthInput,
    heightInput,
    roundedRequestedSize,
    hasCompleteDimensionInputs,
    steps,
    scale,
    sampler,
    noiseSchedule,
    cfgRescale,
    ucPreset,
    qualityToggle,
    cfgDelay,
    dynamicThresholding,
    currentInfillStrength,
    currentInfillNoise,
    strength,
    seed,
    seedIsRandom,
    simpleWidth,
    setSimpleWidth,
    simpleHeight,
    setSimpleHeight,
    setSimpleSeed,
    simpleResolutionSelection,
    setSimpleResolutionSelection,
    proWidth,
    setProWidth,
    proHeight,
    setProHeight,
    proResolutionSelection,
    setProResolutionSelection,
    setProSteps,
    setProScale,
    setProSampler,
    setProNoiseSchedule,
    setProCfgRescale,
    setProUcPreset,
    setProQualityToggle,
    setProCfgDelay,
    setProDynamicThresholding,
    setProSeed,
    setSimpleInfillStrength,
    setSimpleInfillNoise,
    setProInfillStrength,
    inferResolutionSelection,
    applyInfillStrengthAndNoise,
    clearSourceImageForUi,
    syncInpaintSourceForUi,
    resolveInfillMaskBase64ForUi,
    handleSelectSimpleResolutionPreset,
    handleSelectProResolutionPreset,
    handleSimpleWidthChange,
    handleProWidthChange,
    handleSimpleHeightChange,
    handleProHeightChange,
    handleSwapImageDimensions,
    handleCommitSimpleDimensions,
    handleCommitProDimensions,
    handleResetCurrentImageSettings,
    setSteps,
    setScale,
    setSampler,
    setNoiseSchedule,
    setCfgRescale,
    setDynamicThresholding,
    setStrength,
    setSeed,
  } = useAiImageDimensionsState({
    uiMode,
    showSuccessToast,
    onSourceImageChange: () => setInfillAppendPrompt(""),
  });

  const {
    results,
    setResults,
    selectedResultIndex,
    setSelectedResultIndex,
    selectedHistoryPreviewKey,
    setSelectedHistoryPreviewKey,
    pinnedPreviewKey,
    setPinnedPreviewKey,
    isPreviewImageModalOpen,
    setIsPreviewImageModalOpen,
    history,
    setHistory,
    isHistoryExpanded,
    setIsHistoryExpanded,
    historyRowByKey,
    historyRowByResultMatchKey,
    selectedPreviewResult,
    selectedPreviewHistoryRow,
    selectedPreviewIdentityKey,
    pinnedPreviewResult,
    currentResultCards,
    archivedHistoryRows,
    isSelectedPreviewPinned,
    previewMeta,
  } = useAiImagePreviewState();
  const directorTool = DIRECTOR_TOOL_OPTIONS_BY_ID[activeDirectorTool];
  const directorInputPreview = directorSourcePreview;

  useEffect(() => {
    if (!selectedPreviewResult && isPreviewImageModalOpen)
      setIsPreviewImageModalOpen(false);
  }, [isPreviewImageModalOpen, selectedPreviewResult, setIsPreviewImageModalOpen]);

  useEffect(() => {
    if (pinnedPreviewKey && !pinnedPreviewResult)
      setPinnedPreviewKey(null);
  }, [pinnedPreviewKey, pinnedPreviewResult, setPinnedPreviewKey]);

  const {
    refreshHistory,
    applyImportedMetadata,
    handleHistoryRowClick,
    handleCurrentResultCardClick,
    handleDeleteHistoryRow,
  } = useAiImageHistoryActions({
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
    setProFeatureSectionOpen,
    setPrompt,
    setNegativePrompt,
    setProSeed,
    setProWidth,
    setProHeight,
    setProResolutionSelection,
    setProSteps,
    setProScale,
    setProSampler,
    setProNoiseSchedule,
    setProCfgRescale,
    setProUcPreset,
    setProQualityToggle,
    setProCfgDelay,
    setProDynamicThresholding,
    applyInfillStrengthAndNoise,
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
    showSuccessToast,
  });

  const openImportedImageInpaint = useCallback((sourceImage: ImportedSourceImagePayload) => {
    setInpaintDialogSource({
      dataUrl: sourceImage.dataUrl,
      imageBase64: sourceImage.imageBase64,
      width: sourceImage.width ?? width,
      height: sourceImage.height ?? height,
      seed,
      model,
      mode: uiMode,
      prompt: uiMode === "simple" ? simplePrompt : prompt,
      negativePrompt: uiMode === "simple" ? simpleNegativePrompt : negativePrompt,
      strength: currentInfillStrength,
      focusedArea: null,
      overlayOriginalImage: true,
    });
  }, [currentInfillStrength, height, model, negativePrompt, prompt, seed, simpleNegativePrompt, simplePrompt, uiMode, width]);

  const {
    handlePickDirectorSourceImages,
    handleHistoryImageDragStart,
    handlePageImageDragEnter,
    handlePageImageDragLeave,
    handlePageImageDragOver,
    handlePageImageDrop,
    handleClearSourceImage,
    handleCloseMetadataImportDialog,
    handleOpenImportedImageInpaint,
    handleConfirmMetadataImport,
    handleClearHistory,
    syncSelectedPreviewToInpaintSource,
    handleSelectDirectorSourceItem,
    handleRemoveDirectorSourceItem,
    handleDirectorImageDragEnter,
    handleDirectorImageDragLeave,
    handleDirectorImageDragOver,
    handleDirectorImageDrop,
  } = useAiImageImportActions({
    uiMode,
    model,
    isDirectorToolsOpen,
    isDirectorImageDragOver,
    isPageImageDragOver,
    pendingMetadataImport,
    metadataImportSelection,
    selectedPreviewResult,
    setError,
    setIsPageImageDragOver,
    setPendingMetadataImport,
    setMetadataImportSelection,
    openImportedImageInpaint,
    setDirectorSourceItems,
    setDirectorSourcePreview,
    setDirectorOutputPreview,
    setIsDirectorImageDragOver,
    setSelectedHistoryPreviewKey,
    showErrorToast,
    syncInpaintSourceForUi,
    clearSourceImageForUi,
    refreshHistory,
    applyImportedMetadata,
    readImageSize,
    readImagePixels,
    extractNovelAiMetadataFromPngBytes,
    extractNovelAiMetadataFromStealthPixels,
    defaultMetadataImportSelection: DEFAULT_METADATA_IMPORT_SELECTION,
  });

  const {
    handleToggleDirectorTools,
    handleRunDirectorTool,
    runGenerate,
  } = useAiImageGenerationActions({
    uiMode,
    mode,
    model,
    isDirectorToolsOpen,
    selectedPreviewResult,
    prompt,
    negativePrompt,
    simplePrompt,
    simpleNegativePrompt,
    simpleInfillPrompt,
    proInfillPrompt,
    simpleInfillNegativePrompt,
    proInfillNegativePrompt,
    infillAppendPrompt,
    width,
    height,
    seed,
    steps,
    scale,
    sampler,
    noiseSchedule,
    cfgRescale,
    ucPreset,
    qualityToggle,
    cfgDelay,
    dynamicThresholding,
    currentInfillStrength,
    currentInfillNoise,
    infillFocusedArea,
    overlayOriginalImage,
    sourceImageBase64,
    sourceImageDataUrl,
    sourceImageSize,
    infillMaskDataUrl,
    v4Chars,
    v4UseCoords,
    v4UseOrder,
    activeStyleTags,
    activeStyleNegativeTags,
    directorInputPreview,
    directorTool,
    activeDirectorTool,
    directorColorizePrompt,
    directorColorizeDefry,
    historyRowByResultMatchKey,
    readImageSize,
    resolveInfillMaskBase64ForUi,
    setIsDirectorToolsOpen,
    setError,
    setLoading,
    setPendingPreviewAction,
    setDirectorOutputPreview,
    setResults,
    setSelectedResultIndex,
    setSelectedHistoryPreviewKey,
    setSimpleSeed,
    setProSeed,
    setDirectorSourceItems,
    setDirectorSourcePreview,
    refreshHistory,
    showErrorToast,
    showSuccessToast,
    generateNovelImageViaProxy,
    augmentNovelImageViaProxy,
    addAiImageHistoryBatch,
  });

  const {
    handleSimpleConvertToTags,
    handleClearSimpleDraft,
    handleAcceptSimpleConverted,
    handleRejectSimpleConverted,
    handleReturnToSimpleText,
    handleReturnToSimpleTags,
    handleSimpleGenerateFromTags,
    simpleConvertLabel,
  } = useAiImageSimpleActions({
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
    defaultMetadataImportSelection: DEFAULT_METADATA_IMPORT_SELECTION,
  });
  const {
    handleOpenInpaint,
    handleEditInpaintMask,
    handleCloseInpaintDialog,
    handleSaveInpaintMask,
    handleReturnFromInfillSettings,
  } = useAiImageInpaintActions({
    uiMode,
    loading,
    model,
    width,
    height,
    seed,
    sourceImageDataUrl,
    infillMaskDataUrl,
    infillFocusedArea,
    overlayOriginalImage,
    simpleInfillPrompt,
    proInfillPrompt,
    simpleInfillNegativePrompt,
    proInfillNegativePrompt,
    currentInfillStrength,
    selectedPreviewResult,
    selectedPreviewHistoryRow,
    history,
    inpaintDialogSource,
    readImageSize,
    syncSelectedPreviewToInpaintSource,
    syncInpaintSourceForUi,
    setError,
    setInpaintDialogSource,
    setSimpleInfillPrompt,
    setSimpleInfillNegativePrompt,
    setSimpleEditorMode,
    setSimplePromptTab,
    setSimpleInfillStrength,
    setSimpleInfillMaskDataUrl,
    setSimpleInfillFocusedArea,
    setSimpleOverlayOriginalImage,
    setProInfillPrompt,
    setProInfillNegativePrompt,
    setProInfillStrength,
    setProInfillMaskDataUrl,
    setProInfillFocusedArea,
    setProOverlayOriginalImage,
    clearInfillMaskForUi,
    setModeForUi,
    showErrorToast,
  });

  const {
    handleSelectCurrentResult,
    handleAddDirectorDisplayedToSourceRail,
    handleCopyDirectorInputImage,
    handleCopyDirectorOutputImage,
    handleDownloadDirectorOutputImage,
    handleClearPinnedPreview,
    handleSelectPinnedPreview,
    handleApplyPinnedPreviewSeed,
    handleOpenPreviewImage,
    handleTogglePinnedPreview,
    handleApplySelectedPreviewSeed,
    handleCopySelectedPreviewImage,
    handleDownloadCurrent,
    handleDownloadAll,
  } = useAiImagePreviewActions({
    uiMode,
    isDirectorToolsOpen,
    selectedPreviewResult,
    selectedPreviewIdentityKey,
    pinnedPreviewKey,
    pinnedPreviewResult,
    results,
    history,
    historyRowByKey,
    directorInputPreview,
    directorOutputPreview,
    showErrorToast,
    showSuccessToast,
    setSelectedHistoryPreviewKey,
    setSelectedResultIndex,
    setDirectorSourceItems,
    setDirectorSourcePreview,
    setDirectorOutputPreview,
    setIsPreviewImageModalOpen,
    setPinnedPreviewKey,
    setSimpleSeed,
    setProSeed,
  });

  const {
    handleAddV4Char,
    handleRemoveV4Char,
    handleMoveV4Char,
    handleUpdateV4Char,
    handleSetV4UseCoords,
  } = useAiImageCharacterActions({
    v4UseCoords,
    setV4Chars,
    setCharPromptTabs,
    setProFeatureSectionOpen,
    setV4UseCoords,
  });

  const isBusy = loading || simpleConverting || Boolean(pendingPreviewAction);
  const freeGenerationViolation = getNovelAiFreeGenerationViolation({
    mode,
    width: roundedRequestedSize.width,
    height: roundedRequestedSize.height,
    imageCount: NOVELAI_FREE_FIXED_IMAGE_COUNT,
    steps,
    sourceImageBase64,
    sourceImageWidth: sourceImageSize?.width,
    sourceImageHeight: sourceImageSize?.height,
    maskBase64: mode === "infill" ? resolveInfillMaskBase64ForUi(uiMode) : undefined,
  });
  const canGenerate = !isBusy && !freeGenerationViolation && hasCompleteDimensionInputs;
  const canTriggerProGenerate = canGenerate;
  const proGenerateLabel = loading || simpleConverting
    ? "Working..."
    : pendingPreviewAction
      ? `${PREVIEW_ACTION_LABELS[pendingPreviewAction]}...`
      : "Generate 1 image";
  const characterPromptDescription = v4Chars.length
    ? "Click to edit a character."
    : "Customize separate characters.";
  const pendingMetadataSettings = pendingMetadataImport?.metadata?.settings ?? null;
  const canImportMetadataPrompt = pendingMetadataSettings ? hasNonEmptyText(pendingMetadataSettings.prompt) : false;
  const canImportMetadataNegativePrompt = pendingMetadataSettings ? hasNonEmptyText(pendingMetadataSettings.negativePrompt) : false;
  const canImportMetadataCharacters = uiMode === "pro";
  const canImportMetadataSettings = uiMode === "pro" && pendingMetadataSettings ? hasMetadataSettingsPayload(pendingMetadataSettings) : false;
  const canImportMetadataSeed = pendingMetadataSettings?.seed != null;
  const hasAnyMetadataImportSelection = metadataImportSelection.prompt
    || metadataImportSelection.undesiredContent
    || metadataImportSelection.characters
    || metadataImportSelection.settings
    || metadataImportSelection.seed;
  const canConvertSimpleText = !isBusy && Boolean(simpleText.trim());
  const simpleGenerateMode = resolveSimpleGenerateMode(mode);
  const canGenerateFromSimpleTags = canGenerate && (Boolean(sanitizeNovelAiTagInput(simplePrompt)) || simpleGenerateMode === "infill");
  const hasSimpleTagsDraft = Boolean(sanitizeNovelAiTagInput(simplePrompt) || sanitizeNovelAiTagInput(simpleNegativePrompt));

  const sidebarProps = {
    setProPromptTab,
    setQualityToggle: setProQualityToggle,
    setUcPreset: setProUcPreset,
    canConvertSimpleText,
    canGenerateFromSimpleTags,
    canTriggerProGenerate,
    cfgRescale,
    charPromptTabs,
    characterPromptDescription,
    freeGenerationViolation,
    hasSimpleTagsDraft,
    isBusy,
    handleClearSourceImage,
    handleClearSimpleDraft,
    handleCommitProDimensions,
    handleCommitSimpleDimensions,
    handleResetCurrentImageSettings,
    handleSelectProResolutionPreset,
    handleSelectSimpleResolutionPreset,
    handleSimpleConvertToTags,
    handleSimpleGenerateFromTags,
    handleProHeightChange,
    handleProWidthChange,
    handleSimpleHeightChange,
    handleSimpleWidthChange,
    handleSwapImageDimensions,
    handleUpdateV4Char,
    handleAddV4Char,
    handleMoveV4Char,
    handleRemoveV4Char,
    setCharPromptTabs,
    v4UseOrder,
    handleEditInpaintMask,
    handleReturnFromInfillSettings,
    infillAppendPrompt,
    handleSetV4UseCoords,
    heightInput,
    infillMaskDataUrl,
    isDirectorToolsOpen,
    mode,
    negativePrompt,
    noiseSchedule,
    noiseScheduleOptions,
    proFeatureSections,
    proGenerateLabel,
    proPromptTab,
    proResolutionSelection,
    prompt,
    qualityToggle,
    cfgDelay,
    dynamicThresholding,
    runGenerate,
    sampler,
    samplerOptions,
    scale,
    seed,
    seedIsRandom,
    setCfgRescale,
    setCfgDelay: setProCfgDelay,
    setDynamicThresholding,
    setInfillAppendPrompt,
    setNegativePrompt,
    setNoiseSchedule,
    setPrompt,
    setSimpleText,
    setSimpleConverted,
    setSimpleConvertedFromText,
    setSimpleEditorMode,
    setSimplePromptTab,
    handleReturnToSimpleTags,
    handleRejectSimpleConverted,
    handleAcceptSimpleConverted,
    handleReturnToSimpleText,
    simpleText,
    simplePrompt,
    simpleNegativePrompt,
    selectedStylePresets: activeStylePresets,
    setIsStylePickerOpen,
    setSampler,
    setScale,
    setSeed,
    setSimpleNegativePrompt,
    setSimplePrompt,
    setSteps,
    setStrength,
    setUiMode,
    simpleConvertLabel,
    simpleConverting,
    simpleEditorMode,
    simpleConverted,
    simplePromptTab,
    simpleResolutionSelection,
    sourceImageDataUrl,
    steps,
    strength,
    ucPreset,
    uiMode,
    v4Chars,
    v4UseCoords,
    widthInput,
  };

  const workspaceProps = {
    isDirectorToolsOpen,
    previewPaneProps: {
      isDirectorToolsOpen,
      previewMeta,
      results,
      selectedPreviewResult,
      selectedResultIndex,
      selectedHistoryPreviewKey,
      isSelectedPreviewPinned,
      isBusy,
      isGeneratingImage: loading,
      isDirectorImageDragOver,
      pendingPreviewAction,
      activeDirectorTool,
      directorTool,
      directorSourceItems,
      directorInputPreview,
      directorOutputPreview,
      directorColorizePrompt,
      directorColorizeDefry,
      onToggleDirectorTools: handleToggleDirectorTools,
      onPickDirectorSourceImages: handlePickDirectorSourceImages,
      onSelectDirectorSourceItem: handleSelectDirectorSourceItem,
      onRemoveDirectorSourceItem: handleRemoveDirectorSourceItem,
      onAddDirectorDisplayedToSourceRail: handleAddDirectorDisplayedToSourceRail,
      onDirectorImageDragEnter: handleDirectorImageDragEnter,
      onDirectorImageDragLeave: handleDirectorImageDragLeave,
      onDirectorImageDragOver: handleDirectorImageDragOver,
      onDirectorImageDrop: handleDirectorImageDrop,
      onDirectorColorizePromptChange: setDirectorColorizePrompt,
      onDirectorColorizeDefryChange: setDirectorColorizeDefry,
      onActiveDirectorToolChange: setActiveDirectorTool,
      onRunDirectorTool: handleRunDirectorTool,
      onSelectCurrentResult: handleSelectCurrentResult,
      onOpenPreviewImage: handleOpenPreviewImage,
      onTogglePinnedPreview: handleTogglePinnedPreview,
      onOpenInpaint: handleOpenInpaint,
      onCopySelectedPreviewImage: handleCopySelectedPreviewImage,
      onCopyDirectorInputImage: handleCopyDirectorInputImage,
      onCopyDirectorOutputImage: handleCopyDirectorOutputImage,
      onDownloadCurrent: handleDownloadCurrent,
      onDownloadDirectorOutputImage: handleDownloadDirectorOutputImage,
      onApplySelectedPreviewSeed: handleApplySelectedPreviewSeed,
    },
    historyPaneProps: createAiImageHistoryPaneProps({
      history,
      mode,
      currentResultCards,
      archivedHistoryRows,
      selectedHistoryPreviewKey,
      selectedResultIndex,
      directorInputPreview,
      isHistoryExpanded,
      onHistoryExpandedChange: setIsHistoryExpanded,
      onCurrentResultCardClick: handleCurrentResultCardClick,
      onHistoryRowClick: handleHistoryRowClick,
      onHistoryImageDragStart: handleHistoryImageDragStart,
      onDeleteHistoryRow: handleDeleteHistoryRow,
      onDownloadAll: handleDownloadAll,
      onClearHistory: handleClearHistory,
    }),
    pinnedPreviewResult,
    onClearPinnedPreview: handleClearPinnedPreview,
    onJumpToPinnedPreview: handleSelectPinnedPreview,
    onApplyPinnedPreviewSeed: handleApplyPinnedPreviewSeed,
  };

  const metadataImportDialogProps = {
      pendingMetadataImport,
      canImportMetadataPrompt,
      canImportMetadataNegativePrompt,
      canImportMetadataCharacters,
      canImportMetadataSettings,
      canImportMetadataSeed,
      hasAnyMetadataImportSelection,
      metadataImportSelection,
      setMetadataImportSelection,
      onClose: handleCloseMetadataImportDialog,
      onOpenImportedImageInpaint: handleOpenImportedImageInpaint,
      onConfirmMetadataImport: handleConfirmMetadataImport,
  };
  const previewImageDialogProps = {
      isOpen: isPreviewImageModalOpen,
      selectedPreviewResult,
      onClose: () => setIsPreviewImageModalOpen(false),
  };
  const inpaintDialogProps = {
      isOpen: Boolean(inpaintDialogSource),
      source: inpaintDialogSource,
      isSubmitting: loading,
      error,
      onClose: handleCloseInpaintDialog,
      onSubmit: handleSaveInpaintMask,
  };
  const stylePickerDialogProps = {
      isOpen: isStylePickerOpen,
      viewMode: styleSelectionMode,
      selectedStyleIds,
      compareStyleId,
      stylePresets,
      compareStylePresets,
      onToggleStyle: handleToggleStyle,
      onSelectCompareStyle: handleSelectCompareStyle,
      onViewModeChange: setStyleSelectionMode,
      onClearStyles: handleClearStyles,
      onClose: () => setIsStylePickerOpen(false),
  };

  return {
    isPageImageDragOver,
    handlePageImageDragEnter,
    handlePageImageDragLeave,
    handlePageImageDragOver,
    handlePageImageDrop,
    sidebarProps,
    workspaceProps,
    metadataImportDialogProps,
    previewImageDialogProps,
    inpaintDialogProps,
    stylePickerDialogProps,
  };
}

export type AiImagePageController = ReturnType<typeof useAiImagePageController>;
