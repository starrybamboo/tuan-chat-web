// AI image page: aligned with NovelAI Image desktop layout and interactions; keeps free single-image txt2img and preview-area Inpaint.

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";

import type {
  ActivePreviewAction,
  DirectorToolId,
  GeneratedImageItem,
  InpaintDialogSource,
  MetadataImportSelectionState,
  NovelAiEmotion,
  PendingMetadataImportState,
  PreciseReferenceRow,
  ProFeatureSectionKey,
  UiMode,
  V4CharEditorRow,
  VibeTransferReferenceRow,
} from "@/components/aiImage/types";
import type { NovelAiNl2TagsResult } from "@/utils/novelaiNl2Tags";

import {
  augmentNovelImageViaProxy,
  generateNovelImageViaProxy,
} from "@/components/aiImage/api";
import {
  DEFAULT_DIRECTOR_TOOL_ID,
  DIRECTOR_TOOL_OPTIONS_BY_ID,
  MODEL_DESCRIPTIONS,
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
  createAiImagePreviewPaneProps,
  createAiImageWorkspaceProps,
  useAiImageDialogViewModels,
  useAiImageSidebarProps,
  useAiImageWorkspaceProps,
} from "@/components/aiImage/controller/useAiImagePageViewModels";
import { useAiImagePreviewActions } from "@/components/aiImage/controller/useAiImagePreviewActions";
import { useAiImagePreviewState } from "@/components/aiImage/controller/useAiImagePreviewState";
import { useAiImageSimpleActions } from "@/components/aiImage/controller/useAiImageSimpleActions";
import { useAiImageStyleState } from "@/components/aiImage/controller/useAiImageStyleState";
import {
  createProFeatureSectionState,
  formatDirectorEmotionLabel,
  getNovelAiFreeGenerationViolation,
  hasMetadataSettingsPayload,
  hasNonEmptyText,
  normalizeV4CharGridRows,
  readImagePixels,
  readImageSize,
  readLocalStorageString,
  resolveFixedImageModel,
  resolveSimpleGenerateMode,
  sanitizeNovelAiTagInput,
  writeLocalStorageString,
} from "@/components/aiImage/helpers";
import {
  addAiImageHistoryBatch,
} from "@/utils/aiImageHistoryDb";
import {
  extractNovelAiMetadataFromPngBytes,
  extractNovelAiMetadataFromStealthPixels,
} from "@/utils/novelaiImageMetadata";
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

const DEFAULT_INPAINT_PROMPT = "very aesthetic, masterpiece, no text";
const DEFAULT_INPAINT_NEGATIVE_PROMPT = "nsfw, lowres, artistic error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, dithering, halftone, screentone, multiple views, logo, too many watermarks, negative space, blank page";

