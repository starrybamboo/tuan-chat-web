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
import type { AiImageStylePreset } from "@/utils/aiImageStylePresets";
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
  NOVELAI_FREE_MAX_DIMENSION,
  NOVELAI_FREE_MAX_STEPS,
  PREVIEW_ACTION_LABELS,
  RESOLUTION_PRESETS,
  SAMPLERS_NAI4,
  SIMPLE_MODE_CUSTOM_MAX_DIMENSION,
  STORAGE_UI_MODE_KEY,
  isDirectorToolDisabled,
} from "@/components/aiImage/constants";
import {
  base64DataUrl,
  base64ToBytes,
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
  formatDirectorEmotionLabel,
  generatedItemKey,
  getClosestValidImageSize,
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
  resolveImportedValue,
  resolveSimpleGenerateMode,
  shouldKeepSimpleTagsEditor,
  triggerBlobDownload,
  triggerBrowserDownload,
  writeLocalStorageString,
} from "@/components/aiImage/helpers";
import {
  addAiImageHistoryBatch,
  clearAiImageHistory,
  deleteAiImageHistory,
  listAiImageHistory,
} from "@/utils/aiImageHistoryDb";
import { getAiImageCompareStylePresets, getAiImageStylePresets } from "@/utils/aiImageStylePresets";
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

  const [simpleMode, setSimpleMode] = useState<AiImageHistoryMode>("txt2img");
  const [proMode, setProMode] = useState<AiImageHistoryMode>("txt2img");
  const [simpleSourceImageDataUrl, setSimpleSourceImageDataUrl] = useState("");
  const [simpleSourceImageBase64, setSimpleSourceImageBase64] = useState("");
  const [simpleSourceImageSize, setSimpleSourceImageSize] = useState<{ width: number; height: number } | null>(null);
  const [proSourceImageDataUrl, setProSourceImageDataUrl] = useState("");
  const [proSourceImageBase64, setProSourceImageBase64] = useState("");
  const [proSourceImageSize, setProSourceImageSize] = useState<{ width: number; height: number } | null>(null);
  const [simpleInfillMaskDataUrl, setSimpleInfillMaskDataUrl] = useState("");
  const [proInfillMaskDataUrl, setProInfillMaskDataUrl] = useState("");

  const [simpleText, setSimpleText] = useState("");
  const [simpleConvertedFromText, setSimpleConvertedFromText] = useState("");
  const [simpleConverted, setSimpleConverted] = useState<NovelAiNl2TagsResult | null>(null);
  const [simplePrompt, setSimplePrompt] = useState("");
  const [simpleNegativePrompt, setSimpleNegativePrompt] = useState("");
  const [simpleEditorMode, setSimpleEditorMode] = useState<"text" | "tags">("text");
  const [simplePromptTab, setSimplePromptTab] = useState<"prompt" | "negative">("prompt");
  const [simpleConverting, setSimpleConverting] = useState<boolean>(false);
  const [isPageImageDragOver, setIsPageImageDragOver] = useState<boolean>(false);
  const [isStylePickerOpen, setIsStylePickerOpen] = useState<boolean>(false);
  const [styleSelectionMode, setStyleSelectionMode] = useState<"select" | "compare">("select");
  const [selectedStyleIds, setSelectedStyleIds] = useState<string[]>([]);
  const [compareStyleId, setCompareStyleId] = useState<string | null>(null);
  const [proPromptTab, setProPromptTab] = useState<"prompt" | "negative">("prompt");
  const [charPromptTabs, setCharPromptTabs] = useState<Record<string, "prompt" | "negative">>({});

  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");

  const [v4UseCoords, setV4UseCoords] = useState<boolean>(false);
  const [v4UseOrder, setV4UseOrder] = useState<boolean>(true);
  const [v4Chars, setV4Chars] = useState<V4CharEditorRow[]>([]);
  const [vibeTransferReferences, setVibeTransferReferences] = useState<VibeTransferReferenceRow[]>([]);
  const [preciseReference, setPreciseReference] = useState<PreciseReferenceRow | null>(null);
  // 参考 NovelAI 的专业模式交互：把高级引用能力拆成可折叠模块，减少长表单噪音，并在导入/新增内容时自动展开对应区块。
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

  const stylePresets = useMemo(() => getAiImageStylePresets(), []);
  const compareStylePresets = useMemo(() => getAiImageCompareStylePresets(), []);

  const selectedStylePresets = useMemo(() => {
    const index = new Map<string, AiImageStylePreset>(stylePresets.map(p => [p.id, p]));
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
    return selectedStylePresets.flatMap(p => p.negativeTags);
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

  const samplerOptions = SAMPLERS_NAI4;
  const noiseScheduleOptions = NOISE_SCHEDULES_NAI4;

  const [simpleWidth, setSimpleWidth] = useState<number>(DEFAULT_SIMPLE_IMAGE_SETTINGS.width);
  const [simpleHeight, setSimpleHeight] = useState<number>(DEFAULT_SIMPLE_IMAGE_SETTINGS.height);
  const [simpleWidthInput, setSimpleWidthInput] = useState<string>(String(DEFAULT_SIMPLE_IMAGE_SETTINGS.width));
  const [simpleHeightInput, setSimpleHeightInput] = useState<string>(String(DEFAULT_SIMPLE_IMAGE_SETTINGS.height));
  const [simpleSeed, setSimpleSeed] = useState<number>(DEFAULT_SIMPLE_IMAGE_SETTINGS.seed);
  const [simpleResolutionSelection, setSimpleResolutionSelection] = useState<ResolutionSelection>(DEFAULT_SIMPLE_IMAGE_SETTINGS.simpleResolutionSelection);
  const [proWidth, setProWidth] = useState<number>(DEFAULT_PRO_IMAGE_SETTINGS.width);
  const [proHeight, setProHeight] = useState<number>(DEFAULT_PRO_IMAGE_SETTINGS.height);
  const [proWidthInput, setProWidthInput] = useState<string>(String(DEFAULT_PRO_IMAGE_SETTINGS.width));
  const [proHeightInput, setProHeightInput] = useState<string>(String(DEFAULT_PRO_IMAGE_SETTINGS.height));
  const [proResolutionSelection, setProResolutionSelection] = useState<ResolutionSelection>(DEFAULT_PRO_IMAGE_SETTINGS.simpleResolutionSelection);
  const [proImageCount, setProImageCount] = useState<number>(DEFAULT_PRO_IMAGE_SETTINGS.imageCount);
  const [proSteps, setProSteps] = useState<number>(DEFAULT_PRO_IMAGE_SETTINGS.steps);
  const [proScale, setProScale] = useState<number>(DEFAULT_PRO_IMAGE_SETTINGS.scale);
  const [proSampler, setProSampler] = useState<string>(DEFAULT_PRO_IMAGE_SETTINGS.sampler);
  const [proNoiseSchedule, setProNoiseSchedule] = useState<string>(DEFAULT_PRO_IMAGE_SETTINGS.noiseSchedule);
  const [proCfgRescale, setProCfgRescale] = useState<number>(DEFAULT_PRO_IMAGE_SETTINGS.cfgRescale);
  const [proUcPreset, setProUcPreset] = useState<number>(DEFAULT_PRO_IMAGE_SETTINGS.ucPreset);
  const [proSmea, setProSmea] = useState<boolean>(DEFAULT_PRO_IMAGE_SETTINGS.smea);
  const [proSmeaDyn, setProSmeaDyn] = useState<boolean>(DEFAULT_PRO_IMAGE_SETTINGS.smeaDyn);
  const [proQualityToggle, setProQualityToggle] = useState<boolean>(DEFAULT_PRO_IMAGE_SETTINGS.qualityToggle);
  const [proDynamicThresholding, setProDynamicThresholding] = useState<boolean>(DEFAULT_PRO_IMAGE_SETTINGS.dynamicThresholding);
  const [proSeed, setProSeed] = useState<number>(DEFAULT_PRO_IMAGE_SETTINGS.seed);
  const [simpleImg2imgStrength, setSimpleImg2imgStrength] = useState<number>(DEFAULT_SIMPLE_IMAGE_SETTINGS.strength);
  const [simpleImg2imgNoise, setSimpleImg2imgNoise] = useState<number>(DEFAULT_SIMPLE_IMAGE_SETTINGS.noise);
  const [proImg2imgStrength, setProImg2imgStrength] = useState<number>(DEFAULT_PRO_IMAGE_SETTINGS.strength);
  const [proImg2imgNoise, setProImg2imgNoise] = useState<number>(DEFAULT_PRO_IMAGE_SETTINGS.noise);

  const width = uiMode === "simple" ? simpleWidth : proWidth;
  const height = uiMode === "simple" ? simpleHeight : proHeight;
  const widthInput = uiMode === "simple" ? simpleWidthInput : proWidthInput;
  const heightInput = uiMode === "simple" ? simpleHeightInput : proHeightInput;
  const hasCompleteDimensionInputs = widthInput.trim().length > 0 && heightInput.trim().length > 0;
  const mode = uiMode === "simple" ? simpleMode : proMode;
  const imageCount = uiMode === "simple" ? DEFAULT_SIMPLE_IMAGE_SETTINGS.imageCount : proImageCount;
  const steps = uiMode === "simple" ? DEFAULT_SIMPLE_IMAGE_SETTINGS.steps : proSteps;
  const scale = uiMode === "simple" ? DEFAULT_SIMPLE_IMAGE_SETTINGS.scale : proScale;
  const sampler = uiMode === "simple" ? DEFAULT_SIMPLE_IMAGE_SETTINGS.sampler : proSampler;
  const noiseSchedule = uiMode === "simple" ? DEFAULT_SIMPLE_IMAGE_SETTINGS.noiseSchedule : proNoiseSchedule;
  const cfgRescale = uiMode === "simple" ? DEFAULT_SIMPLE_IMAGE_SETTINGS.cfgRescale : proCfgRescale;
  const ucPreset = uiMode === "simple" ? DEFAULT_SIMPLE_IMAGE_SETTINGS.ucPreset : proUcPreset;
  const qualityToggle = uiMode === "simple" ? DEFAULT_SIMPLE_IMAGE_SETTINGS.qualityToggle : proQualityToggle;
  const dynamicThresholding = uiMode === "simple" ? DEFAULT_SIMPLE_IMAGE_SETTINGS.dynamicThresholding : proDynamicThresholding;
  const smea = uiMode === "simple" ? DEFAULT_SIMPLE_IMAGE_SETTINGS.smea : proSmea;
  const smeaDyn = uiMode === "simple" ? DEFAULT_SIMPLE_IMAGE_SETTINGS.smeaDyn : proSmeaDyn;
  const strength = uiMode === "simple" ? simpleImg2imgStrength : proImg2imgStrength;
  const noise = uiMode === "simple" ? simpleImg2imgNoise : proImg2imgNoise;
  const seed = uiMode === "simple" ? simpleSeed : proSeed;
  const sourceImageDataUrl = uiMode === "simple" ? simpleSourceImageDataUrl : proSourceImageDataUrl;
  const sourceImageBase64 = uiMode === "simple" ? simpleSourceImageBase64 : proSourceImageBase64;
  const sourceImageSize = uiMode === "simple" ? simpleSourceImageSize : proSourceImageSize;
  const infillMaskDataUrl = uiMode === "simple" ? simpleInfillMaskDataUrl : proInfillMaskDataUrl;

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
  const [results, setResults] = useState<GeneratedImageItem[]>([]);
  const [selectedResultIndex, setSelectedResultIndex] = useState<number>(0);
  const [selectedHistoryPreviewKey, setSelectedHistoryPreviewKey] = useState<string | null>(null);
  const [pinnedPreviewKey, setPinnedPreviewKey] = useState<string | null>(null);
  const [isPreviewImageModalOpen, setIsPreviewImageModalOpen] = useState<boolean>(false);
  const [inpaintDialogSource, setInpaintDialogSource] = useState<InpaintDialogSource | null>(null);
  const [normalizeReferenceStrengths, setNormalizeReferenceStrengths] = useState<boolean>(false);

  const [history, setHistory] = useState<AiImageHistoryRow[]>([]);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState<boolean>(false);

  const showSuccessToast = useCallback((message: string) => {
    toast.success(message);
  }, []);

  const showErrorToast = useCallback((message: string) => {
    toast.error(message);
  }, []);

  const historyRowByKey = useMemo(() => {
    return new Map(history.map(row => [historyRowKey(row), row] as const));
  }, [history]);
  const historyRowByResultMatchKey = useMemo(() => {
    return new Map(history.map(row => [historyRowResultMatchKey(row), row] as const));
  }, [history]);
  const selectedResult = results[selectedResultIndex] || null;
  const selectedHistoryPreviewRow = useMemo(() => {
    if (!selectedHistoryPreviewKey)
      return null;
    return historyRowByKey.get(selectedHistoryPreviewKey) || null;
  }, [historyRowByKey, selectedHistoryPreviewKey]);
  const selectedPreviewResult = useMemo<GeneratedImageItem | null>(() => {
    if (selectedHistoryPreviewRow)
      return historyRowToGeneratedItem(selectedHistoryPreviewRow);
    return selectedResult;
  }, [selectedHistoryPreviewRow, selectedResult]);
  const selectedPreviewHistoryRow = useMemo(() => {
    if (selectedHistoryPreviewRow)
      return selectedHistoryPreviewRow;
    if (!selectedResult)
      return null;
    return historyRowByResultMatchKey.get(generatedItemKey(selectedResult)) || null;
  }, [historyRowByResultMatchKey, selectedHistoryPreviewRow, selectedResult]);
  const selectedPreviewIdentityKey = useMemo(() => {
    if (selectedHistoryPreviewRow)
      return `history:${historyRowKey(selectedHistoryPreviewRow)}`;
    if (selectedResult)
      return `current:${generatedItemKey(selectedResult)}`;
    return null;
  }, [selectedHistoryPreviewRow, selectedResult]);
  const pinnedPreviewResult = useMemo<GeneratedImageItem | null>(() => {
    if (!pinnedPreviewKey)
      return null;
    if (pinnedPreviewKey.startsWith("current:")) {
      const currentKey = pinnedPreviewKey.slice("current:".length);
      return results.find(item => generatedItemKey(item) === currentKey) || null;
    }
    if (pinnedPreviewKey.startsWith("history:")) {
      const historyKey = pinnedPreviewKey.slice("history:".length);
      const historyMatch = historyRowByKey.get(historyKey);
      return historyMatch ? historyRowToGeneratedItem(historyMatch) : null;
    }
    return null;
  }, [historyRowByKey, pinnedPreviewKey, results]);
  const isSelectedPreviewPinned = Boolean(selectedPreviewIdentityKey && pinnedPreviewKey === selectedPreviewIdentityKey);
  const directorTool = DIRECTOR_TOOL_OPTIONS_BY_ID[activeDirectorTool];
  const directorInputPreview = directorSourcePreview;
  const inferResolutionSelection = useCallback((nextWidth: number, nextHeight: number): ResolutionSelection => {
    return RESOLUTION_PRESETS.find(item => item.width === nextWidth && item.height === nextHeight)?.id ?? CUSTOM_RESOLUTION_ID;
  }, []);
  const imageCountLimit = useMemo(() => {
    return NOVELAI_FREE_FIXED_IMAGE_COUNT;
  }, []);

  const clampCustomDimensionInput = useCallback((value: number | string, fallback: number) => {
    const numericValue = Math.floor(Number(value));
    if (!Number.isFinite(numericValue))
      return fallback;
    return Math.max(1, Math.min(SIMPLE_MODE_CUSTOM_MAX_DIMENSION, numericValue));
  }, []);

  const syncDimensionInputsForUi = useCallback((targetUiMode: UiMode, nextWidth: number, nextHeight: number) => {
    if (targetUiMode === "simple") {
      setSimpleWidthInput(String(nextWidth));
      setSimpleHeightInput(String(nextHeight));
      return;
    }

    setProWidthInput(String(nextWidth));
    setProHeightInput(String(nextHeight));
  }, []);

  const setModeForUi = useCallback((targetUiMode: UiMode, nextMode: AiImageHistoryMode) => {
    if (targetUiMode === "simple") {
      setSimpleMode(nextMode);
      return;
    }
    setProMode(nextMode);
  }, []);

  const clearInfillMaskForUi = useCallback((targetUiMode: UiMode) => {
    if (targetUiMode === "simple") {
      setSimpleInfillMaskDataUrl("");
      return;
    }
    setProInfillMaskDataUrl("");
  }, []);

  const syncSourceImageSizeForUi = useCallback((targetUiMode: UiMode, width?: number | null, height?: number | null) => {
    if (!width || !height)
      return;

    const normalizedSize = getClosestValidImageSize(width, height);
    if (targetUiMode === "simple") {
      setSimpleWidth(normalizedSize.width);
      setSimpleHeight(normalizedSize.height);
      setSimpleResolutionSelection(inferResolutionSelection(normalizedSize.width, normalizedSize.height));
      syncDimensionInputsForUi("simple", normalizedSize.width, normalizedSize.height);
      return;
    }

    setProWidth(normalizedSize.width);
    setProHeight(normalizedSize.height);
    setProResolutionSelection(inferResolutionSelection(normalizedSize.width, normalizedSize.height));
    syncDimensionInputsForUi("pro", normalizedSize.width, normalizedSize.height);
  }, [inferResolutionSelection, syncDimensionInputsForUi]);

  const clearSourceImageForUi = useCallback((targetUiMode: UiMode) => {
    setModeForUi(targetUiMode, "txt2img");
    clearInfillMaskForUi(targetUiMode);
    if (targetUiMode === "simple") {
      setSimpleSourceImageDataUrl("");
      setSimpleSourceImageBase64("");
      setSimpleSourceImageSize(null);
      return;
    }

    setProSourceImageDataUrl("");
    setProSourceImageBase64("");
    setProSourceImageSize(null);
  }, [clearInfillMaskForUi, setModeForUi]);

  const applySourceImageForUi = useCallback((targetUiMode: UiMode, sourceImage: ImportedSourceImagePayload, successMessage?: string) => {
    const nextSourceImageSize = sourceImage.width && sourceImage.height
      ? { width: sourceImage.width, height: sourceImage.height }
      : null;
    setModeForUi(targetUiMode, "img2img");
    clearInfillMaskForUi(targetUiMode);
    if (targetUiMode === "simple") {
      setSimpleSourceImageDataUrl(sourceImage.dataUrl);
      setSimpleSourceImageBase64(sourceImage.imageBase64);
      setSimpleSourceImageSize(nextSourceImageSize);
    }
    else {
      setProSourceImageDataUrl(sourceImage.dataUrl);
      setProSourceImageBase64(sourceImage.imageBase64);
      setProSourceImageSize(nextSourceImageSize);
    }

    syncSourceImageSizeForUi(targetUiMode, sourceImage.width, sourceImage.height);
    if (successMessage)
      showSuccessToast(successMessage);
  }, [clearInfillMaskForUi, setModeForUi, showSuccessToast, syncSourceImageSizeForUi]);

  const resolveInfillMaskBase64ForUi = useCallback((targetUiMode: UiMode) => {
    const dataUrl = targetUiMode === "simple" ? simpleInfillMaskDataUrl : proInfillMaskDataUrl;
    return dataUrlToBase64(dataUrl) || "";
  }, [proInfillMaskDataUrl, simpleInfillMaskDataUrl]);

  useEffect(() => {
    if (mode !== "infill")
      return;
    if (!sourceImageDataUrl || !sourceImageBase64 || !infillMaskDataUrl)
      setModeForUi(uiMode, sourceImageDataUrl ? "img2img" : "txt2img");
  }, [infillMaskDataUrl, mode, setModeForUi, sourceImageBase64, sourceImageDataUrl, uiMode]);

  const restoreSourceImageForUi = useCallback((targetUiMode: UiMode, args: {
    dataUrl?: string | null;
    name?: string;
    width?: number | null;
    height?: number | null;
  }) => {
    const sourceImage = buildImportedSourceImagePayloadFromDataUrl({
      dataUrl: String(args.dataUrl || ""),
      name: args.name,
      width: args.width,
      height: args.height,
    });

    if (!sourceImage) {
      clearSourceImageForUi(targetUiMode);
      return false;
    }

    applySourceImageForUi(targetUiMode, sourceImage);
    return true;
  }, [applySourceImageForUi, clearSourceImageForUi]);

  useEffect(() => {
    if (!selectedPreviewResult && isPreviewImageModalOpen)
      setIsPreviewImageModalOpen(false);
  }, [isPreviewImageModalOpen, selectedPreviewResult]);

  useEffect(() => {
    if (pinnedPreviewKey && !pinnedPreviewResult)
      setPinnedPreviewKey(null);
  }, [pinnedPreviewKey, pinnedPreviewResult]);

  useEffect(() => {
    if (!samplerOptions.includes(proSampler as any))
      setProSampler(samplerOptions[0]);
  }, [proSampler, samplerOptions]);

  useEffect(() => {
    if (!noiseScheduleOptions.length)
      return;
    if (!noiseScheduleOptions.includes(proNoiseSchedule as any))
      setProNoiseSchedule(noiseScheduleOptions[0]);
  }, [proNoiseSchedule, noiseScheduleOptions]);

  useEffect(() => {
    if (proImageCount > imageCountLimit)
      setProImageCount(imageCountLimit);
  }, [imageCountLimit, proImageCount]);

  useEffect(() => {
    if (uiMode !== "simple" || simpleResolutionSelection === CUSTOM_RESOLUTION_ID)
      return;
    const matchedPresetId = inferResolutionSelection(simpleWidth, simpleHeight);
    if (matchedPresetId !== simpleResolutionSelection)
      setSimpleResolutionSelection(matchedPresetId);
  }, [inferResolutionSelection, simpleHeight, simpleResolutionSelection, simpleWidth, uiMode]);

  useEffect(() => {
    if (uiMode !== "pro" || proResolutionSelection === CUSTOM_RESOLUTION_ID)
      return;
    const matchedPresetId = inferResolutionSelection(proWidth, proHeight);
    if (matchedPresetId !== proResolutionSelection)
      setProResolutionSelection(matchedPresetId);
  }, [inferResolutionSelection, proHeight, proResolutionSelection, proWidth, uiMode]);

  useEffect(() => {
    if (uiMode !== "simple" || simpleResolutionSelection !== CUSTOM_RESOLUTION_ID)
      return;

    const nextWidth = clampCustomDimensionInput(simpleWidth, DEFAULT_SIMPLE_IMAGE_SETTINGS.width);
    const nextHeight = clampCustomDimensionInput(simpleHeight, DEFAULT_SIMPLE_IMAGE_SETTINGS.height);

    if (nextWidth === simpleWidth && nextHeight === simpleHeight)
      return;

    setSimpleWidth(nextWidth);
    setSimpleHeight(nextHeight);
    syncDimensionInputsForUi("simple", nextWidth, nextHeight);
  }, [clampCustomDimensionInput, simpleHeight, simpleResolutionSelection, simpleWidth, syncDimensionInputsForUi, uiMode]);

  useEffect(() => {
    if (uiMode !== "pro" || proResolutionSelection !== CUSTOM_RESOLUTION_ID)
      return;

    const nextWidth = clampCustomDimensionInput(proWidth, DEFAULT_PRO_IMAGE_SETTINGS.width);
    const nextHeight = clampCustomDimensionInput(proHeight, DEFAULT_PRO_IMAGE_SETTINGS.height);

    if (nextWidth === proWidth && nextHeight === proHeight)
      return;

    setProWidth(nextWidth);
    setProHeight(nextHeight);
    syncDimensionInputsForUi("pro", nextWidth, nextHeight);
  }, [clampCustomDimensionInput, proHeight, proResolutionSelection, proWidth, syncDimensionInputsForUi, uiMode]);

  const applyImportedMetadata = useCallback((metadata: NovelAiImageMetadataResult, selection: MetadataImportSelectionState) => {
    setIsPageImageDragOver(false);
    const shouldCleanImportedText = selection.cleanImports;
    const settings = metadata.settings;

    if (uiMode === "simple") {
      const importedPrompt = selection.prompt && settings.prompt != null
        ? (shouldCleanImportedText ? cleanImportedPromptText(settings.prompt) : settings.prompt)
        : "";
      const importedNegativePrompt = selection.undesiredContent && settings.negativePrompt != null
        ? (shouldCleanImportedText ? cleanImportedPromptText(settings.negativePrompt) : settings.negativePrompt)
        : "";

      if (importedPrompt || importedNegativePrompt) {
        setSimpleConverted({
          prompt: importedPrompt,
          negativePrompt: importedNegativePrompt,
          raw: JSON.stringify(metadata.raw),
        });
        setSimpleConvertedFromText("");
        setSimplePromptTab("prompt");
      }

      if (selection.seed && settings.seed != null)
        setSimpleSeed(settings.seed);
      else if (selection.seed && selection.cleanImports)
        setSimpleSeed(DEFAULT_SIMPLE_IMAGE_SETTINGS.seed);

      if (selection.settings) {
        const cleanImports = selection.cleanImports;
        const normalizedImportedSize = getClosestValidImageSize(
          resolveImportedValue(settings.width, cleanImports, DEFAULT_SIMPLE_IMAGE_SETTINGS.width) ?? simpleWidth,
          resolveImportedValue(settings.height, cleanImports, DEFAULT_SIMPLE_IMAGE_SETTINGS.height) ?? simpleHeight,
        );
        setSimpleWidth(normalizedImportedSize.width);
        setSimpleHeight(normalizedImportedSize.height);
        setSimpleResolutionSelection(inferResolutionSelection(normalizedImportedSize.width, normalizedImportedSize.height));

        const importedStrength = resolveImportedValue(settings.strength, cleanImports, DEFAULT_SIMPLE_IMAGE_SETTINGS.strength);
        if (importedStrength != null)
          setSimpleImg2imgStrength(clampRange(importedStrength, 0, 1, DEFAULT_SIMPLE_IMAGE_SETTINGS.strength));
        const importedNoise = resolveImportedValue(settings.noise, cleanImports, DEFAULT_SIMPLE_IMAGE_SETTINGS.noise);
        if (importedNoise != null)
          setSimpleImg2imgNoise(clampRange(importedNoise, 0, 1, DEFAULT_SIMPLE_IMAGE_SETTINGS.noise));
      }

      return;
    }

    setUiMode("pro");

    if (selection.settings) {
      clearSourceImageForUi("pro");
      setVibeTransferReferences([]);
      setPreciseReference(null);
      setProFeatureSectionOpen("baseImage", false);
      setProFeatureSectionOpen("vibeTransfer", false);
      setProFeatureSectionOpen("preciseReference", false);
    }

    if (selection.prompt && settings.prompt != null)
      setPrompt(shouldCleanImportedText ? cleanImportedPromptText(settings.prompt) : settings.prompt);
    else if (selection.prompt && selection.cleanImports)
      setPrompt("");

    if (selection.undesiredContent && settings.negativePrompt != null)
      setNegativePrompt(shouldCleanImportedText ? cleanImportedPromptText(settings.negativePrompt) : settings.negativePrompt);
    else if (selection.undesiredContent && selection.cleanImports)
      setNegativePrompt("");

    if (selection.seed && settings.seed != null)
      setProSeed(settings.seed);
    else if (selection.seed && selection.cleanImports)
      setProSeed(DEFAULT_PRO_IMAGE_SETTINGS.seed);
    if (selection.settings) {
      const cleanImports = selection.cleanImports;
      const normalizedImportedSize = getClosestValidImageSize(
        resolveImportedValue(settings.width, cleanImports, DEFAULT_PRO_IMAGE_SETTINGS.width) ?? proWidth,
        resolveImportedValue(settings.height, cleanImports, DEFAULT_PRO_IMAGE_SETTINGS.height) ?? proHeight,
      );
      setProWidth(normalizedImportedSize.width);
      setProHeight(normalizedImportedSize.height);
      setProResolutionSelection(inferResolutionSelection(normalizedImportedSize.width, normalizedImportedSize.height));
      setProImageCount(NOVELAI_FREE_FIXED_IMAGE_COUNT);
      const importedSteps = resolveImportedValue(settings.steps, cleanImports, DEFAULT_PRO_IMAGE_SETTINGS.steps);
      if (importedSteps != null)
        setProSteps(clampIntRange(importedSteps, 1, NOVELAI_FREE_MAX_STEPS, DEFAULT_PRO_IMAGE_SETTINGS.steps));
      const importedScale = resolveImportedValue(settings.scale, cleanImports, DEFAULT_PRO_IMAGE_SETTINGS.scale);
      if (importedScale != null)
        setProScale(clampRange(importedScale, 0, 20, DEFAULT_PRO_IMAGE_SETTINGS.scale));
      const importedSampler = resolveImportedValue(settings.sampler, cleanImports, samplerOptions[0] || DEFAULT_PRO_IMAGE_SETTINGS.sampler);
      if (importedSampler != null)
        setProSampler(importedSampler);
      const importedNoiseSchedule = resolveImportedValue(settings.noiseSchedule, cleanImports, noiseScheduleOptions[0] || DEFAULT_PRO_IMAGE_SETTINGS.noiseSchedule);
      if (importedNoiseSchedule != null)
        setProNoiseSchedule(importedNoiseSchedule);
      const importedCfgRescale = resolveImportedValue(settings.cfgRescale, cleanImports, DEFAULT_PRO_IMAGE_SETTINGS.cfgRescale);
      if (importedCfgRescale != null)
        setProCfgRescale(clampRange(importedCfgRescale, 0, 1, DEFAULT_PRO_IMAGE_SETTINGS.cfgRescale));
      const importedUcPreset = resolveImportedValue(settings.ucPreset, cleanImports, DEFAULT_PRO_IMAGE_SETTINGS.ucPreset);
      if (importedUcPreset != null)
        setProUcPreset(clampIntRange(importedUcPreset, 0, 2, DEFAULT_PRO_IMAGE_SETTINGS.ucPreset));
      const importedQualityToggle = resolveImportedValue(settings.qualityToggle, cleanImports, DEFAULT_PRO_IMAGE_SETTINGS.qualityToggle);
      if (importedQualityToggle != null)
        setProQualityToggle(Boolean(importedQualityToggle));
      const importedDynamicThresholding = resolveImportedValue(settings.dynamicThresholding, cleanImports, DEFAULT_PRO_IMAGE_SETTINGS.dynamicThresholding);
      if (importedDynamicThresholding != null)
        setProDynamicThresholding(Boolean(importedDynamicThresholding));
      const importedSmea = resolveImportedValue(settings.smea, cleanImports, DEFAULT_PRO_IMAGE_SETTINGS.smea);
      if (importedSmea != null)
        setProSmea(Boolean(importedSmea));
      const importedSmeaDyn = resolveImportedValue(settings.smeaDyn, cleanImports, DEFAULT_PRO_IMAGE_SETTINGS.smeaDyn);
      if (importedSmeaDyn != null)
        setProSmeaDyn(Boolean(importedSmeaDyn));
      const importedStrength = resolveImportedValue(settings.strength, cleanImports, DEFAULT_PRO_IMAGE_SETTINGS.strength);
      if (importedStrength != null)
        setProImg2imgStrength(clampRange(importedStrength, 0, 1, DEFAULT_PRO_IMAGE_SETTINGS.strength));
      const importedNoise = resolveImportedValue(settings.noise, cleanImports, DEFAULT_PRO_IMAGE_SETTINGS.noise);
      if (importedNoise != null)
        setProImg2imgNoise(clampRange(importedNoise, 0, 1, DEFAULT_PRO_IMAGE_SETTINGS.noise));
      const importedV4UseCoords = resolveImportedValue(settings.v4UseCoords, cleanImports, false);
      if (importedV4UseCoords != null)
        setV4UseCoords(Boolean(importedV4UseCoords));
      const importedV4UseOrder = resolveImportedValue(settings.v4UseOrder, cleanImports, true);
      if (importedV4UseOrder != null)
        setV4UseOrder(Boolean(importedV4UseOrder));

      if (cleanImports || (settings.vibeTransferReferences?.length ?? 0) > 0) {
        setVibeTransferReferences([]);
      }

      if (cleanImports || settings.preciseReference) {
        setPreciseReference(null);
      }
    }

    if (selection.characters) {
      const importedChars = Array.isArray(settings.v4Chars)
        ? settings.v4Chars.map(item => ({
            id: makeStableId(),
            prompt: shouldCleanImportedText ? cleanImportedPromptText(String(item.prompt || "")) : String(item.prompt || ""),
            negativePrompt: shouldCleanImportedText ? cleanImportedPromptText(String(item.negativePrompt || "")) : String(item.negativePrompt || ""),
            centerX: clamp01(item.centerX, 0.5),
            centerY: clamp01(item.centerY, 0.5),
          }))
        : [];
      const nextChars = importedChars.length
        ? (selection.appendCharacters ? [...v4Chars, ...importedChars] : importedChars)
        : (selection.cleanImports ? [] : v4Chars);
      setV4Chars(nextChars);
      setCharPromptTabs(
        nextChars.reduce<Record<string, "prompt" | "negative">>((acc, item) => {
          acc[item.id] = "prompt";
          return acc;
        }, {}),
      );
      setProFeatureSectionOpen("characterPrompts", nextChars.length > 0);
    }
  }, [clearSourceImageForUi, inferResolutionSelection, noiseScheduleOptions, proHeight, proWidth, samplerOptions, simpleHeight, simpleWidth, uiMode, v4Chars, setProFeatureSectionOpen]);

  const refreshHistory = useCallback(async () => {
    const rows = await listAiImageHistory({ limit: 30 });
    setHistory(rows);
  }, []);

  useEffect(() => {
    void refreshHistory();
  }, [refreshHistory]);

  const handleImportSourceImageBytes = useCallback(async (args: {
    bytes: Uint8Array;
    mime: string;
    name: string;
    source?: ImageImportSource;
    imageCount?: number;
    target?: "img2img";
  }) => {
    const dataUrl = base64DataUrl(args.mime, args.bytes);
    const imageBase64 = bytesToBase64(args.bytes);
    let importedMetadata: NovelAiImageMetadataResult | null = extractNovelAiMetadataFromPngBytes(args.bytes);

    if (!importedMetadata) {
      try {
        const pixels = await readImagePixels(dataUrl);
        importedMetadata = extractNovelAiMetadataFromStealthPixels(pixels);
      }
      catch (e) {
        console.warn("[ai-image] failed to inspect imported image pixels", e);
      }
    }

    setError("");
    setIsPageImageDragOver(false);
    let imageSize: { width: number; height: number } | null = null;
    try {
      imageSize = await readImageSize(dataUrl);
    }
    catch {
      // ignore
    }

    const sourceImage = {
      dataUrl,
      imageBase64,
      name: args.name,
      width: imageSize?.width,
      height: imageSize?.height,
    } satisfies ImportedSourceImagePayload;

    const applySourceImageAsBase = (nextSourceImage: ImportedSourceImagePayload, successMessage?: string) => {
      applySourceImageForUi(uiMode, nextSourceImage, successMessage);
    };

    if (args.target === "img2img") {
      applySourceImageAsBase(sourceImage, "已设置 Base Img。");
      return;
    }

    if ((args.imageCount ?? 1) > 1) {
      return;
    }

      setPendingMetadataImport({
      sourceImage,
      metadata: importedMetadata,
      source: args.source,
      imageCount: args.imageCount ?? 1,
    });
    const nextMetadataImportSelection = importedMetadata
      ? createMetadataImportSelection(importedMetadata.settings)
      : DEFAULT_METADATA_IMPORT_SELECTION;
    if (uiMode === "simple")
      nextMetadataImportSelection.settings = false;
    if (uiMode === "simple")
      nextMetadataImportSelection.characters = false;
    setMetadataImportSelection(nextMetadataImportSelection);
  }, [applySourceImageForUi, uiMode]);

  const handlePickSourceImage = useCallback(async (
    file: File,
    options?: { source?: ImageImportSource; imageCount?: number; target?: "img2img" },
  ) => {
    const bytes = await readFileAsBytes(file);
    await handleImportSourceImageBytes({
      bytes,
      mime: file.type || mimeFromFilename(file.name),
      name: file.name,
      source: options?.source,
      imageCount: options?.imageCount,
      target: options?.target,
    });
  }, [handleImportSourceImageBytes]);

  const buildDirectorSourceItem = useCallback(async (args: { dataUrl: string; name?: string }) => {
    let imageSize: { width: number; height: number } = {
      width: DEFAULT_PRO_IMAGE_SETTINGS.width,
      height: DEFAULT_PRO_IMAGE_SETTINGS.height,
    };
    try {
      const resolvedSize = await readImageSize(args.dataUrl);
      imageSize = resolvedSize;
    }
    catch {
      // 保持默认尺寸兜底。
    }

    return {
      dataUrl: args.dataUrl,
      seed: -1,
      width: imageSize.width,
      height: imageSize.height,
      model,
      batchId: makeStableId(),
      batchIndex: 0,
      batchSize: 1,
      toolLabel: args.name,
    } satisfies GeneratedImageItem;
  }, [model]);

  const handlePickDirectorSourceImages = useCallback(async (files: FileList | File[]) => {
    const fileList = Array.from(files).filter(file => file.type.startsWith("image/") || file.name);
    if (!fileList.length) {
      showErrorToast("请先导入图片文件。");
      return;
    }

    const importedItems: GeneratedImageItem[] = [];
    for (const file of fileList) {
      const bytes = await readFileAsBytes(file);
      const mime = file.type || mimeFromFilename(file.name);
      const dataUrl = base64DataUrl(mime, bytes);
      importedItems.push(await buildDirectorSourceItem({
        dataUrl,
        name: file.name,
      }));
    }

    if (!importedItems.length)
      return;

    setDirectorSourceItems(prev => [...importedItems, ...prev]);
    setDirectorSourcePreview(importedItems[0]);
    setDirectorOutputPreview(null);
  }, [buildDirectorSourceItem, showErrorToast]);

  const handlePickDirectorSourceHistoryImage = useCallback(async (payload: InternalHistoryImageDragPayload) => {
    const item = await buildDirectorSourceItem({
      dataUrl: payload.dataUrl,
      name: payload.name,
    });
    setDirectorSourceItems(prev => [item, ...prev]);
    setDirectorSourcePreview(item);
    setDirectorOutputPreview(null);
  }, [buildDirectorSourceItem]);

  const handlePickSourceHistoryImage = useCallback(async (
    payload: InternalHistoryImageDragPayload,
    options?: { source?: ImageImportSource; imageCount?: number },
  ) => {
    const imageBase64 = dataUrlToBase64(payload.dataUrl);
    if (!imageBase64) {
      setIsPageImageDragOver(false);
      showErrorToast("拖拽历史图片失败：未读取到图片数据。");
      return;
    }

    await handleImportSourceImageBytes({
      bytes: base64ToBytes(imageBase64),
      mime: mimeFromDataUrl(payload.dataUrl),
      name: payload.name,
      source: options?.source,
      imageCount: options?.imageCount,
    });
  }, [handleImportSourceImageBytes, showErrorToast]);

  const handleHistoryImageDragStart = useCallback((
    event: DragEvent<HTMLElement>,
    payload: { dataUrl: string; seed: number; batchIndex?: number },
  ) => {
    const fileName = historyImageDragFileName(payload.dataUrl, payload.seed, payload.batchIndex);
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData(INTERNAL_HISTORY_IMAGE_DRAG_MIME, JSON.stringify({
      dataUrl: payload.dataUrl,
      name: fileName,
    } satisfies InternalHistoryImageDragPayload));
    event.dataTransfer.setData("text/plain", fileName);

    try {
      event.dataTransfer.items.add(fileFromDataUrl(payload.dataUrl, fileName));
    }
    catch (error) {
      console.warn("[ai-image] failed to attach dragged history image file", error);
    }
  }, []);

  const handlePageImageDragEnter = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (isDirectorToolsOpen)
      return;
    const nextIsImageDrag = hasFileDrag(event.dataTransfer) || hasInternalHistoryImageDrag(event.dataTransfer);
    if (!nextIsImageDrag)
      return;
    event.preventDefault();
    event.stopPropagation();
    setIsPageImageDragOver(nextIsImageDrag);
  }, [isDirectorToolsOpen]);

  const handlePageImageDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (isDirectorToolsOpen)
      return;
    event.preventDefault();
    event.stopPropagation();
    if (!event.currentTarget.contains(event.relatedTarget as Node | null))
      setIsPageImageDragOver(false);
  }, [isDirectorToolsOpen]);

  const handlePageImageDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (isDirectorToolsOpen)
      return;
    const nextIsImageDrag = hasFileDrag(event.dataTransfer) || hasInternalHistoryImageDrag(event.dataTransfer);
    if (!nextIsImageDrag)
      return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
    if (nextIsImageDrag !== isPageImageDragOver)
      setIsPageImageDragOver(nextIsImageDrag);
  }, [isDirectorToolsOpen, isPageImageDragOver]);

  const handlePageImageDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (isDirectorToolsOpen)
      return;
    const hasImportableDrag = hasFileDrag(event.dataTransfer) || hasInternalHistoryImageDrag(event.dataTransfer);
    if (!hasImportableDrag)
      return;
    event.preventDefault();
    event.stopPropagation();
    const internalPayload = extractInternalHistoryImageDragPayload(event.dataTransfer);
    if (internalPayload) {
      setIsPageImageDragOver(false);
      void handlePickSourceHistoryImage(internalPayload, { source: "drop", imageCount: 1 });
      return;
    }
    const files = extractImageFilesFromTransfer(event.dataTransfer);
    if (!files.length) {
      setIsPageImageDragOver(false);
      showErrorToast("拖拽导入目前只支持图片文件。");
      return;
    }
    setIsPageImageDragOver(false);
    void handlePickSourceImage(files[0], { source: "drop", imageCount: files.length });
  }, [handlePickSourceHistoryImage, handlePickSourceImage, isDirectorToolsOpen, showErrorToast]);

  useEffect(() => {
    if (typeof document === "undefined")
      return;

    const onPaste = (event: ClipboardEvent) => {
      const files = extractImageFilesFromTransfer(event.clipboardData);
      if (!files.length)
        return;

      event.preventDefault();
      void handlePickSourceImage(files[0], { source: "paste", imageCount: files.length });
    };

    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [handlePickSourceImage]);

  const handleClearSourceImage = useCallback(() => {
    clearSourceImageForUi(uiMode);
    setIsPageImageDragOver(false);
    if (uiMode === "pro")
      setProFeatureSectionOpen("baseImage", true);
  }, [clearSourceImageForUi, setProFeatureSectionOpen, uiMode]);

  const handleOpenSourceImagePicker = useCallback(() => {
    sourceFileInputRef.current?.click();
  }, []);

  const handleCloseMetadataImportDialog = useCallback(() => {
    setPendingMetadataImport(null);
    setMetadataImportSelection(DEFAULT_METADATA_IMPORT_SELECTION);
  }, []);

  const handleImportSourceImageTarget = useCallback((target: "img2img" | "vibe" | "precise") => {
    if (!pendingMetadataImport)
      return;

    if (target === "img2img") {
      applySourceImageForUi(uiMode, pendingMetadataImport.sourceImage, "已设置 Base Img。");
    }

    setPendingMetadataImport(null);
    setMetadataImportSelection(DEFAULT_METADATA_IMPORT_SELECTION);
  }, [applySourceImageForUi, pendingMetadataImport, uiMode]);

  const handleConfirmMetadataImport = useCallback(() => {
    const pendingMetadata = pendingMetadataImport?.metadata;
    if (!pendingMetadata)
      return;

    const hasAnySelection = metadataImportSelection.prompt
      || metadataImportSelection.undesiredContent
      || metadataImportSelection.characters
      || metadataImportSelection.settings
      || metadataImportSelection.seed;
    if (!hasAnySelection)
      return;

    applyImportedMetadata(pendingMetadata, metadataImportSelection);
    setPendingMetadataImport(null);
    setMetadataImportSelection(DEFAULT_METADATA_IMPORT_SELECTION);
  }, [applyImportedMetadata, metadataImportSelection, pendingMetadataImport]);

  const handlePickVibeReferences = useCallback(async (files: FileList | File[]) => {
    void files;
    showErrorToast(getNovelAiFreeOnlyMessage("Vibe Transfer 已禁用。"));
    setProFeatureSectionOpen("vibeTransfer", true);
  }, [setProFeatureSectionOpen, showErrorToast]);

  const handlePickPreciseReference = useCallback(async (file: File) => {
    void file;
    showErrorToast(getNovelAiFreeOnlyMessage("Precise Reference 已禁用。"));
    setProFeatureSectionOpen("preciseReference", true);
  }, [setProFeatureSectionOpen, showErrorToast]);

  const handleClearHistory = useCallback(async () => {
    await clearAiImageHistory();
    setSelectedHistoryPreviewKey(null);
    await refreshHistory();
  }, [refreshHistory]);

  const applySelectedPreviewAsBaseImage = useCallback((showToast = false) => {
    if (!selectedPreviewResult)
      return false;

    const sourceImage = buildImportedSourceImagePayloadFromDataUrl({
      dataUrl: selectedPreviewResult.dataUrl,
      width: selectedPreviewResult.width,
      height: selectedPreviewResult.height,
    });
    if (!sourceImage) {
      showErrorToast("当前预览图片读取失败，无法设置为 Base Img。");
      return false;
    }

    applySourceImageForUi(uiMode, sourceImage);
    if (showToast)
      showSuccessToast("已把当前预览设置为 Base Img。");
    return true;
  }, [applySourceImageForUi, selectedPreviewResult, showErrorToast, showSuccessToast, uiMode]);

  const handleUseSelectedResultAsBaseImage = useCallback(() => {
    void applySelectedPreviewAsBaseImage(true);
  }, [applySelectedPreviewAsBaseImage]);

  const handleSelectDirectorSourceItem = useCallback((item: GeneratedImageItem) => {
    setDirectorSourcePreview(item);
    setDirectorOutputPreview(null);
  }, []);

  const handleRemoveDirectorSourceItem = useCallback((item: GeneratedImageItem) => {
    const targetKey = generatedItemKey(item);
    setDirectorSourceItems((prev) => {
      const nextItems = prev.filter(entry => generatedItemKey(entry) !== targetKey);
      setDirectorSourcePreview((prevPreview) => {
        if (!prevPreview || generatedItemKey(prevPreview) !== targetKey)
          return prevPreview;
        return nextItems[0] ?? null;
      });
      return nextItems;
    });
  }, []);

  const handleDirectorImageDragEnter = useCallback((event: DragEvent<HTMLDivElement>) => {
    const nextIsImageDrag = hasFileDrag(event.dataTransfer) || hasInternalHistoryImageDrag(event.dataTransfer);
    if (!nextIsImageDrag)
      return;
    event.preventDefault();
    event.stopPropagation();
    setIsDirectorImageDragOver(true);
  }, []);

  const handleDirectorImageDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!event.currentTarget.contains(event.relatedTarget as Node | null))
      setIsDirectorImageDragOver(false);
  }, []);

  const handleDirectorImageDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    const nextIsImageDrag = hasFileDrag(event.dataTransfer) || hasInternalHistoryImageDrag(event.dataTransfer);
    if (!nextIsImageDrag)
      return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
    if (!isDirectorImageDragOver)
      setIsDirectorImageDragOver(true);
  }, [isDirectorImageDragOver]);

  const handleDirectorImageDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    const hasImportableDrag = hasFileDrag(event.dataTransfer) || hasInternalHistoryImageDrag(event.dataTransfer);
    if (!hasImportableDrag)
      return;
    event.preventDefault();
    event.stopPropagation();

    const internalPayload = extractInternalHistoryImageDragPayload(event.dataTransfer);
    if (internalPayload) {
      setIsDirectorImageDragOver(false);
      void handlePickDirectorSourceHistoryImage(internalPayload);
      return;
    }

    const files = extractImageFilesFromTransfer(event.dataTransfer);
    if (!files.length) {
      setIsDirectorImageDragOver(false);
      showErrorToast("拖拽导入目前只支持图片文件。");
      return;
    }

    setIsDirectorImageDragOver(false);
    void handlePickDirectorSourceImages(files);
  }, [handlePickDirectorSourceHistoryImage, handlePickDirectorSourceImages, showErrorToast]);

  const handleSyncDirectorSourceFromCurrentPreview = useCallback(() => {
    if (!selectedPreviewResult)
      return;
    setDirectorSourcePreview(selectedPreviewResult);
    setDirectorOutputPreview(null);
    showSuccessToast("已把当前预览同步为导演工具输入图。");
  }, [selectedPreviewResult, showSuccessToast]);

  const handleToggleDirectorTools = useCallback(() => {
    setIsDirectorToolsOpen((prev) => {
      const nextOpen = !prev;
      if (nextOpen && !directorSourcePreview && selectedPreviewResult) {
        setDirectorSourcePreview(selectedPreviewResult);
        setDirectorOutputPreview(null);
      }
      return nextOpen;
    });
  }, [directorSourcePreview, selectedPreviewResult]);

  const handleRunUpscale = useCallback(async () => {
    if (!selectedPreviewResult)
      return;

    showErrorToast(getNovelAiFreeOnlyMessage("Upscale 已禁用。"));
  }, [selectedPreviewResult, showErrorToast]);

  const handleRunDirectorTool = useCallback(async () => {
    if (!directorInputPreview || !directorTool)
      return;

    if (isDirectorToolDisabled(activeDirectorTool)) {
      showErrorToast("Remove BG 已禁用。");
      return;
    }

    const imageBase64 = dataUrlToBase64(directorInputPreview.dataUrl);
    if (!imageBase64) {
      showErrorToast("导演工具输入图读取失败。");
      return;
    }

    setError("");
    setPendingPreviewAction(activeDirectorTool);
    setDirectorOutputPreview(null);

    try {
      const response = await augmentNovelImageViaProxy({
        requestType: directorTool.requestType,
        imageBase64,
        width: directorInputPreview.width,
        height: directorInputPreview.height,
        prompt: directorTool.parameterMode === "colorize"
          ? directorColorizePrompt
          : directorTool.parameterMode === "emotion"
            ? directorEmotionExtraPrompt
            : undefined,
        defry: directorTool.parameterMode === "colorize"
          ? directorColorizeDefry
          : directorTool.parameterMode === "emotion"
            ? directorEmotionDefry
            : undefined,
        emotion: directorTool.parameterMode === "emotion" ? directorEmotion : undefined,
      });
      const nextDataUrl = response.dataUrls[0];
      if (!nextDataUrl)
        throw new Error("Director Tools 没有返回图像。");

      let nextSize = {
        width: directorInputPreview.width,
        height: directorInputPreview.height,
      };
      try {
        nextSize = await readImageSize(nextDataUrl);
      }
      catch {
        // 读取返回图尺寸失败时沿用输入图尺寸。
      }

      const nextOutput = {
        dataUrl: nextDataUrl,
        seed: -1,
        width: nextSize.width,
        height: nextSize.height,
        model: directorInputPreview.model || model,
        batchId: makeStableId(),
        batchIndex: 0,
        batchSize: 1,
        toolLabel: directorTool.label,
      } satisfies GeneratedImageItem;

      setDirectorOutputPreview(nextOutput);
      setResults([nextOutput]);
      setSelectedResultIndex(0);
      setSelectedHistoryPreviewKey(null);
      showSuccessToast(`${directorTool.label} 已完成。`);
    }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setError(message);
      showErrorToast(message);
    }
    finally {
      setPendingPreviewAction("");
    }
  }, [
    activeDirectorTool,
    directorColorizeDefry,
    directorColorizePrompt,
    directorEmotion,
    directorEmotionDefry,
    directorEmotionExtraPrompt,
    directorInputPreview,
    directorTool,
    model,
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
    toolLabel?: string;
  }) => {
    const effectiveMode = args?.mode ?? mode;
    const basePrompt = String(args?.prompt ?? (uiMode === "simple" ? simplePrompt : prompt)).trim();
    const baseNegative = String(args?.negativePrompt ?? (uiMode === "simple" ? simpleNegativePrompt : negativePrompt));
    const mergeStyleTags = uiMode === "simple" && effectiveMode === "txt2img";
    const effectiveImageCount = NOVELAI_FREE_FIXED_IMAGE_COUNT;
    const effectivePrompt = mergeStyleTags ? mergeTagString(basePrompt, activeStyleTags).trim() : basePrompt;
    const effectiveNegative = mergeStyleTags ? mergeTagString(baseNegative, activeStyleNegativeTags) : baseNegative;
    const effectiveWidth = args?.width ?? width;
    const effectiveHeight = args?.height ?? height;
    const effectiveStrength = args?.strength ?? strength;
    const usesSourceImage = effectiveMode === "img2img" || effectiveMode === "infill";
    const effectiveSourceImageBase64 = args?.sourceImageBase64 ?? (usesSourceImage ? sourceImageBase64 : undefined);
    const effectiveSourceImageDataUrl = args?.sourceImageDataUrl ?? (usesSourceImage ? sourceImageDataUrl : undefined);
    const effectiveSourceImageWidth = args?.sourceImageWidth ?? (usesSourceImage ? sourceImageSize?.width : undefined);
    const effectiveSourceImageHeight = args?.sourceImageHeight ?? (usesSourceImage ? sourceImageSize?.height : undefined);
    const effectiveMaskBase64 = args?.maskBase64 ?? (effectiveMode === "infill" ? resolveInfillMaskBase64ForUi(uiMode) : undefined);
    const v4CharsPayload = isNAI4 && uiMode === "pro" ? v4Chars.map(({ id, gender, ...rest }) => rest) : undefined;
    const v4UseCoordsPayload = uiMode === "pro" ? v4UseCoords : undefined;
    const v4UseOrderPayload = uiMode === "pro" ? v4UseOrder : undefined;
    const resolvedVibeTransferReferences = uiMode === "pro" && isNAI4
      ? (normalizeReferenceStrengths ? normalizeReferenceStrengthRows(vibeTransferReferences) : vibeTransferReferences)
      : [];
    const vibeTransferPayload = uiMode === "pro" && isNAI4
      ? resolvedVibeTransferReferences.map(({ id, dataUrl, name, lockInformationExtracted, ...rest }) => rest)
      : undefined;
    const preciseReferencePayload = uiMode === "pro" && isNAI4 && preciseReference
      ? {
          imageBase64: preciseReference.imageBase64,
          strength: preciseReference.strength,
          informationExtracted: preciseReference.informationExtracted,
        }
      : null;

    setError("");
    setLoading(true);
    try {
      if (mergeStyleTags) {
        if (effectivePrompt !== basePrompt)
          setSimplePrompt(effectivePrompt);
        if (effectiveNegative !== baseNegative)
          setSimpleNegativePrompt(effectiveNegative);
      }

      const freeViolation = getNovelAiFreeGenerationViolation({
        mode: effectiveMode,
        width: effectiveWidth,
        height: effectiveHeight,
        imageCount: effectiveImageCount,
        steps,
        sourceImageBase64: effectiveSourceImageBase64,
        sourceImageWidth: effectiveSourceImageWidth,
        sourceImageHeight: effectiveSourceImageHeight,
        maskBase64: effectiveMaskBase64,
        vibeTransferReferenceCount: resolvedVibeTransferReferences.length,
        hasPreciseReference: Boolean(preciseReferencePayload),
      });
      if (freeViolation)
        throw new Error(freeViolation);

      const seedInput = Number(seed);
      const seedValue = Number.isFinite(seedInput) && seedInput >= 0 ? Math.floor(seedInput) : undefined;
      const res = await generateNovelImageViaProxy({
        mode: effectiveMode,
        sourceImageBase64: effectiveSourceImageBase64,
        sourceImageWidth: effectiveSourceImageWidth,
        sourceImageHeight: effectiveSourceImageHeight,
        maskBase64: effectiveMaskBase64,
        strength: effectiveStrength,
        noise,
        prompt: effectivePrompt,
        negativePrompt: effectiveNegative,
        v4Chars: v4CharsPayload,
        v4UseCoords: v4UseCoordsPayload,
        v4UseOrder: v4UseOrderPayload,
        vibeTransferReferences: vibeTransferPayload,
        preciseReference: preciseReferencePayload,
        model,
        width: effectiveWidth,
        height: effectiveHeight,
        imageCount: effectiveImageCount,
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

      const batchId = makeStableId();
      const generatedItems = res.dataUrls.map((dataUrl, batchIndex) => {
        return {
          dataUrl,
          seed: res.seed,
          width: res.width,
          height: res.height,
          model: res.model,
          batchId,
          batchIndex,
          batchSize: res.dataUrls.length,
          toolLabel: args?.toolLabel,
        } satisfies GeneratedImageItem;
      });

      setResults(generatedItems);
      setSelectedResultIndex(0);
      setSelectedHistoryPreviewKey(null);
      if (uiMode === "simple")
        setSimpleSeed(seedValue == null ? DEFAULT_SIMPLE_IMAGE_SETTINGS.seed : res.seed);
      else
        setProSeed(seedValue == null ? DEFAULT_PRO_IMAGE_SETTINGS.seed : res.seed);
      await addAiImageHistoryBatch(generatedItems.map(item => ({
        createdAt: Date.now(),
        mode: effectiveMode,
        model: res.model,
        seed: res.seed,
        width: res.width,
        height: res.height,
        prompt: effectivePrompt,
        negativePrompt: effectiveNegative,
        imageCount: effectiveImageCount,
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
        strength: effectiveStrength,
        noise,
        v4Chars: v4CharsPayload,
        v4UseCoords: v4UseCoordsPayload ?? false,
        v4UseOrder: v4UseOrderPayload ?? true,
        referenceImages: resolvedVibeTransferReferences.map(({ imageBase64, id, lockInformationExtracted, ...ref }) => ref),
        preciseReference: preciseReference
          ? {
              name: preciseReference.name,
              dataUrl: preciseReference.dataUrl,
              strength: preciseReference.strength,
              informationExtracted: preciseReference.informationExtracted,
            }
          : null,
        dataUrl: item.dataUrl,
        toolLabel: args?.toolLabel,
        sourceDataUrl: effectiveMode === "img2img" || effectiveMode === "infill" ? effectiveSourceImageDataUrl : undefined,
        batchId,
        batchIndex: item.batchIndex,
        batchSize: item.batchSize,
      })));
      await refreshHistory();
      return true;
    }
    catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (effectiveMode === "infill")
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
    noise,
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
    simpleNegativePrompt,
    simplePrompt,
    sourceImageSize,
    smea,
    smeaDyn,
    sourceImageBase64,
    sourceImageDataUrl,
    steps,
    strength,
    ucPreset,
    uiMode,
    v4Chars,
    vibeTransferReferences,
    v4UseCoords,
    v4UseOrder,
    width,
    normalizeReferenceStrengths,
    resolveInfillMaskBase64ForUi,
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
      showErrorToast("当前预览图片读取失败，无法启动 Inpaint。");
      return;
    }

    setError("");
    setInpaintDialogSource({
      dataUrl: preview.dataUrl,
      imageBase64: sourceImageBase64,
      maskDataUrl: shouldSyncBaseImage ? "" : infillMaskDataUrl,
      width: preview.width,
      height: preview.height,
      seed: preview.seed,
      model: preview.model,
      mode: uiMode,
      prompt: selectedPreviewHistoryRow?.prompt || (uiMode === "simple" ? simplePrompt : prompt),
      negativePrompt: selectedPreviewHistoryRow?.negativePrompt || (uiMode === "simple" ? simpleNegativePrompt : negativePrompt),
      strength,
    });
  }, [applySelectedPreviewAsBaseImage, infillMaskDataUrl, negativePrompt, prompt, selectedPreviewHistoryRow, selectedPreviewResult, showErrorToast, simpleNegativePrompt, simplePrompt, sourceImageDataUrl, strength, uiMode]);

  const handleOpenBaseImageInpaint = useCallback(async () => {
    if (!sourceImageDataUrl)
      return;

    const sourceImageBase64 = dataUrlToBase64(sourceImageDataUrl);
    if (!sourceImageBase64) {
      showErrorToast("当前 Base Img 读取失败，无法启动 Inpaint。");
      return;
    }

    let sourceImageSize: { width: number; height: number } | null = null;
    try {
      sourceImageSize = await readImageSize(sourceImageDataUrl);
    }
    catch {
      // 读取失败时回退到当前画布尺寸。
    }

    setError("");
    setInpaintDialogSource({
      dataUrl: sourceImageDataUrl,
      imageBase64: sourceImageBase64,
      maskDataUrl: infillMaskDataUrl,
      width: sourceImageSize?.width ?? width,
      height: sourceImageSize?.height ?? height,
      seed,
      model,
      mode: uiMode,
      prompt: uiMode === "simple" ? simplePrompt : prompt,
      negativePrompt: uiMode === "simple" ? simpleNegativePrompt : negativePrompt,
      strength,
    });
  }, [height, infillMaskDataUrl, negativePrompt, model, prompt, seed, simpleNegativePrompt, simplePrompt, sourceImageDataUrl, showErrorToast, strength, uiMode, width]);

  const handleCloseInpaintDialog = useCallback(() => {
    if (loading)
      return;
    setError("");
    setInpaintDialogSource(null);
  }, [loading]);

  const handleSaveInpaintMask = useCallback((payload: InpaintSubmitPayload) => {
    if (!inpaintDialogSource)
      return;

    const nextStrength = clampRange(Number(payload.strength), 0.01, 1, 0.7);
    if (inpaintDialogSource.mode === "simple") {
      setSimpleEditorMode("tags");
      setSimplePromptTab("prompt");
      setSimpleImg2imgStrength(nextStrength);
      setSimpleInfillMaskDataUrl(payload.maskDataUrl);
    }
    else {
      setProImg2imgStrength(nextStrength);
      setProInfillMaskDataUrl(payload.maskDataUrl);
    }

    setError("");
    setModeForUi(inpaintDialogSource.mode, "infill");
    setInpaintDialogSource(null);
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
      showErrorToast("请先输入一行自然语言描述");
      return;
    }

    setSimpleConverting(true);
    try {
      const converted = await convertNaturalLanguageToNovelAiTags({ input: trimmed });
      const convertedWithStyles = {
        ...converted,
        prompt: mergeTagString(converted.prompt, activeStyleTags).trim(),
        negativePrompt: mergeTagString(converted.negativePrompt, activeStyleNegativeTags),
      };
      setSimpleConverted(convertedWithStyles);
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
    activeStyleNegativeTags,
    activeStyleTags,
    showErrorToast,
    simpleText,
  ]);

  const handleAcceptSimpleConverted = useCallback(() => {
    if (!simpleConverted?.prompt.trim()) {
      showErrorToast("转换结果为空：请重新转化后再试");
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
    if (!simplePrompt.trim() && !simpleNegativePrompt.trim()) {
      showErrorToast("当前没有可返回的 tags");
      return;
    }
    setSimpleConverted(null);
    setSimpleConvertedFromText(simpleText.trim());
    setSimpleEditorMode("tags");
    setSimplePromptTab("prompt");
  }, [showErrorToast, simpleNegativePrompt, simplePrompt, simpleText]);

  const handleSimpleGenerateFromTags = useCallback(async () => {
    const nextGenerateMode = resolveSimpleGenerateMode(mode);
    if (nextGenerateMode === "txt2img" && !simplePrompt.trim()) {
      showErrorToast("prompt 为空：请先补充 tags");
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
      showErrorToast("当前环境不支持复制图片到剪贴板。");
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
      showErrorToast("复制图片失败，请重试。");
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
    showErrorToast(getNovelAiFreeOnlyMessage("Upscale 已禁用。"));
  }, [directorInputPreview, showErrorToast]);

  const handleAddDirectorDisplayedToSourceRail = useCallback(() => {
    if (addDirectorImageToSourceRail(directorOutputPreview ?? selectedPreviewResult))
      showSuccessToast("已把当前右侧图片加入左侧栏。");
  }, [addDirectorImageToSourceRail, directorOutputPreview, selectedPreviewResult, showSuccessToast]);

  const handleCopyDirectorInputImage = useCallback(async () => {
    await copyGeneratedImageToClipboard(directorInputPreview, "已复制当前左侧图片。");
  }, [copyGeneratedImageToClipboard, directorInputPreview]);

  const handleCopyDirectorOutputImage = useCallback(async () => {
    await copyGeneratedImageToClipboard(directorOutputPreview ?? selectedPreviewResult, "已复制当前右侧图片。");
  }, [copyGeneratedImageToClipboard, directorOutputPreview, selectedPreviewResult]);

  const handleDownloadDirectorOutputImage = useCallback(() => {
    downloadGeneratedImage(directorOutputPreview ?? selectedPreviewResult, "nai_director");
  }, [directorOutputPreview, downloadGeneratedImage, selectedPreviewResult]);


  const handleClearPinnedPreview = useCallback(() => {
    if (!pinnedPreviewKey)
      return;
    setPinnedPreviewKey(null);
    showSuccessToast("已取消固定预览。");
  }, [pinnedPreviewKey, showSuccessToast]);

  const handleSelectPinnedPreview = useCallback(() => {
    if (!pinnedPreviewKey)
      return;

    if (pinnedPreviewKey.startsWith("current:")) {
      const currentKey = pinnedPreviewKey.slice("current:".length);
      const currentResultIndex = results.findIndex(item => generatedItemKey(item) === currentKey);
      if (currentResultIndex >= 0)
        handleSelectCurrentResult(currentResultIndex);
      return;
    }

    if (pinnedPreviewKey.startsWith("history:")) {
      const historyKey = pinnedPreviewKey.slice("history:".length);
      const historyRow = historyRowByKey.get(historyKey);
      if (historyRow)
        handlePreviewHistoryRow(historyRow);
    }
  }, [handlePreviewHistoryRow, handleSelectCurrentResult, historyRowByKey, pinnedPreviewKey, results]);

  const handleApplyPinnedPreviewSeed = useCallback(() => {
    if (!pinnedPreviewResult)
      return;
    if (uiMode === "simple")
      setSimpleSeed(pinnedPreviewResult.seed);
    else
      setProSeed(pinnedPreviewResult.seed);
    showSuccessToast("已把 pinned 预览 seed 回填到设置。");
  }, [pinnedPreviewResult, showSuccessToast, uiMode]);

  const handleApplyHistorySettings = useCallback((row: AiImageHistoryRow, clickMode: Exclude<HistoryRowClickMode, "preview">) => {
    const importSettings = clickMode === "settings" || clickMode === "settings-with-seed";
    const importSeed = clickMode === "seed" || clickMode === "settings-with-seed";
    setSelectedHistoryPreviewKey(historyRowKey(row));

    if (!importSettings) {
      if (importSeed)
        if (uiMode === "simple")
          setSimpleSeed(row.seed);
        else
          setProSeed(row.seed);
      if (importSeed)
        showSuccessToast("已导入历史 seed，其他设置保持当前值。");
      return;
    }

    const normalizedSize = getClosestValidImageSize(row.width, row.height);
    const restoredSourceImage = restoreSourceImageForUi(uiMode, {
      dataUrl: row.sourceDataUrl,
      name: `history_${row.seed}.${extensionFromDataUrl(row.sourceDataUrl || row.dataUrl)}`,
      width: row.width,
      height: row.height,
    });

    if (uiMode === "simple") {
      setSimpleText("");
      setSimpleConverted(null);
      setSimpleConvertedFromText("");
      setSimplePrompt(row.prompt);
      setSimpleNegativePrompt(row.negativePrompt);
      setSimpleEditorMode("tags");
      setSimplePromptTab("prompt");
      setSimpleWidth(normalizedSize.width);
      setSimpleHeight(normalizedSize.height);
      setSimpleResolutionSelection(inferResolutionSelection(normalizedSize.width, normalizedSize.height));
      setSimpleImg2imgStrength(clampRange(
        resolveImportedValue(row.strength, true, DEFAULT_SIMPLE_IMAGE_SETTINGS.strength) ?? DEFAULT_SIMPLE_IMAGE_SETTINGS.strength,
        0,
        1,
        DEFAULT_SIMPLE_IMAGE_SETTINGS.strength,
      ));
      setSimpleImg2imgNoise(clampRange(
        resolveImportedValue(row.noise, true, DEFAULT_SIMPLE_IMAGE_SETTINGS.noise) ?? DEFAULT_SIMPLE_IMAGE_SETTINGS.noise,
        0,
        1,
        DEFAULT_SIMPLE_IMAGE_SETTINGS.noise,
      ));
      if (importSeed)
        setSimpleSeed(row.seed);
      showSuccessToast([
        importSeed ? "已按快速模式回填轻量设置与 seed。" : "已按快速模式回填轻量设置。",
        restoredSourceImage && row.mode === "infill" ? "Inpaint 历史已按 Base Img 恢复。" : "",
        "高级项保持默认值。",
      ].filter(Boolean).join(" "));
      return;
    }

    const droppedPaidSettings = [
      row.referenceImages?.length ? "Vibe Transfer" : "",
      row.preciseReference ? "Precise Reference" : "",
      (row.imageCount ?? row.batchSize ?? 1) > NOVELAI_FREE_FIXED_IMAGE_COUNT ? "多张生成" : "",
      (row.steps ?? NOVELAI_FREE_MAX_STEPS) > NOVELAI_FREE_MAX_STEPS ? "高步数" : "",
      row.width > NOVELAI_FREE_MAX_DIMENSION || row.height > NOVELAI_FREE_MAX_DIMENSION ? "超尺寸" : "",
    ].filter(Boolean);

    if (!restoredSourceImage)
      clearSourceImageForUi("pro");
    setPrompt(row.prompt);
    setNegativePrompt(row.negativePrompt);
    setV4UseCoords(Boolean(row.v4UseCoords));
    setV4UseOrder(row.v4UseOrder == null ? true : Boolean(row.v4UseOrder));
    const restoredChars = Array.isArray(row.v4Chars)
      ? row.v4Chars.map((item) => {
          return {
            id: makeStableId(),
            prompt: String(item.prompt || ""),
            negativePrompt: String(item.negativePrompt || ""),
            centerX: clamp01(item.centerX, 0.5),
            centerY: clamp01(item.centerY, 0.5),
          };
        })
      : [];
    setV4Chars(restoredChars);
    setCharPromptTabs(
      restoredChars.reduce<Record<string, "prompt" | "negative">>((acc, item) => {
        acc[item.id] = "prompt";
        return acc;
      }, {}),
    );
    setVibeTransferReferences([]);
    setPreciseReference(null);
    setProFeatureSections(createProFeatureSectionState({
      baseImage: restoredSourceImage,
      characterPrompts: restoredChars.length > 0 ? true : DEFAULT_PRO_FEATURE_SECTION_OPEN.characterPrompts,
      vibeTransfer: false,
      preciseReference: false,
    }));
    if (importSeed)
      setProSeed(row.seed);
    setProWidth(normalizedSize.width);
    setProHeight(normalizedSize.height);
    setProResolutionSelection(inferResolutionSelection(normalizedSize.width, normalizedSize.height));
    setProImageCount(NOVELAI_FREE_FIXED_IMAGE_COUNT);
    setProSteps(clampIntRange(
      resolveImportedValue(row.steps, true, DEFAULT_PRO_IMAGE_SETTINGS.steps) ?? DEFAULT_PRO_IMAGE_SETTINGS.steps,
      1,
      NOVELAI_FREE_MAX_STEPS,
      DEFAULT_PRO_IMAGE_SETTINGS.steps,
    ));
    setProScale(clampRange(
      resolveImportedValue(row.scale, true, DEFAULT_PRO_IMAGE_SETTINGS.scale) ?? DEFAULT_PRO_IMAGE_SETTINGS.scale,
      0,
      20,
      DEFAULT_PRO_IMAGE_SETTINGS.scale,
    ));
    setProSampler(row.sampler || samplerOptions[0] || DEFAULT_PRO_IMAGE_SETTINGS.sampler);
    setProNoiseSchedule(row.noiseSchedule || noiseScheduleOptions[0] || DEFAULT_PRO_IMAGE_SETTINGS.noiseSchedule);
    setProCfgRescale(clampRange(
      resolveImportedValue(row.cfgRescale, true, DEFAULT_PRO_IMAGE_SETTINGS.cfgRescale) ?? DEFAULT_PRO_IMAGE_SETTINGS.cfgRescale,
      0,
      1,
      DEFAULT_PRO_IMAGE_SETTINGS.cfgRescale,
    ));
    setProUcPreset(clampIntRange(
      resolveImportedValue(row.ucPreset, true, DEFAULT_PRO_IMAGE_SETTINGS.ucPreset) ?? DEFAULT_PRO_IMAGE_SETTINGS.ucPreset,
      0,
      2,
      DEFAULT_PRO_IMAGE_SETTINGS.ucPreset,
    ));
    setProQualityToggle(resolveImportedValue(row.qualityToggle, true, DEFAULT_PRO_IMAGE_SETTINGS.qualityToggle) ?? DEFAULT_PRO_IMAGE_SETTINGS.qualityToggle);
    setProDynamicThresholding(resolveImportedValue(row.dynamicThresholding, true, DEFAULT_PRO_IMAGE_SETTINGS.dynamicThresholding) ?? DEFAULT_PRO_IMAGE_SETTINGS.dynamicThresholding);
    setProSmea(resolveImportedValue(row.smea, true, DEFAULT_PRO_IMAGE_SETTINGS.smea) ?? DEFAULT_PRO_IMAGE_SETTINGS.smea);
    setProSmeaDyn(resolveImportedValue(row.smeaDyn, true, DEFAULT_PRO_IMAGE_SETTINGS.smeaDyn) ?? DEFAULT_PRO_IMAGE_SETTINGS.smeaDyn);
    setProImg2imgStrength(clampRange(
      resolveImportedValue(row.strength, true, DEFAULT_PRO_IMAGE_SETTINGS.strength) ?? DEFAULT_PRO_IMAGE_SETTINGS.strength,
      0,
      1,
      DEFAULT_PRO_IMAGE_SETTINGS.strength,
    ));
    setProImg2imgNoise(clampRange(
      resolveImportedValue(row.noise, true, DEFAULT_PRO_IMAGE_SETTINGS.noise) ?? DEFAULT_PRO_IMAGE_SETTINGS.noise,
      0,
      1,
      DEFAULT_PRO_IMAGE_SETTINGS.noise,
    ));
    showSuccessToast([
      importSeed ? "已导入历史设置与 seed。" : "已导入历史设置，seed 保持当前值。",
      restoredSourceImage && row.mode === "infill" ? "Inpaint 历史已按 Base Img 恢复。" : "",
      droppedPaidSettings.length ? `已自动忽略会消耗 Anlas 的项：${droppedPaidSettings.join(" / ")}。` : "",
    ].filter(Boolean).join(" "));
  }, [clearSourceImageForUi, inferResolutionSelection, noiseScheduleOptions, restoreSourceImageForUi, samplerOptions, showSuccessToast, uiMode]);

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
    downloadGeneratedImage(selectedPreviewResult, "nai");
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
    setSimpleSeed(DEFAULT_SIMPLE_IMAGE_SETTINGS.seed);
    setSimpleResolutionSelection(DEFAULT_SIMPLE_IMAGE_SETTINGS.simpleResolutionSelection);
    setSelectedStyleIds([]);
    setCompareStyleId(null);
    setStyleSelectionMode("select");
    setPendingMetadataImport(null);
    setMetadataImportSelection(DEFAULT_METADATA_IMPORT_SELECTION);
    setIsPageImageDragOver(false);
    showSuccessToast("已恢复快速模式默认状态。");
  }, [clearSourceImageForUi, showSuccessToast]);

  const handleClearActiveStyles = useCallback(() => {
    if (styleSelectionMode === "compare") {
      setCompareStyleId(null);
      return;
    }
    setSelectedStyleIds([]);
  }, [styleSelectionMode]);

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

  const activeResolutionPreset = useMemo(() => {
    return RESOLUTION_PRESETS.find(item => item.width === proWidth && item.height === proHeight) || null;
  }, [proHeight, proWidth]);
  const simpleResolutionArea = simpleWidth * simpleHeight;

  const handleSelectSimpleResolutionPreset = useCallback((selection: ResolutionSelection) => {
    if (selection === CUSTOM_RESOLUTION_ID) {
      setSimpleResolutionSelection(CUSTOM_RESOLUTION_ID);
      return;
    }
    const preset = RESOLUTION_PRESETS.find(item => item.id === selection);
    if (!preset)
      return;
    setSimpleResolutionSelection(preset.id);
    setSimpleWidth(preset.width);
    setSimpleHeight(preset.height);
    syncDimensionInputsForUi("simple", preset.width, preset.height);
  }, [syncDimensionInputsForUi]);

  const handleSelectProResolutionPreset = useCallback((selection: ResolutionSelection) => {
    if (selection === CUSTOM_RESOLUTION_ID) {
      setProResolutionSelection(CUSTOM_RESOLUTION_ID);
      return;
    }
    const preset = RESOLUTION_PRESETS.find(item => item.id === selection);
    if (!preset)
      return;
    setProResolutionSelection(preset.id);
    setProWidth(preset.width);
    setProHeight(preset.height);
    syncDimensionInputsForUi("pro", preset.width, preset.height);
  }, [syncDimensionInputsForUi]);

  const handleSimpleWidthChange = useCallback((value: string) => {
    setSimpleResolutionSelection(CUSTOM_RESOLUTION_ID);
    const trimmedValue = value.trim();
    setSimpleWidthInput(trimmedValue);
    if (!trimmedValue)
      return;
    const nextHeight = clampCustomDimensionInput(simpleHeight, DEFAULT_SIMPLE_IMAGE_SETTINGS.height);
    const nextWidth = clampCustomDimensionInput(trimmedValue, simpleWidth || DEFAULT_SIMPLE_IMAGE_SETTINGS.width);
    setSimpleWidth(nextWidth);
    setSimpleHeight(nextHeight);
    syncDimensionInputsForUi("simple", nextWidth, nextHeight);
  }, [clampCustomDimensionInput, simpleHeight, simpleWidth, syncDimensionInputsForUi]);

  const handleProWidthChange = useCallback((value: string) => {
    setProResolutionSelection(CUSTOM_RESOLUTION_ID);
    const trimmedValue = value.trim();
    setProWidthInput(trimmedValue);
    if (!trimmedValue)
      return;
    const nextHeight = clampCustomDimensionInput(proHeight, DEFAULT_PRO_IMAGE_SETTINGS.height);
    const nextWidth = clampCustomDimensionInput(trimmedValue, proWidth || DEFAULT_PRO_IMAGE_SETTINGS.width);
    setProWidth(nextWidth);
    setProHeight(nextHeight);
    syncDimensionInputsForUi("pro", nextWidth, nextHeight);
  }, [clampCustomDimensionInput, proHeight, proWidth, syncDimensionInputsForUi]);

  const handleSimpleHeightChange = useCallback((value: string) => {
    setSimpleResolutionSelection(CUSTOM_RESOLUTION_ID);
    const trimmedValue = value.trim();
    setSimpleHeightInput(trimmedValue);
    if (!trimmedValue)
      return;
    const nextWidth = clampCustomDimensionInput(simpleWidth, DEFAULT_SIMPLE_IMAGE_SETTINGS.width);
    const nextHeight = clampCustomDimensionInput(trimmedValue, simpleHeight || DEFAULT_SIMPLE_IMAGE_SETTINGS.height);
    setSimpleWidth(nextWidth);
    setSimpleHeight(nextHeight);
    syncDimensionInputsForUi("simple", nextWidth, nextHeight);
  }, [clampCustomDimensionInput, simpleHeight, simpleWidth, syncDimensionInputsForUi]);

  const handleProHeightChange = useCallback((value: string) => {
    setProResolutionSelection(CUSTOM_RESOLUTION_ID);
    const trimmedValue = value.trim();
    setProHeightInput(trimmedValue);
    if (!trimmedValue)
      return;
    const nextWidth = clampCustomDimensionInput(proWidth, DEFAULT_PRO_IMAGE_SETTINGS.width);
    const nextHeight = clampCustomDimensionInput(trimmedValue, proHeight || DEFAULT_PRO_IMAGE_SETTINGS.height);
    setProWidth(nextWidth);
    setProHeight(nextHeight);
    syncDimensionInputsForUi("pro", nextWidth, nextHeight);
  }, [clampCustomDimensionInput, proHeight, proWidth, syncDimensionInputsForUi]);

  const handleSwapImageDimensions = useCallback(() => {
    const nextWidth = clampCustomDimensionInput(proHeight, DEFAULT_PRO_IMAGE_SETTINGS.height);
    const nextHeight = clampCustomDimensionInput(proWidth, DEFAULT_PRO_IMAGE_SETTINGS.width);
    setProWidth(nextWidth);
    setProHeight(nextHeight);
    setProResolutionSelection(CUSTOM_RESOLUTION_ID);
    syncDimensionInputsForUi("pro", nextWidth, nextHeight);
  }, [clampCustomDimensionInput, proHeight, proWidth, syncDimensionInputsForUi]);

  const handleCropToClosestValidSize = useCallback(async () => {
    let targetWidth = proWidth;
    let targetHeight = proHeight;

    if (sourceImageDataUrl) {
      try {
        const sourceSize = await readImageSize(sourceImageDataUrl);
        targetWidth = sourceSize.width;
        targetHeight = sourceSize.height;
      }
      catch {
        // 读取源图尺寸失败时退回当前输入框数值。
      }
    }

    const normalizedSize = getClosestValidImageSize(targetWidth, targetHeight);
    setProWidth(normalizedSize.width);
    setProHeight(normalizedSize.height);
    setProResolutionSelection(inferResolutionSelection(normalizedSize.width, normalizedSize.height));
    syncDimensionInputsForUi("pro", normalizedSize.width, normalizedSize.height);
    showSuccessToast(sourceImageDataUrl ? "已按 Base Img 裁到最近合法尺寸。" : "已把当前尺寸裁到最近合法尺寸。");
  }, [inferResolutionSelection, proHeight, proWidth, showSuccessToast, sourceImageDataUrl, syncDimensionInputsForUi]);

  const handleResetCurrentImageSettings = useCallback(() => {
    if (uiMode === "simple") {
      setSimpleWidth(DEFAULT_SIMPLE_IMAGE_SETTINGS.width);
      setSimpleHeight(DEFAULT_SIMPLE_IMAGE_SETTINGS.height);
      setSimpleImg2imgStrength(DEFAULT_SIMPLE_IMAGE_SETTINGS.strength);
      setSimpleImg2imgNoise(DEFAULT_SIMPLE_IMAGE_SETTINGS.noise);
      setSimpleSeed(DEFAULT_SIMPLE_IMAGE_SETTINGS.seed);
      setSimpleResolutionSelection(DEFAULT_SIMPLE_IMAGE_SETTINGS.simpleResolutionSelection);
      syncDimensionInputsForUi("simple", DEFAULT_SIMPLE_IMAGE_SETTINGS.width, DEFAULT_SIMPLE_IMAGE_SETTINGS.height);
      showSuccessToast("已重置快速模式图像设置。");
      return;
    }

    setProWidth(DEFAULT_PRO_IMAGE_SETTINGS.width);
    setProHeight(DEFAULT_PRO_IMAGE_SETTINGS.height);
    setProImageCount(DEFAULT_PRO_IMAGE_SETTINGS.imageCount);
    setProSteps(DEFAULT_PRO_IMAGE_SETTINGS.steps);
    setProScale(DEFAULT_PRO_IMAGE_SETTINGS.scale);
    setProSampler(DEFAULT_PRO_IMAGE_SETTINGS.sampler);
    setProNoiseSchedule(DEFAULT_PRO_IMAGE_SETTINGS.noiseSchedule);
    setProCfgRescale(DEFAULT_PRO_IMAGE_SETTINGS.cfgRescale);
    setProUcPreset(DEFAULT_PRO_IMAGE_SETTINGS.ucPreset);
    setProQualityToggle(DEFAULT_PRO_IMAGE_SETTINGS.qualityToggle);
    setProDynamicThresholding(DEFAULT_PRO_IMAGE_SETTINGS.dynamicThresholding);
    setProSmea(DEFAULT_PRO_IMAGE_SETTINGS.smea);
    setProSmeaDyn(DEFAULT_PRO_IMAGE_SETTINGS.smeaDyn);
    setProImg2imgStrength(DEFAULT_PRO_IMAGE_SETTINGS.strength);
    setProImg2imgNoise(DEFAULT_PRO_IMAGE_SETTINGS.noise);
    setProSeed(DEFAULT_PRO_IMAGE_SETTINGS.seed);
    setProResolutionSelection(DEFAULT_PRO_IMAGE_SETTINGS.simpleResolutionSelection);
    syncDimensionInputsForUi("pro", DEFAULT_PRO_IMAGE_SETTINGS.width, DEFAULT_PRO_IMAGE_SETTINGS.height);
    showSuccessToast("已重置当前图像设置。");
  }, [showSuccessToast, syncDimensionInputsForUi, uiMode]);

  const handleClearSeed = useCallback(() => {
    if (uiMode === "simple")
      setSimpleSeed(DEFAULT_SIMPLE_IMAGE_SETTINGS.seed);
    else
      setProSeed(DEFAULT_PRO_IMAGE_SETTINGS.seed);
  }, [uiMode]);

  const handleOpenPreviewImage = useCallback(() => {
    if (!selectedPreviewResult)
      return;
    setIsPreviewImageModalOpen(true);
  }, [selectedPreviewResult]);

  const handleTogglePinnedPreview = useCallback(() => {
    if (!selectedPreviewResult || !selectedPreviewIdentityKey)
      return;
    const nextPinnedKey = pinnedPreviewKey === selectedPreviewIdentityKey ? null : selectedPreviewIdentityKey;
    setPinnedPreviewKey(nextPinnedKey);
    showSuccessToast(nextPinnedKey ? "已固定当前预览。" : "已取消固定当前预览。");
  }, [pinnedPreviewKey, selectedPreviewIdentityKey, selectedPreviewResult, showSuccessToast]);

  const handleApplySelectedPreviewSeed = useCallback(() => {
    if (!selectedPreviewResult)
      return;
    if (uiMode === "simple")
      setSimpleSeed(selectedPreviewResult.seed);
    else
      setProSeed(selectedPreviewResult.seed);
    showSuccessToast("已把当前预览 seed 回填到设置。");
  }, [selectedPreviewResult, showSuccessToast, uiMode]);

  const handleCopySelectedPreviewImage = useCallback(async () => {
    await copyGeneratedImageToClipboard(selectedPreviewResult, "已复制当前图片。");
  }, [copyGeneratedImageToClipboard, selectedPreviewResult]);

  const setWidth = useCallback((value: number) => {
    if (uiMode === "simple") {
      setSimpleWidth(value);
      return;
    }
    setProWidth(value);
  }, [uiMode]);

  const setHeight = useCallback((value: number) => {
    if (uiMode === "simple") {
      setSimpleHeight(value);
      return;
    }
    setProHeight(value);
  }, [uiMode]);

  const setImageCount = useCallback((value: number) => {
    setProImageCount(value);
  }, []);

  const setSteps = useCallback((value: number) => {
    setProSteps(value);
  }, []);

  const setScale = useCallback((value: number) => {
    setProScale(value);
  }, []);

  const setSampler = useCallback((value: string) => {
    setProSampler(value);
  }, []);

  const setNoiseSchedule = useCallback((value: string) => {
    setProNoiseSchedule(value);
  }, []);

  const setCfgRescale = useCallback((value: number) => {
    setProCfgRescale(value);
  }, []);

  const setUcPreset = useCallback((value: number) => {
    setProUcPreset(value);
  }, []);

  const setQualityToggle = useCallback((value: boolean) => {
    setProQualityToggle(value);
  }, []);

  const setDynamicThresholding = useCallback((value: boolean) => {
    setProDynamicThresholding(value);
  }, []);

  const setSmea = useCallback((value: boolean) => {
    setProSmea(value);
  }, []);

  const setSmeaDyn = useCallback((value: boolean) => {
    setProSmeaDyn(value);
  }, []);

  const setStrength = useCallback((value: number) => {
    if (uiMode === "simple") {
      setSimpleImg2imgStrength(value);
      return;
    }
    setProImg2imgStrength(value);
  }, [uiMode]);

  const setNoise = useCallback((value: number) => {
    if (uiMode === "simple") {
      setSimpleImg2imgNoise(value);
      return;
    }
    setProImg2imgNoise(value);
  }, [uiMode]);

  const setSeed = useCallback((value: number) => {
    if (uiMode === "simple") {
      setSimpleSeed(value);
      return;
    }
    setProSeed(value);
  }, [uiMode]);

  const isBusy = loading || simpleConverting || Boolean(pendingPreviewAction);
  const freeGenerationViolation = getNovelAiFreeGenerationViolation({
    mode,
    width,
    height,
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
    ? "生成中..."
    : pendingPreviewAction
      ? `${PREVIEW_ACTION_LABELS[pendingPreviewAction]}中...`
      : "免费生成 1 张图像";
  const currentResultCards = useMemo(() => {
    return results.map((item, index) => {
      return {
        item,
        index,
        row: historyRowByResultMatchKey.get(generatedItemKey(item)) || null,
      };
    });
  }, [historyRowByResultMatchKey, results]);
  const currentHistoryRowKeys = useMemo(() => {
    return new Set(
      currentResultCards
        .map(card => (card.row ? historyRowKey(card.row) : null))
        .filter((value): value is string => Boolean(value)),
    );
  }, [currentResultCards]);
  const archivedHistoryRows = useMemo(() => {
    return history.filter(row => !currentHistoryRowKeys.has(historyRowKey(row)));
  }, [currentHistoryRowKeys, history]);
  const previewMeta = selectedPreviewResult
    ? [
        selectedPreviewResult.toolLabel || selectedPreviewHistoryRow?.toolLabel || "",
        `seed: ${selectedPreviewResult.seed}`,
        `${selectedPreviewResult.width}×${selectedPreviewResult.height}`,
      ].filter(Boolean).join(" · ")
    : "";
  const hasCurrentDisplayedImage = Boolean(selectedPreviewResult);
  const ucPresetEnabled = ucPreset !== 2;
  const seedIsRandom = !Number.isFinite(seed) || seed < 0;
  const fixedModelDescription = MODEL_DESCRIPTIONS[model] || "图像生成模型";
  const hasReferenceConflict = vibeTransferReferences.length > 0 && Boolean(preciseReference);
  // 对齐 NovelAI 当前入口行为：Vibe Transfer 与 Precise Reference 在 UI 上互斥，避免出现官方面板里不存在的参数组合。
  const canAddVibeReference = false;
  const baseImageDescription = "Base Img / img2img 仍禁用；局部重绘请从右侧预览工具条进入 Inpaint。";
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
  const canGenerateFromSimpleTags = canGenerate && (Boolean(simplePrompt.trim()) || simpleGenerateMode === "infill");
  const hasSimpleTagsDraft = Boolean(simplePrompt.trim() || simpleNegativePrompt.trim());
  const simpleConvertLabel = simpleConverting ? "转化中..." : loading || pendingPreviewAction ? "处理中..." : "转化为 tags";

  const sidebarProps = {
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
    dynamicThresholding,
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
    onImportSourceImageTarget: handleImportSourceImageTarget,
    onConfirmMetadataImport: handleConfirmMetadataImport,
  };

  const previewImageDialogProps = {
    isOpen: isPreviewImageModalOpen,
    selectedPreviewResult,
    selectedPreviewHistoryRow,
    onClose: () => setIsPreviewImageModalOpen(false),
    onDownloadCurrent: handleDownloadCurrent,
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
