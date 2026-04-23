// AI 生图页面：对齐 NovelAI Image 的桌面端布局与交互；当前保留免费单张 txt2img，并开放预览区 Inpaint。
import type { DragEvent, MouseEvent } from "react";

import { zipSync } from "fflate";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";

import type {
  ActivePreviewAction,
  DirectorToolId,
  GeneratedImageItem,
  HistoryRowClickMode,
  ImageImportSource,
  ImportedSourceImagePayload,
  InpaintDialogSource,
  InpaintSubmitPayload,
  InternalHistoryImageDragPayload,
  MetadataImportSelectionState,
  NovelAiEmotion,
  PendingMetadataImportState,
  PreciseReferenceRow,
  ProFeatureSectionKey,
  ResolutionSelection,
  UiMode,
  V4CharGender,
  V4CharEditorRow,
  VibeTransferReferenceRow,
} from "@/components/aiImage/types";
import type {
  AiImageHistoryMode,
  AiImageHistoryRow,
} from "@/utils/aiImageHistoryDb";
import type {
  NovelAiImageMetadataResult,
  NovelAiImportedSettings,
} from "@/utils/novelaiImageMetadata";
import type { NovelAiNl2TagsResult } from "@/utils/novelaiNl2Tags";

import {
  augmentNovelImageViaProxy,
  generateNovelImageViaProxy,
} from "@/components/aiImage/api";
import {
  CUSTOM_RESOLUTION_ID,
  DEFAULT_DIRECTOR_TOOL_ID,
  DEFAULT_PRO_FEATURE_SECTION_OPEN,
  DEFAULT_PRO_IMAGE_SETTINGS,
  DEFAULT_SIMPLE_IMAGE_SETTINGS,
  DIRECTOR_TOOL_OPTIONS_BY_ID,
  INTERNAL_HISTORY_IMAGE_DRAG_MIME,
  MODEL_DESCRIPTIONS,
  NOISE_SCHEDULES_NAI4,
  NOVELAI_FREE_FIXED_IMAGE_COUNT,
  NOVELAI_FREE_MAX_IMAGE_AREA,
  NOVELAI_FREE_MAX_STEPS,
  PREVIEW_ACTION_LABELS,
  RESOLUTION_PRESETS,
  SAMPLERS_NAI4,
  STORAGE_UI_MODE_KEY,
  isDirectorToolDisabled,
} from "@/components/aiImage/constants";
import {
  base64DataUrl,
  base64ToBytes,
  buildDirectorToolHistoryRow,
  buildImportedSourceImagePayloadFromDataUrl,
  bytesToBase64,
  clamp01,
  clampIntRange,
  clampRange,
  cleanImportedPromptText,
  createMetadataImportSelection,
  createProFeatureSectionState,
  dataUrlToBase64,
  extensionFromDataUrl,
  extractImageFilesFromTransfer,
  extractInternalHistoryImageDragPayload,
  fileFromDataUrl,
  fitNovelAiImageSizeWithinAreaLimit,
  formatDirectorEmotionLabel,
  generatedItemKey,
  getClosestValidImageSize,
  getNovelAiImageArea,
  getNovelAiFreeGenerationViolation,
  getNovelAiFreeOnlyMessage,
  hasFileDrag,
  hasInternalHistoryImageDrag,
  hasMetadataSettingsPayload,
  hasNonEmptyText,
  historyImageDragFileName,
  historyRowKey,
  historyRowResultMatchKey,
  historyRowToGeneratedItem,
  getNextAvailableV4CharGridCell,
  makeStableId,
  mergeTagString,
  mimeFromDataUrl,
  mimeFromFilename,
  newV4CharEditorRow,
  normalizeV4CharGridRows,
  normalizeReferenceStrengthRows,
  readFileAsBytes,
  readImagePixels,
  readImageSize,
  readLocalStorageString,
  resolveFixedImageModel,
  resolveInpaintModel,
  resolveImportedValue,
  resolveSimpleGenerateMode,
  sanitizeNovelAiTagInput,
  shouldKeepSimpleTagsEditor,
  triggerBlobDownload,
  triggerBrowserDownload,
  writeLocalStorageString,
} from "@/components/aiImage/helpers";
import {
  buildInpaintDialogProps,
  buildMetadataImportDialogProps,
  buildPreviewImageDialogProps,
  buildSidebarProps,
  buildStylePickerDialogProps,
  buildWorkspaceProps,
} from "@/components/aiImage/controller/buildViewModels";
import {
  buildGenerateContext,
  buildHistoryRowsFromGenerateResult,
  buildOpenInpaintState,
  finalizeGenerateResult,
  resolveFocusedGenerateContext,
  validateGenerateContext,
} from "@/components/aiImage/controller/generateActions";
import {
  importSourceFileAction,
  importSourceImageBytesAction,
} from "@/components/aiImage/controller/importActions";
import {
  buildBaseImageInpaintStateAction,
  saveInpaintMaskAction,
} from "@/components/aiImage/controller/inpaintActions";
import {
  historyImageDragStartAction,
  pageImageDragEnterAction,
  pageImageDragLeaveAction,
  pageImageDragOverAction,
  pageImageDropAction,
  pasteSourceImageAction,
  pickSourceHistoryImageAction,
} from "@/components/aiImage/controller/dndActions";
import {
  applyHistorySettingsAction,
  applyImportedMetadataAction,
} from "@/components/aiImage/controller/metadataHistoryActions";
import {
  applyPinnedPreviewSeedAction,
  applySelectedPreviewSeedAction,
  clearPinnedPreviewAction,
  downloadCurrentAction,
  openPreviewImageAction,
  selectPinnedPreviewAction,
  togglePinnedPreviewAction,
} from "@/components/aiImage/controller/previewActions";
import {
  buildDirectorSourceItemAction,
  pickDirectorSourceHistoryImageAction,
  pickDirectorSourceImagesAction,
  runDirectorToolAction,
} from "@/components/aiImage/controller/directorActions";
import { useAiImageDimensionsState } from "@/components/aiImage/controller/useAiImageDimensionsState";
import { useAiImageImportActions } from "@/components/aiImage/controller/useAiImageImportActions";
import { useAiImagePreviewState } from "@/components/aiImage/controller/useAiImagePreviewState";
import { useAiImageStyleState } from "@/components/aiImage/controller/useAiImageStyleState";
import {
  addAiImageHistoryBatch,
  clearAiImageHistory,
  deleteAiImageHistory,
  listAiImageHistory,
} from "@/utils/aiImageHistoryDb";
import {
  extractNovelAiMetadataFromPngBytes,
  extractNovelAiMetadataFromStealthPixels,
} from "@/utils/novelaiImageMetadata";
import { convertNaturalLanguageToNovelAiTags } from "@/utils/novelaiNl2Tags";
import { compositeFocusedInpaintResult, prepareFocusedInpaintPayload } from "@/components/aiImage/inpaintFocusUtils";
import { buildRoundedRectMaskGrid, buildSolidInpaintMaskGrid, erodeMaskGrid, findMaskGridBounds, renderMaskGridToRgba } from "@/components/aiImage/inpaintMaskUtils";

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
const DEFAULT_INPAINT_STRENGTH = 1;
const DEFAULT_INPAINT_NOISE = 0;

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

  const [simpleText, setSimpleText] = useState("");
  const [simpleConvertedFromText, setSimpleConvertedFromText] = useState("");
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
  // 参考 NovelAI 的专业模式交互：把高级引用能力拆成可折叠模块，减少长表单噪音，并在导入新内容时自动展开对应区块。
  const [proFeatureSections, setProFeatureSections] = useState<Record<ProFeatureSectionKey, boolean>>(() => createProFeatureSectionState());

  // 当前页面固定使用单一模型，避免简单模式额外暴露一个用户无法从结果感知收益的选择步骤。
  const model = resolveFixedImageModel();
  const isNAI3 = false;
  const isNAI4 = true;

  useEffect(() => {
    if (!v4UseCoords)
      return;
    setV4Chars((prev) => {
      const next = normalizeV4CharGridRows(prev);
      return next === prev ? prev : next;
    });
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
    proMode,
    mode,
    setModeForUi,
    simpleSourceImageDataUrl,
    simpleSourceImageBase64,
    simpleSourceImageSize,
    proSourceImageDataUrl,
    proSourceImageBase64,
    proSourceImageSize,
    sourceImageDataUrl,
    sourceImageBase64,
    sourceImageSize,
    simpleInfillMaskDataUrl,
    setSimpleInfillMaskDataUrl,
    proInfillMaskDataUrl,
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
    simpleSeed,
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
    setProImg2imgStrength,
    setProImg2imgNoise,
    setSimpleInfillStrength,
    setSimpleInfillNoise,
    setProInfillStrength,
    setProInfillNoise,
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
    selectedResult,
    selectedHistoryPreviewRow,
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
  }, [isPreviewImageModalOpen, selectedPreviewResult]);

  useEffect(() => {
    if (pinnedPreviewKey && !pinnedPreviewResult)
      setPinnedPreviewKey(null);
  }, [pinnedPreviewKey, pinnedPreviewResult]);

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
  }, [simpleConverted, simpleEditorMode, simpleMode, simpleNegativePrompt, simplePrompt]);

  const applyImportedMetadata = useCallback((metadata: NovelAiImageMetadataResult, selection: MetadataImportSelectionState) => {
    applyImportedMetadataAction({
      metadata,
      selection,
      uiMode,
      simpleWidth,
      simpleHeight,
      proWidth,
      proHeight,
      v4Chars,
      samplerOptions,
      noiseScheduleOptions,
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
    });
  }, [
    applyModeStrengthAndNoise,
    clearSourceImageForUi,
    inferResolutionSelection,
    noiseScheduleOptions,
    proHeight,
    proWidth,
    samplerOptions,
    simpleHeight,
    simpleWidth,
    uiMode,
    v4Chars,
    setProFeatureSectionOpen,
  ]);

  const refreshHistory = useCallback(async () => {
    const rows = await listAiImageHistory({ limit: 30 });
    setHistory(rows);
  }, []);

  useEffect(() => {
    void refreshHistory();
  }, [refreshHistory]);

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
    handleSyncDirectorSourceFromCurrentPreview,
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

  const handleToggleDirectorTools = useCallback(() => {
    if (!isDirectorToolsOpen && selectedPreviewResult) {
      const previewKey = generatedItemKey(selectedPreviewResult);
      setDirectorSourceItems((currentItems) => {
        if (currentItems.some(item => generatedItemKey(item) === previewKey))
          return currentItems;
        return [selectedPreviewResult, ...currentItems];
      });
      setDirectorSourcePreview(selectedPreviewResult);
      setDirectorOutputPreview(selectedPreviewResult);
    }
    setIsDirectorToolsOpen(prev => !prev);
  }, [isDirectorToolsOpen, selectedPreviewResult]);

  const handleRunUpscale = useCallback(async () => {
    if (!selectedPreviewResult)
      return;

    showErrorToast(getNovelAiFreeOnlyMessage("Upscale is disabled."));
  }, [selectedPreviewResult, showErrorToast]);

  const handleRunDirectorTool = useCallback(async () => {
    await runDirectorToolAction({
      directorInputPreview,
      directorTool,
      activeDirectorTool,
      isDirectorToolDisabled,
      showErrorToast,
      setError,
      setPendingPreviewAction,
      setDirectorOutputPreview,
      augmentNovelImageViaProxy,
      directorColorizePrompt,
      directorEmotionExtraPrompt,
      directorColorizeDefry,
      directorEmotionDefry,
      directorEmotion,
      readImageSize,
      model,
      historyRowByResultMatchKey,
      setResults,
      setSelectedResultIndex,
      setSelectedHistoryPreviewKey,
      addAiImageHistoryBatch,
      refreshHistory,
      showSuccessToast,
    });
  }, [
    activeDirectorTool,
    directorColorizeDefry,
    directorColorizePrompt,
    directorEmotion,
    directorEmotionDefry,
    directorEmotionExtraPrompt,
    directorInputPreview,
    directorTool,
    historyRowByResultMatchKey,
    model,
    refreshHistory,
    setError,
    setPendingPreviewAction,
    showErrorToast,
    showSuccessToast,
  ]);

  const runGenerate = useCallback(async (args?: {
    prompt?: string;
    negativePrompt?: string;
    mode?: AiImageHistoryMode;
    sourceImageBase64?: string;
    sourceImageDataUrl?: string;
    sourceImageWidth?: number;
    sourceImageHeight?: number;
    maskBase64?: string;
    width?: number;
    height?: number;
    strength?: number;
    noise?: number;
    toolLabel?: string;
  }) => {
    const context = buildGenerateContext({
      mode: args?.mode,
      currentMode: mode,
      uiMode,
      simpleInfillPrompt,
      proInfillPrompt,
      simpleInfillNegativePrompt,
      proInfillNegativePrompt,
      prompt: args?.prompt,
      negativePrompt: args?.negativePrompt,
      simplePrompt,
      promptText: prompt,
      simpleNegativePrompt,
      negativePromptText: negativePrompt,
      activeStyleTags,
      activeStyleNegativeTags,
      width: args?.width ?? width,
      height: args?.height ?? height,
      strength: args?.strength ?? ((args?.mode ?? mode) === "infill" ? currentInfillStrength : currentImg2imgStrength),
      noise: args?.noise ?? ((args?.mode ?? mode) === "infill" ? currentInfillNoise : currentImg2imgNoise),
      sourceImageBase64: args?.sourceImageBase64 ?? sourceImageBase64,
      sourceImageDataUrl: args?.sourceImageDataUrl ?? sourceImageDataUrl,
      sourceImageWidth: args?.sourceImageWidth ?? sourceImageSize?.width,
      sourceImageHeight: args?.sourceImageHeight ?? sourceImageSize?.height,
      maskBase64: args?.maskBase64 ?? ((args?.mode ?? mode) === "infill" ? resolveInfillMaskBase64ForUi(uiMode) : undefined),
      isNAI4,
      v4Chars,
      v4UseCoords,
      v4UseOrder,
      normalizeReferenceStrengths,
      vibeTransferReferences,
      preciseReference,
    });

    setError("");
    setLoading(true);
    try {
      validateGenerateContext({
        context,
        steps,
      });

      const focusedContext = await resolveFocusedGenerateContext({
        context,
        maskBase64: args?.maskBase64,
        uiMode,
        resolveSeparatedInfillMaskBase64ForUi,
        resolveBlendInfillMaskDataUrlForUi,
      });

      if (context.effectiveMode === "infill" && typeof window !== "undefined" && window.electronAPI?.saveAiImageDebugBundle) {
        const requestBody = {
          mode: context.effectiveMode,
          model: resolveInpaintModel(model),
          width: focusedContext.requestWidth,
          height: focusedContext.requestHeight,
          strength: context.effectiveStrength,
          noise: context.effectiveNoise,
          prompt: context.effectivePrompt,
          negativePrompt: context.effectiveNegative,
          sampler,
          noiseSchedule,
          cfgRescale,
          ucPreset,
          qualityToggle,
          dynamicThresholding,
          sourceImageWidth: focusedContext.requestSourceImageWidth,
          sourceImageHeight: focusedContext.requestSourceImageHeight,
          focusedCropRect: focusedContext.focusedInpaint?.cropRect,
        };
        void window.electronAPI.saveAiImageDebugBundle({
          category: "infill",
          sourceDataUrl: context.effectiveSourceImageDataUrl,
          uiMaskDataUrl: context.effectiveMode === "infill" ? (uiMode === "simple" ? simpleInfillMaskDataUrl : proInfillMaskDataUrl) : undefined,
          requestMaskDataUrl: focusedContext.requestMaskDataUrl,
          requestBody,
        });
      }

      const seedInput = Number(seed);
      const seedValue = Number.isFinite(seedInput) && seedInput >= 0 ? Math.floor(seedInput) : undefined;
      const res = await generateNovelImageViaProxy({
        mode: context.effectiveMode,
        sourceImageBase64: focusedContext.requestSourceImageBase64,
        sourceImageWidth: focusedContext.requestSourceImageWidth,
        sourceImageHeight: focusedContext.requestSourceImageHeight,
        maskBase64: focusedContext.requestMaskPayloadBase64,
        strength: context.effectiveStrength,
        noise: context.effectiveNoise,
        prompt: context.effectivePrompt,
        negativePrompt: context.effectiveNegative,
        v4Chars: context.v4CharsPayload,
        v4UseCoords: context.v4UseCoordsPayload,
        v4UseOrder: context.v4UseOrderPayload,
        vibeTransferReferences: context.vibeTransferPayload,
        preciseReference: context.preciseReferencePayload,
        model,
        width: focusedContext.requestWidth,
        height: focusedContext.requestHeight,
        imageCount: context.effectiveImageCount,
        steps,
        scale,
        sampler,
        noiseSchedule,
        cfgRescale,
        ucPreset,
        smea,
        smeaDyn,
        qualityToggle,
        dynamicThresholding,
        seed: seedValue,
      });

      const finalized = await finalizeGenerateResult({
        context,
        focusedContext,
        response: res,
        toolLabel: args?.toolLabel,
        setResults,
        setSelectedResultIndex,
        setSelectedHistoryPreviewKey,
        uiMode,
        seedValue,
        setSimpleSeed,
        setProSeed,
      });

      await addAiImageHistoryBatch(buildHistoryRowsFromGenerateResult({
        generatedItems: finalized.generatedItems,
        context,
        response: res,
        resultWidth: finalized.resultWidth,
        resultHeight: finalized.resultHeight,
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
        preciseReference,
        toolLabel: args?.toolLabel,
        batchId: finalized.batchId,
      }));
      await refreshHistory();
      return true;
    }
    catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (context.effectiveMode === "infill")
        setError(message);
      else
        showErrorToast(message);
      return false;
    }
    finally {
      setLoading(false);
    }
  }, [
    cfgRescale,
    height,
    mode,
    model,
    dynamicThresholding,
    isNAI4,
    negativePrompt,
    noiseSchedule,
    preciseReference,
    prompt,
    qualityToggle,
    refreshHistory,
    sampler,
    scale,
    showErrorToast,
    activeStyleNegativeTags,
    activeStyleTags,
    seed,
    simpleInfillNegativePrompt,
    simpleInfillPrompt,
    simpleNegativePrompt,
    simplePrompt,
    sourceImageSize,
    smea,
    smeaDyn,
    sourceImageBase64,
    sourceImageDataUrl,
    steps,
    currentImg2imgNoise,
    currentImg2imgStrength,
    currentInfillNoise,
    currentInfillStrength,
    ucPreset,
    uiMode,
    v4Chars,
    vibeTransferReferences,
    v4UseCoords,
    v4UseOrder,
    width,
    normalizeReferenceStrengths,
    proInfillNegativePrompt,
    proInfillPrompt,
    resolveInfillMaskBase64ForUi,
    resolveSeparatedInfillMaskBase64ForUi,
    resolveBlendInfillMaskDataUrlForUi,
  ]);
  const handleOpenInpaint = useCallback(() => {
    const preview = selectedPreviewResult;
    if (!preview)
      return;

    const shouldSyncBaseImage = sourceImageDataUrl !== preview.dataUrl;
    if (shouldSyncBaseImage && !applySelectedPreviewAsBaseImage())
      return;

    const sourceImageBase64 = dataUrlToBase64(preview.dataUrl);
    if (!sourceImageBase64) {
      showErrorToast("???????????????????????Inpaint??");
      return;
    }

    setError("");
    setInpaintDialogSource(buildOpenInpaintState({
      selectedPreviewResult: preview,
      selectedPreviewHistoryRow,
      shouldSyncBaseImage,
      dataUrlToBase64,
      infillMaskDataUrl,
      uiMode,
      simpleInfillPrompt,
      proInfillPrompt,
      simpleInfillNegativePrompt,
      proInfillNegativePrompt,
      currentInfillStrength,
    }));
  }, [applySelectedPreviewAsBaseImage, currentInfillStrength, infillMaskDataUrl, proInfillNegativePrompt, proInfillPrompt, selectedPreviewHistoryRow, selectedPreviewResult, showErrorToast, simpleInfillNegativePrompt, simpleInfillPrompt, sourceImageDataUrl, uiMode]);

  const handleOpenBaseImageInpaint = useCallback(async () => {
    try {
      const nextState = await buildBaseImageInpaintStateAction({
        sourceImageDataUrl,
        readImageSize,
        history,
        uiMode,
        simpleInfillPrompt,
        proInfillPrompt,
        simpleInfillNegativePrompt,
        proInfillNegativePrompt,
        infillMaskDataUrl,
        width,
        height,
        seed,
        model,
        currentInfillStrength,
      });
      if (!nextState)
        return;
      setError("");
      setInpaintDialogSource(nextState);
    }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showErrorToast(message);
    }
  }, [height, history, currentInfillStrength, infillMaskDataUrl, model, proInfillNegativePrompt, proInfillPrompt, seed, showErrorToast, simpleInfillNegativePrompt, simpleInfillPrompt, sourceImageDataUrl, uiMode, width]);

  const handleCloseInpaintDialog = useCallback(() => {
    if (loading)
      return;
    setError("");
    setInpaintDialogSource(null);
  }, [loading]);

  const handleSaveInpaintMask = useCallback((payload: InpaintSubmitPayload) => {
    saveInpaintMaskAction({
      inpaintDialogSource,
      payload,
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
      setError,
      setModeForUi,
      setInpaintDialogSource,
    });
  }, [inpaintDialogSource, setModeForUi]);

  const handleReturnFromInfillSettings = useCallback(() => {
    setModeForUi(uiMode, sourceImageDataUrl ? "img2img" : "txt2img");
  }, [setModeForUi, sourceImageDataUrl, uiMode]);

  const handleClearInfillMask = useCallback(() => {
    clearInfillMaskForUi(uiMode);
    setModeForUi(uiMode, sourceImageDataUrl ? "img2img" : "txt2img");
  }, [clearInfillMaskForUi, setModeForUi, sourceImageDataUrl, uiMode]);

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
    catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      showErrorToast(message);
    }
    finally {
      setSimpleConverting(false);
    }
  }, [
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
  }, [showErrorToast, simpleConverted, simpleText]);

  const handleRejectSimpleConverted = useCallback(() => {
    setSimpleConverted(null);
    setSimpleConvertedFromText("");
  }, []);

  const handleReturnToSimpleText = useCallback(() => {
    setSimpleConverted(null);
    setSimpleConvertedFromText("");
    setSimpleEditorMode("text");
    setSimplePromptTab("prompt");
  }, []);

  const handleReturnToSimpleTags = useCallback(() => {
    if (!sanitizeNovelAiTagInput(simplePrompt) && !sanitizeNovelAiTagInput(simpleNegativePrompt)) {
      showErrorToast("There are no tags to return to.");
      return;
    }
    setSimpleConverted(null);
    setSimpleConvertedFromText(simpleText.trim());
    setSimpleEditorMode("tags");
    setSimplePromptTab("prompt");
  }, [showErrorToast, simpleNegativePrompt, simplePrompt, simpleText]);

  const handleSimpleGenerateFromTags = useCallback(async () => {
    const nextGenerateMode = resolveSimpleGenerateMode(mode);
    if (nextGenerateMode === "txt2img" && !sanitizeNovelAiTagInput(simplePrompt)) {
      showErrorToast("Prompt is empty. Please complete the tags first.");
      return;
    }
    await runGenerate({ mode: nextGenerateMode, prompt: simplePrompt, negativePrompt: simpleNegativePrompt });
  }, [mode, runGenerate, showErrorToast, simpleNegativePrompt, simplePrompt]);

  const handleSelectCurrentResult = useCallback((index: number) => {
    setSelectedHistoryPreviewKey(null);
    setSelectedResultIndex(index);
    if (isDirectorToolsOpen)
      setDirectorOutputPreview(null);
  }, [isDirectorToolsOpen]);

  const handlePreviewHistoryRow = useCallback((row: AiImageHistoryRow) => {
    setSelectedHistoryPreviewKey(historyRowKey(row));
    if (isDirectorToolsOpen)
      setDirectorOutputPreview(null);
  }, [isDirectorToolsOpen]);

  const handleClearCurrentDisplayedImage = useCallback(() => {
    if (!selectedPreviewResult)
      return;

    setSelectedHistoryPreviewKey(null);
    setSelectedResultIndex(-1);
    setDirectorSourcePreview(null);
    setDirectorOutputPreview(null);
    setIsPreviewImageModalOpen(false);
  }, [selectedPreviewResult]);

  const createDirectorSourceClone = useCallback((image: GeneratedImageItem) => {
    return {
      ...image,
      batchId: makeStableId(),
      batchIndex: 0,
      batchSize: 1,
    } satisfies GeneratedImageItem;
  }, []);

  const addDirectorImageToSourceRail = useCallback((image: GeneratedImageItem | null) => {
    if (!image)
      return false;
    const clone = createDirectorSourceClone(image);
    setDirectorSourceItems(prev => [clone, ...prev]);
    setDirectorSourcePreview(clone);
    setDirectorOutputPreview(null);
    return true;
  }, [createDirectorSourceClone]);

  const copyGeneratedImageToClipboard = useCallback(async (image: GeneratedImageItem | null, successMessage: string) => {
    if (!image)
      return;
    if (typeof navigator === "undefined" || !navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
      showErrorToast("Clipboard image copy is not supported in this environment.");
      return;
    }

    try {
      const file = fileFromDataUrl(
        image.dataUrl,
        `nai_preview.${extensionFromDataUrl(image.dataUrl)}`,
      );
      await navigator.clipboard.write([
        new ClipboardItem({
          [file.type || "image/png"]: file,
        }),
      ]);
      showSuccessToast(successMessage);
    }
    catch {
      showErrorToast("Failed to copy image. Please try again.");
    }
  }, [showErrorToast, showSuccessToast]);

  const downloadGeneratedImage = useCallback((image: GeneratedImageItem | null, filePrefix: string) => {
    if (!image)
      return;
    triggerBrowserDownload(
      image.dataUrl,
      `${filePrefix}_${image.seed}_${image.batchIndex + 1}.${extensionFromDataUrl(image.dataUrl)}`,
    );
  }, []);

  const handleRunDirectorInputUpscale = useCallback(async () => {
    if (!directorInputPreview)
      return;
    showErrorToast(getNovelAiFreeOnlyMessage("Upscale is disabled."));
  }, [directorInputPreview, showErrorToast]);

  const handleAddDirectorDisplayedToSourceRail = useCallback(() => {
    if (addDirectorImageToSourceRail(directorOutputPreview ?? selectedPreviewResult))
      showSuccessToast("Added the current right-side image to the source rail.");
  }, [addDirectorImageToSourceRail, directorOutputPreview, selectedPreviewResult, showSuccessToast]);

  const handleCopyDirectorInputImage = useCallback(async () => {
    await copyGeneratedImageToClipboard(directorInputPreview, "Copied the current left image.");
  }, [copyGeneratedImageToClipboard, directorInputPreview]);

  const handleCopyDirectorOutputImage = useCallback(async () => {
    await copyGeneratedImageToClipboard(directorOutputPreview ?? selectedPreviewResult, "Copied the current right image.");
  }, [copyGeneratedImageToClipboard, directorOutputPreview, selectedPreviewResult]);

  const handleDownloadDirectorOutputImage = useCallback(() => {
    downloadGeneratedImage(directorOutputPreview ?? selectedPreviewResult, "nai_director");
  }, [directorOutputPreview, downloadGeneratedImage, selectedPreviewResult]);


  const handleClearPinnedPreview = useCallback(() => {
    clearPinnedPreviewAction({
      pinnedPreviewKey,
      setPinnedPreviewKey,
      showSuccessToast,
    });
  }, [pinnedPreviewKey, showSuccessToast]);

  const handleSelectPinnedPreview = useCallback(() => {
    selectPinnedPreviewAction({
      pinnedPreviewKey,
      results,
      generatedItemKey,
      handleSelectCurrentResult,
      historyRowByKey,
      handlePreviewHistoryRow,
    });
  }, [handlePreviewHistoryRow, handleSelectCurrentResult, historyRowByKey, pinnedPreviewKey, results]);

  const handleApplyPinnedPreviewSeed = useCallback(() => {
    applyPinnedPreviewSeedAction({
      pinnedPreviewResult,
      uiMode,
      setSimpleSeed,
      setProSeed,
      showSuccessToast,
    });
  }, [pinnedPreviewResult, showSuccessToast, uiMode]);
  const handleOpenPreviewImage = useCallback(() => {
    openPreviewImageAction({
      selectedPreviewResult,
      setIsPreviewImageModalOpen,
    });
  }, [selectedPreviewResult]);
  const handleTogglePinnedPreview = useCallback(() => {
    togglePinnedPreviewAction({
      selectedPreviewResult,
      selectedPreviewIdentityKey,
      pinnedPreviewKey,
      setPinnedPreviewKey,
      showSuccessToast,
    });
  }, [pinnedPreviewKey, selectedPreviewIdentityKey, selectedPreviewResult, showSuccessToast]);
  const handleApplySelectedPreviewSeed = useCallback(() => {
    applySelectedPreviewSeedAction({
      selectedPreviewResult,
      uiMode,
      setSimpleSeed,
      setProSeed,
      showSuccessToast,
    });
  }, [selectedPreviewResult, showSuccessToast, uiMode]);
  const handleCopySelectedPreviewImage = useCallback(async () => {
    await copyGeneratedImageToClipboard(selectedPreviewResult, "Copied the current image.");
  }, [copyGeneratedImageToClipboard, selectedPreviewResult]);
  const handleApplyHistorySettings = useCallback((row: AiImageHistoryRow, clickMode: Exclude<HistoryRowClickMode, "preview">) => {
    applyHistorySettingsAction({
      row,
      clickMode,
      uiMode,
      samplerOptions,
      noiseScheduleOptions,
      setSelectedHistoryPreviewKey,
      setSimpleSeed,
      setProSeed,
      showSuccessToast,
      restoreSourceImageForUi,
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
      applyModeStrengthAndNoise,
      clearSourceImageForUi,
      setPrompt,
      setNegativePrompt,
      setV4UseCoords,
      setV4UseOrder,
      setV4Chars,
      setCharPromptTabs,
      setVibeTransferReferences,
      setPreciseReference,
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
      inferResolutionSelection,
    });
  }, [
    applyModeStrengthAndNoise,
    clearSourceImageForUi,
    inferResolutionSelection,
    noiseScheduleOptions,
    restoreSourceImageForUi,
    samplerOptions,
    showSuccessToast,
    uiMode,
  ]);

  const handleHistoryRowClick = useCallback((row: AiImageHistoryRow, event: MouseEvent<HTMLButtonElement>) => {
    const clickMode: HistoryRowClickMode = (event.metaKey || event.ctrlKey)
      ? (event.shiftKey ? "settings-with-seed" : "settings")
      : (event.shiftKey ? "seed" : "preview");

    if (clickMode === "preview") {
      handlePreviewHistoryRow(row);
      return;
    }

    handleApplyHistorySettings(row, clickMode);
  }, [handleApplyHistorySettings, handlePreviewHistoryRow]);

  const handleDeleteHistoryRow = useCallback(async (row: AiImageHistoryRow) => {
    if (typeof row.id !== "number")
      return;

    const rowKey = historyRowKey(row);
    const rowResultMatchKey = historyRowResultMatchKey(row);
    const rowGeneratedItemKey = generatedItemKey(historyRowToGeneratedItem(row));
    const deleteIndex = results.findIndex(item => generatedItemKey(item) === rowResultMatchKey);
    const nextResults = deleteIndex >= 0
      ? results.filter((_, index) => index !== deleteIndex)
      : results;

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
  }, [directorOutputPreview, directorSourcePreview, pinnedPreviewKey, refreshHistory, results, selectedHistoryPreviewKey]);

  const handleDownloadCurrent = useCallback(() => {
    downloadCurrentAction({
      selectedPreviewResult,
      downloadGeneratedImage,
    });
  }, [downloadGeneratedImage, selectedPreviewResult]);
  const handleDownloadAll = useCallback(() => {
    if (!history.length)
      return;
    const archiveEntries = history.reduce<Record<string, Uint8Array>>((acc, row, index) => {
      const entryName = `nai_${row.seed}_${(row.batchIndex ?? 0) + 1}_${row.id ?? row.createdAt ?? index + 1}.${extensionFromDataUrl(row.dataUrl)}`;
      acc[entryName] = base64ToBytes(dataUrlToBase64(row.dataUrl));
      return acc;
    }, {});
    const archive = zipSync(archiveEntries);
    triggerBlobDownload(new Blob([archive], { type: "application/zip" }), `nai_history_${Date.now()}.zip`);
  }, [history]);


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
    setMetadataImportSelection(DEFAULT_METADATA_IMPORT_SELECTION);
    setIsPageImageDragOver(false);
    showSuccessToast("Reset simple mode to defaults.");
  }, [clearSourceImageForUi, showSuccessToast]);


  const handleAddV4Char = useCallback((options?: { defaultPrompt?: string; gender?: V4CharGender }) => {
    const row = {
      ...newV4CharEditorRow({ gender: options?.gender ?? "other" }),
      prompt: options?.defaultPrompt ?? "",
    };
    setV4Chars((prev) => {
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
    setCharPromptTabs(prev => ({ ...prev, [row.id]: "prompt" }));
    setProFeatureSectionOpen("characterPrompts", true);
  }, [setProFeatureSectionOpen, v4UseCoords]);

  const handleRemoveV4Char = useCallback((id: string) => {
    setV4Chars(prev => prev.filter(item => item.id !== id));
    setCharPromptTabs((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const handleMoveV4Char = useCallback((id: string, direction: -1 | 1) => {
    setV4Chars((prev) => {
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
  }, []);

  const handleUpdateV4Char = useCallback((id: string, patch: Partial<V4CharEditorRow>) => {
    setV4Chars(prev => prev.map(item => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const handleSetV4UseCoords = useCallback((enabled: boolean) => {
    setV4UseCoords((prev) => {
      if (prev === enabled)
        return prev;
      return enabled;
    });
    if (!enabled)
      return;
    setV4Chars((prev) => {
      const next = normalizeV4CharGridRows(prev);
      return next === prev ? prev : next;
    });
  }, []);

  const handleUpdateVibeReference = useCallback((id: string, patch: Partial<VibeTransferReferenceRow>) => {
    setVibeTransferReferences(prev => prev.map(item => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const handleRemoveVibeReference = useCallback((id: string) => {
    setVibeTransferReferences(prev => prev.filter(item => item.id !== id));
  }, []);

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
  const simpleConvertLabel = simpleConverting ? "Converting..." : loading || pendingPreviewAction ? "Processing..." : "Convert to tags";

  const sidebarProps = buildSidebarProps({
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
    hasReferenceConflict,
    height,
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
    handleSetV4UseCoords,
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
    widthInput,
    heightInput,
    width,
  });

  const workspaceProps = buildWorkspaceProps({
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
    },
    historyPaneProps: {
      history,
      mode,
      currentResultCards,
      archivedHistoryRows,
      selectedHistoryPreviewKey,
      selectedResultIndex,
      directorInputPreviewKey: directorInputPreview ? generatedItemKey(directorInputPreview) : undefined,
      isHistoryExpanded,
      onHistoryExpandedChange: setIsHistoryExpanded,
      onSelectCurrentResult: handleSelectCurrentResult,
      onHistoryRowClick: handleHistoryRowClick,
      onHistoryImageDragStart: handleHistoryImageDragStart,
      onDeleteHistoryRow: handleDeleteHistoryRow,
      onDownloadAll: handleDownloadAll,
      onClearHistory: handleClearHistory,
    },
    pinnedPreviewResult,
    onClearPinnedPreview: handleClearPinnedPreview,
    onJumpToPinnedPreview: handleSelectPinnedPreview,
    onApplyPinnedPreviewSeed: handleApplyPinnedPreviewSeed,
  });

  const metadataImportDialogProps = buildMetadataImportDialogProps({
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
  });

  const previewImageDialogProps = buildPreviewImageDialogProps({
    isOpen: isPreviewImageModalOpen,
    selectedPreviewResult,
    selectedPreviewHistoryRow,
    onClose: () => setIsPreviewImageModalOpen(false),
    onDownloadCurrent: handleDownloadCurrent,
  });

  const inpaintDialogProps = buildInpaintDialogProps({
    isOpen: Boolean(inpaintDialogSource),
    source: inpaintDialogSource,
    isSubmitting: loading,
    error,
    onClose: handleCloseInpaintDialog,
    onSubmit: handleSaveInpaintMask,
  });

  const stylePickerDialogProps = buildStylePickerDialogProps({
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