export function useAiImagePageController() {
  const sourceFileInputRef = useRef<HTMLInputElement | null>(null);
  const vibeReferenceInputRef = useRef<HTMLInputElement | null>(null);
  const preciseReferenceInputRef = useRef<HTMLInputElement | null>(null);

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
  const [vibeTransferReferences, setVibeTransferReferences] = useState<VibeTransferReferenceRow[]>([]);
  const [preciseReference, setPreciseReference] = useState<PreciseReferenceRow | null>(null);
  // Follow the NovelAI pro-mode interaction model: fold advanced reference capabilities into expandable sections to reduce long-form noise and auto-open the related section when importing content.
  const [proFeatureSections, setProFeatureSections] = useState<Record<ProFeatureSectionKey, boolean>>(() => createProFeatureSectionState());

  // This page intentionally uses a single fixed model so simple mode does not expose an extra choice that users cannot meaningfully evaluate from the result.
  const model = resolveFixedImageModel();
  const isNAI3 = false;
  const isNAI4 = true;

  useEffect(() => {
    if (!v4UseCoords)
      return;
    queueMicrotask(() => setV4Chars((prev) => {
      const next = normalizeV4CharGridRows(prev);
      return next === prev ? prev : next;
    }));
  }, [v4Chars, v4UseCoords]);

  const toggleProFeatureSection = useCallback((section: ProFeatureSectionKey) => {
    setProFeatureSections(prev => ({ ...prev, [section]: !prev[section] }));
  }, []);

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
  const [directorEmotion, setDirectorEmotion] = useState<NovelAiEmotion>("neutral");
  const [directorEmotionDefry, setDirectorEmotionDefry] = useState<number>(0);
  const [directorEmotionExtraPrompt, setDirectorEmotionExtraPrompt] = useState("");
  const [inpaintDialogSource, setInpaintDialogSource] = useState<InpaintDialogSource | null>(null);
  const [normalizeReferenceStrengths, setNormalizeReferenceStrengths] = useState<boolean>(false);

  const showSuccessToast = useCallback((message: string) => {
    toast.success(message);
  }, []);

  const showErrorToast = useCallback((message: string) => {
    toast.error(message);
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
    activeStyleIds,
    activeStylePresets,
    activeStyleTags,
    activeStyleNegativeTags,
    handleToggleStyle,
    handleSelectCompareStyle,
    handleClearStyles,
    handleClearActiveStyles,
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
    clearInfillMaskForUi,
    width,
    height,
    widthInput,
    heightInput,
    roundedRequestedSize,
    hasCompleteDimensionInputs,
    imageCount,
    steps,
    scale,
    sampler,
    noiseSchedule,
    cfgRescale,
    ucPreset,
    qualityToggle,
    dynamicThresholding,
    smea,
    smeaDyn,
    currentImg2imgStrength,
    currentImg2imgNoise,
    currentInfillStrength,
    currentInfillNoise,
    strength,
    noise,
    seed,
    seedIsRandom,
    imageCountLimit,
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
    setProImageCount,
    setProSteps,
    setProScale,
    setProSampler,
    setProNoiseSchedule,
    setProCfgRescale,
    setProUcPreset,
    setProSmea,
    setProSmeaDyn,
    setProQualityToggle,
    setProDynamicThresholding,
    setProSeed,
    setSimpleImg2imgStrength,
    setSimpleImg2imgNoise,
    setSimpleInfillStrength,
    setSimpleInfillNoise,
    setProInfillStrength,
    inferResolutionSelection,
    applyModeStrengthAndNoise,
    clearSourceImageForUi,
    applySourceImageForUi,
    resolveInfillMaskBase64ForUi,
    resolveSeparatedInfillMaskBase64ForUi,
    resolveBlendInfillMaskDataUrlForUi,
    restoreSourceImageForUi,
    activeResolutionPreset,
    simpleResolutionArea,
    handleSelectSimpleResolutionPreset,
    handleSelectProResolutionPreset,
    handleSimpleWidthChange,
    handleProWidthChange,
    handleSimpleHeightChange,
    handleProHeightChange,
    handleSwapImageDimensions,
    handleCommitSimpleDimensions,
    handleCommitProDimensions,
    handleCropToClosestValidSize,
    handleResetCurrentImageSettings,
    handleClearSeed,
    setWidth,
    setHeight,
    setImageCount,
    setSteps,
    setScale,
    setSampler,
    setNoiseSchedule,
    setCfgRescale,
    setUcPreset,
    setQualityToggle,
    setDynamicThresholding,
    setSmea,
    setSmeaDyn,
    setStrength,
    setNoise,
    setSeed,
  } = useAiImageDimensionsState({
    uiMode,
    showSuccessToast,
    readImagePixels,
    readImageSize,
  });

  useEffect(() => {
    setInfillAppendPrompt("");
  }, [sourceImageDataUrl]);

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
    hasCurrentDisplayedImage,
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
  });

  const {
    handlePickSourceImage,
    handlePickDirectorSourceImages,
    handleHistoryImageDragStart,
    handlePageImageDragEnter,
    handlePageImageDragLeave,
    handlePageImageDragOver,
    handlePageImageDrop,
    handleClearSourceImage,
    handleOpenSourceImagePicker,
    handleCloseMetadataImportDialog,
    handleImportSourceImageTarget,
    handleConfirmMetadataImport,
    handlePickVibeReferences,
    handlePickPreciseReference,
    handleClearHistory,
    applySelectedPreviewAsBaseImage,
    handleUseSelectedResultAsBaseImage,
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
    sourceFileInputRef,
    setError,
    setIsPageImageDragOver,
    setPendingMetadataImport,
    setMetadataImportSelection,
    setProFeatureSectionOpen,
    setDirectorSourceItems,
    setDirectorSourcePreview,
    setDirectorOutputPreview,
    setIsDirectorImageDragOver,
    setSelectedHistoryPreviewKey,
    showErrorToast,
    showSuccessToast,
    applySourceImageForUi,
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
    handleRunUpscale,
    handleRunDirectorTool,
    runGenerate,
  } = useAiImageGenerationActions({
    uiMode,
    mode,
    model,
    isNAI4,
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
    dynamicThresholding,
    smea,
    smeaDyn,
    currentImg2imgStrength,
    currentImg2imgNoise,
    currentInfillStrength,
    currentInfillNoise,
    sourceImageBase64,
    sourceImageDataUrl,
    sourceImageSize,
    v4Chars,
    v4UseCoords,
    v4UseOrder,
    normalizeReferenceStrengths,
    vibeTransferReferences,
    preciseReference,
    activeStyleTags,
    activeStyleNegativeTags,
    directorInputPreview,
    directorTool,
    activeDirectorTool,
    directorColorizePrompt,
    directorEmotionExtraPrompt,
    directorColorizeDefry,
    directorEmotionDefry,
    directorEmotion,
    historyRowByResultMatchKey,
    readImageSize,
    resolveInfillMaskBase64ForUi,
    resolveSeparatedInfillMaskBase64ForUi,
    resolveBlendInfillMaskDataUrlForUi,
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
    handleAcceptSimpleConverted,
    handleRejectSimpleConverted,
    handleReturnToSimpleText,
    handleReturnToSimpleTags,
    handleSimpleGenerateFromTags,
    handleClearSimpleDraft,
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
    defaultMetadataImportSelection: DEFAULT_METADATA_IMPORT_SELECTION,
  });
  const {
    handleOpenInpaint,
    handleOpenBaseImageInpaint,
    handleCloseInpaintDialog,
    handleSaveInpaintMask,
    handleReturnFromInfillSettings,
    handleClearInfillMask,
  } = useAiImageInpaintActions({
    uiMode,
    loading,
    mode,
    model,
    width,
    height,
    seed,
    sourceImageDataUrl,
    infillMaskDataUrl,
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
    applySelectedPreviewAsBaseImage,
    setError,
    setInpaintDialogSource,
    setSimpleInfillPrompt,
    setSimpleInfillNegativePrompt,
    setSimpleEditorMode,
    setSimplePromptTab,
    setSimpleInfillStrength,
    setSimpleInfillMaskDataUrl,
    setProInfillPrompt,
    setProInfillNegativePrompt,
    setProInfillStrength,
    setProInfillMaskDataUrl,
    clearInfillMaskForUi,
    setModeForUi,
    showErrorToast,
  });

  const {
    handleSelectCurrentResult,
    handleClearCurrentDisplayedImage,
    handleRunDirectorInputUpscale,
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
    handleUpdateVibeReference,
    handleRemoveVibeReference,
  } = useAiImageCharacterActions({
    v4UseCoords,
    setV4Chars,
    setCharPromptTabs,
    setProFeatureSectionOpen,
    setV4UseCoords,
    setVibeTransferReferences,
  });

  const isBusy = loading || simpleConverting || Boolean(pendingPreviewAction);
  const freeGenerationViolation = getNovelAiFreeGenerationViolation({
    mode,
    width: roundedRequestedSize.width,
    height: roundedRequestedSize.height,
    imageCount,
    steps,
    sourceImageBase64,
    sourceImageWidth: sourceImageSize?.width,
    sourceImageHeight: sourceImageSize?.height,
    maskBase64: mode === "infill" ? resolveInfillMaskBase64ForUi(uiMode) : undefined,
    vibeTransferReferenceCount: vibeTransferReferences.length,
    hasPreciseReference: Boolean(preciseReference),
  });
  const canGenerate = !isBusy && !freeGenerationViolation && hasCompleteDimensionInputs;
  const canTriggerProGenerate = canGenerate;
  const proGenerateLabel = loading || simpleConverting
    ? "Working..."
    : pendingPreviewAction
      ? `${PREVIEW_ACTION_LABELS[pendingPreviewAction]}...`
      : "Generate 1 image";
  const ucPresetEnabled = ucPreset !== 2;
  const fixedModelDescription = MODEL_DESCRIPTIONS[model] || "Image generation model";
  const hasReferenceConflict = vibeTransferReferences.length > 0 && Boolean(preciseReference);
  const canAddVibeReference = false;
  const baseImageDescription = "Base Img / img2img is disabled. Use Inpaint from the preview tools.";
  const characterPromptDescription = v4Chars.length
    ? "Click to edit a character."
    : "Customize separate characters.";
  const vibeTransferDescription = "Change the image, keep the vision.";
  const preciseReferenceDescription = "Add a reference image for a character or style.";
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

  const sidebarProps = useAiImageSidebarProps({
    activeResolutionPreset,
    baseImageDescription,
    canAddVibeReference,
    canConvertSimpleText,
    canGenerate,
    canGenerateFromSimpleTags,
    canTriggerProGenerate,
    cfgRescale,
    charPromptTabs,
    characterPromptDescription,
    fixedModelDescription,
    freeGenerationViolation,
    hasSimpleTagsDraft,
    isBusy,
    handleAddV4Char,
    handleClearSeed,
    handleClearCurrentDisplayedImage,
    handleOpenSourceImagePicker,
    handleClearSourceImage,
    handleClearInfillMask,
    handleClearSimpleDraft,
    handleClearStyles: handleClearActiveStyles,
    handleCropToClosestValidSize,
    handleMoveV4Char,
    handleRemoveV4Char,
    handleRemoveVibeReference,
    handleAcceptSimpleConverted,
    handleRejectSimpleConverted,
    handleCommitProDimensions,
    handleCommitSimpleDimensions,
    handleResetCurrentImageSettings,
    handleReturnToSimpleTags,
    handleReturnToSimpleText,
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
    handleUpdateVibeReference,
    handleOpenBaseImageInpaint,
    handleReturnFromInfillSettings,
    infillAppendPrompt,
    handleSetV4UseCoords,
    hasReferenceConflict,
    height,
    heightInput,
    imageCount,
    imageCountLimit,
    infillMaskDataUrl,
    isDirectorToolsOpen,
    isNAI3,
    isNAI4,
    isPageImageDragOver,
    mode,
    model,
    negativePrompt,
    noise,
    noiseSchedule,
    noiseScheduleOptions,
    normalizeReferenceStrengths,
    preciseReference,
    preciseReferenceDescription,
    preciseReferenceInputRef,
    proFeatureSections,
    proGenerateLabel,
    proPromptTab,
    proResolutionSelection,
    prompt,
    qualityToggle,
    runGenerate,
    sampler,
    samplerOptions,
    scale,
    seed,
    seedIsRandom,
    selectedStyleIds: activeStyleIds,
    selectedStyleNegativeTags: activeStyleNegativeTags,
    selectedStylePresets: activeStylePresets,
    selectedStyleTags: activeStyleTags,
    setCfgRescale,
    setCharPromptTabs,
    setDynamicThresholding,
    setHeight,
    setInfillAppendPrompt,
    setImageCount,
    setIsStylePickerOpen,
    setNegativePrompt,
    setNoise,
    setNoiseSchedule,
    setNormalizeReferenceStrengths,
    setPreciseReference,
    setProFeatureSectionOpen,
    setProPromptTab,
    setPrompt,
    setQualityToggle,
    setSampler,
    setScale,
    setSeed,
    setSimpleEditorMode,
    setSimpleConverted,
    setSimpleConvertedFromText,
    setSimpleNegativePrompt,
    setSimplePromptTab,
    setSimplePrompt,
    setSimpleText,
    setSmea,
    setSmeaDyn,
    setSteps,
    setStrength,
    setUcPreset,
    setUiMode,
    setV4Chars,
    setV4UseOrder,
    setWidth,
    simpleConvertLabel,
    simpleConverting,
    simpleEditorMode,
    simpleConverted,
    simpleNegativePrompt,
    simplePromptTab,
    simplePrompt,
    simpleResolutionArea,
    simpleResolutionSelection,
    simpleText,
    smea,
    smeaDyn,
    sourceImageDataUrl,
    hasCurrentDisplayedImage,
    steps,
    strength,
    toggleProFeatureSection,
    ucPreset,
    ucPresetEnabled,
    uiMode,
    v4Chars,
    v4UseCoords,
    v4UseOrder,
    vibeReferenceInputRef,
    vibeTransferDescription,
    vibeTransferReferences,
    width,
    widthInput,
  });

  const workspaceProps = useAiImageWorkspaceProps(createAiImageWorkspaceProps({
    isDirectorToolsOpen,
    previewPaneProps: createAiImagePreviewPaneProps({
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
      directorEmotion,
      directorEmotionExtraPrompt,
      directorEmotionDefry,
      onToggleDirectorTools: handleToggleDirectorTools,
      onRunUpscale: handleRunUpscale,
      onRunDirectorInputUpscale: handleRunDirectorInputUpscale,
      onUseSelectedResultAsBaseImage: handleUseSelectedResultAsBaseImage,
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
      onDirectorEmotionChange: setDirectorEmotion,
      onDirectorEmotionExtraPromptChange: setDirectorEmotionExtraPrompt,
      onDirectorEmotionDefryChange: setDirectorEmotionDefry,
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
      formatDirectorEmotionLabel,
    }),
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
  }));

  const {
    metadataImportDialogProps,
    previewImageDialogProps,
    inpaintDialogProps,
    stylePickerDialogProps,
  } = useAiImageDialogViewModels({
    metadataImportDialogProps: {
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
      onImportSourceImageTarget: handleImportSourceImageTarget,
      onConfirmMetadataImport: handleConfirmMetadataImport,
    },
    previewImageDialogProps: {
      isOpen: isPreviewImageModalOpen,
      selectedPreviewResult,
      onClose: () => setIsPreviewImageModalOpen(false),
    },
    inpaintDialogProps: {
      isOpen: Boolean(inpaintDialogSource),
      source: inpaintDialogSource,
      isSubmitting: loading,
      error,
      onClose: handleCloseInpaintDialog,
      onSubmit: handleSaveInpaintMask,
    },
    stylePickerDialogProps: {
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
    },
  });

  return {
    isPageImageDragOver,
    sourceFileInputRef,
    vibeReferenceInputRef,
    preciseReferenceInputRef,
    handlePageImageDragEnter,
    handlePageImageDragLeave,
    handlePageImageDragOver,
    handlePageImageDrop,
    handlePickSourceImage,
    handlePickVibeReferences,
    handlePickPreciseReference,
    sidebarProps,
    workspaceProps,
    metadataImportDialogProps,
    previewImageDialogProps,
    inpaintDialogProps,
    stylePickerDialogProps,
  };
}

export type AiImagePageController = ReturnType<typeof useAiImagePageController>;
