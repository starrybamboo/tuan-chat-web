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
  const [simpleInfillStrength, setSimpleInfillStrength] = useState<number>(DEFAULT_INPAINT_STRENGTH);
  const [simpleInfillNoise, setSimpleInfillNoise] = useState<number>(DEFAULT_INPAINT_NOISE);
  const [proInfillStrength, setProInfillStrength] = useState<number>(DEFAULT_INPAINT_STRENGTH);
  const [proInfillNoise, setProInfillNoise] = useState<number>(DEFAULT_INPAINT_NOISE);

  const width = uiMode === "simple" ? simpleWidth : proWidth;
  const height = uiMode === "simple" ? simpleHeight : proHeight;
  const widthInput = uiMode === "simple" ? simpleWidthInput : proWidthInput;
  const heightInput = uiMode === "simple" ? simpleHeightInput : proHeightInput;
  const roundedRequestedSize = getClosestValidImageSize(width, height);
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
  const currentImg2imgStrength = uiMode === "simple" ? simpleImg2imgStrength : proImg2imgStrength;
  const currentImg2imgNoise = uiMode === "simple" ? simpleImg2imgNoise : proImg2imgNoise;
  const currentInfillStrength = uiMode === "simple" ? simpleInfillStrength : proInfillStrength;
  const currentInfillNoise = uiMode === "simple" ? simpleInfillNoise : proInfillNoise;
  const strength = mode === "infill" ? currentInfillStrength : currentImg2imgStrength;
  const noise = mode === "infill" ? currentInfillNoise : currentImg2imgNoise;
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
    return Math.max(1, numericValue);
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

  const commitRoundedDimensionsForUi = useCallback((targetUiMode: UiMode) => {
    if (targetUiMode === "simple") {
      if (!simpleWidthInput.trim() || !simpleHeightInput.trim())
        return;
      const rounded = getClosestValidImageSize(simpleWidth, simpleHeight);
      setSimpleWidth(rounded.width);
      setSimpleHeight(rounded.height);
      setSimpleResolutionSelection(inferResolutionSelection(rounded.width, rounded.height));
      syncDimensionInputsForUi("simple", rounded.width, rounded.height);
      return;
    }

    if (!proWidthInput.trim() || !proHeightInput.trim())
      return;
    const rounded = getClosestValidImageSize(proWidth, proHeight);
    setProWidth(rounded.width);
    setProHeight(rounded.height);
    setProResolutionSelection(inferResolutionSelection(rounded.width, rounded.height));
    syncDimensionInputsForUi("pro", rounded.width, rounded.height);
  }, [
    inferResolutionSelection,
    proHeight,
    proHeightInput,
    proWidth,
    proWidthInput,
    simpleHeight,
    simpleHeightInput,
    simpleWidth,
    simpleWidthInput,
    syncDimensionInputsForUi,
  ]);

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

  const resolveSeparatedInfillMaskBase64ForUi = useCallback(async (targetUiMode: UiMode) => {
    const dataUrl = targetUiMode === "simple" ? simpleInfillMaskDataUrl : proInfillMaskDataUrl;
    if (!dataUrl)
      return "";

    const pixels = await readImagePixels(dataUrl);
    const baseCanvas = document.createElement("canvas");
    baseCanvas.width = pixels.width;
    baseCanvas.height = pixels.height;
    const baseContext = baseCanvas.getContext("2d");
    if (!baseContext)
      throw new Error("Inpaint 蒙版处理失败。");

    // Inpaint 请求只发送独立的黑白 mask：圈内为白色重绘区，圈外为黑色保留区。
    const solidMask = buildSolidInpaintMaskGrid(pixels.data, pixels.width, pixels.height, {
      closeRadius: 3,
    });
    const maskBounds = findMaskGridBounds(solidMask, pixels.width, pixels.height);
    const requestMask = maskBounds
      ? buildRoundedRectMaskGrid(maskBounds, pixels.width, pixels.height, {
          padding: clampIntRange(Math.round(Math.max(maskBounds.width, maskBounds.height) * 0.18), 18, 72, 36),
          cornerRadius: clampIntRange(Math.round(Math.min(maskBounds.width, maskBounds.height) * 0.16), 12, 48, 24),
        })
      : solidMask;
    const imageData = baseContext.createImageData(pixels.width, pixels.height);
    imageData.data.set(renderMaskGridToRgba(requestMask));
    baseContext.putImageData(imageData, 0, 0);

    // 轻微扩张 + 羽化边缘，减少上游重绘时出现的方块灰边。
    const expandRadius = 4;
    const blurRadius = 4;
    const expandedCanvas = document.createElement("canvas");
    expandedCanvas.width = pixels.width;
    expandedCanvas.height = pixels.height;
    const expandedContext = expandedCanvas.getContext("2d");
    if (!expandedContext)
      throw new Error("Inpaint 蒙版扩张失败。");
    expandedContext.fillStyle = "#000";
    expandedContext.fillRect(0, 0, expandedCanvas.width, expandedCanvas.height);
    for (let offsetY = -expandRadius; offsetY <= expandRadius; offsetY += 1) {
      for (let offsetX = -expandRadius; offsetX <= expandRadius; offsetX += 1) {
        if (offsetX * offsetX + offsetY * offsetY > expandRadius * expandRadius)
          continue;
        expandedContext.drawImage(baseCanvas, offsetX, offsetY);
      }
    }

    const finalCanvas = document.createElement("canvas");
    finalCanvas.width = pixels.width;
    finalCanvas.height = pixels.height;
    const finalContext = finalCanvas.getContext("2d");
    if (!finalContext)
      throw new Error("Inpaint 蒙版羽化失败。");
    finalContext.fillStyle = "#000";
    finalContext.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
    if ("filter" in finalContext)
      finalContext.filter = `blur(${blurRadius}px)`;
    finalContext.drawImage(expandedCanvas, 0, 0);
    if ("filter" in finalContext)
      finalContext.filter = "none";

    return dataUrlToBase64(finalCanvas.toDataURL("image/png")) || "";
  }, [proInfillMaskDataUrl, simpleInfillMaskDataUrl]);

  const resolveBlendInfillMaskDataUrlForUi = useCallback(async (targetUiMode: UiMode) => {
    const dataUrl = targetUiMode === "simple" ? simpleInfillMaskDataUrl : proInfillMaskDataUrl;
    if (!dataUrl)
      return "";

    const pixels = await readImagePixels(dataUrl);
    const baseCanvas = document.createElement("canvas");
    baseCanvas.width = pixels.width;
    baseCanvas.height = pixels.height;
    const baseContext = baseCanvas.getContext("2d");
    if (!baseContext)
      throw new Error("Inpaint 混合蒙版处理失败。");

    const solidMask = buildSolidInpaintMaskGrid(pixels.data, pixels.width, pixels.height, {
      closeRadius: 1,
    });
    const maskBounds = findMaskGridBounds(solidMask, pixels.width, pixels.height);
    const insetRadius = maskBounds
      ? clampIntRange(Math.round(Math.min(maskBounds.width, maskBounds.height) * 0.04), 2, 12, 6)
      : 6;
    const blendMask = erodeMaskGrid(solidMask, pixels.width, pixels.height, insetRadius);
    const imageData = baseContext.createImageData(pixels.width, pixels.height);
    imageData.data.set(renderMaskGridToRgba(blendMask));
    baseContext.putImageData(imageData, 0, 0);

    const finalCanvas = document.createElement("canvas");
    finalCanvas.width = pixels.width;
    finalCanvas.height = pixels.height;
    const finalContext = finalCanvas.getContext("2d");
    if (!finalContext)
      throw new Error("Inpaint 混合蒙版羽化失败。");
    finalContext.fillStyle = "#000";
    finalContext.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
    if ("filter" in finalContext)
      finalContext.filter = "blur(2px)";
    finalContext.drawImage(baseCanvas, 0, 0);
    if ("filter" in finalContext)
      finalContext.filter = "none";

    return finalCanvas.toDataURL("image/png");
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

  const applyModeStrengthAndNoise = useCallback((targetUiMode: UiMode, targetMode: AiImageHistoryMode | undefined, nextStrength: number | undefined, nextNoise: number | undefined) => {
    const normalizedMode = targetMode === "infill" ? "infill" : "img2img";
    if (targetUiMode === "simple") {
      if (normalizedMode === "infill") {
        if (nextStrength != null)
          setSimpleInfillStrength(clampRange(nextStrength, 0.01, 1, DEFAULT_INPAINT_STRENGTH));
        if (nextNoise != null)
          setSimpleInfillNoise(clampRange(nextNoise, 0, 0.99, DEFAULT_INPAINT_NOISE));
        return;
      }
      if (nextStrength != null)
        setSimpleImg2imgStrength(clampRange(nextStrength, 0.01, 1, DEFAULT_SIMPLE_IMAGE_SETTINGS.strength));
      if (nextNoise != null)
        setSimpleImg2imgNoise(clampRange(nextNoise, 0, 0.99, DEFAULT_SIMPLE_IMAGE_SETTINGS.noise));
      return;
    }

    if (normalizedMode === "infill") {
      if (nextStrength != null)
        setProInfillStrength(clampRange(nextStrength, 0.01, 1, DEFAULT_INPAINT_STRENGTH));
      if (nextNoise != null)
        setProInfillNoise(clampRange(nextNoise, 0, 0.99, DEFAULT_INPAINT_NOISE));
      return;
    }

    if (nextStrength != null)
      setProImg2imgStrength(clampRange(nextStrength, 0.01, 1, DEFAULT_PRO_IMAGE_SETTINGS.strength));
    if (nextNoise != null)
      setProImg2imgNoise(clampRange(nextNoise, 0, 0.99, DEFAULT_PRO_IMAGE_SETTINGS.noise));
  }, []);

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

  const handleImportSourceImageBytes = useCallback(async (args: {
    bytes: Uint8Array;
    mime: string;
    name: string;
    source?: ImageImportSource;
    imageCount?: number;
    target?: "img2img";
  }) => {
    await importSourceImageBytesAction({
      bytes: args.bytes,
      mime: args.mime,
      name: args.name,
      source: args.source,
      imageCount: args.imageCount,
      target: args.target,
      uiMode,
      setError,
      setIsPageImageDragOver,
      readImageSize,
      applySourceImageForUi,
      setPendingMetadataImport,
      defaultMetadataImportSelection: DEFAULT_METADATA_IMPORT_SELECTION,
      setMetadataImportSelection,
      extractNovelAiMetadataFromPngBytes,
      extractNovelAiMetadataFromStealthPixels,
      readImagePixels,
    });
  }, [applySourceImageForUi, uiMode]);
  const handlePickSourceImage = useCallback(async (
    file: File,
    options?: { source?: ImageImportSource; imageCount?: number; target?: "img2img" },
  ) => {
    await importSourceFileAction({
      file,
      options,
      importSourceImageBytes: handleImportSourceImageBytes,
    });
  }, [handleImportSourceImageBytes]);

  const buildDirectorSourceItem = useCallback(async (args: { dataUrl: string; name?: string }) => {
    return await buildDirectorSourceItemAction({
      dataUrl: args.dataUrl,
      name: args.name,
      model,
      readImageSize,
    });
  }, [model]);

  const handlePickDirectorSourceImages = useCallback(async (files: FileList | File[]) => {
    await pickDirectorSourceImagesAction({
      files,
      showErrorToast,
      model,
      readImageSize,
      setDirectorSourceItems,
      setDirectorSourcePreview,
      setDirectorOutputPreview,
    });
  }, [model, showErrorToast]);

  const handlePickDirectorSourceHistoryImage = useCallback(async (payload: InternalHistoryImageDragPayload) => {
    await pickDirectorSourceHistoryImageAction({
      payload,
      model,
      readImageSize,
      setDirectorSourceItems,
      setDirectorSourcePreview,
      setDirectorOutputPreview,
    });
  }, [model]);

  const handlePickSourceHistoryImage = useCallback(async (
    payload: InternalHistoryImageDragPayload,
    options?: { source?: ImageImportSource; imageCount?: number },
  ) => {
    await pickSourceHistoryImageAction({
      payload,
      options,
      setIsPageImageDragOver,
      showErrorToast,
      handleImportSourceImageBytes,
    });
  }, [handleImportSourceImageBytes, showErrorToast]);

  const handleHistoryImageDragStart = useCallback((
    event: DragEvent<HTMLElement>,
    payload: { dataUrl: string; seed: number; batchIndex?: number },
  ) => {
    historyImageDragStartAction({
      event: event as unknown as DragEvent,
      payload,
    });
  }, []);

  const handlePageImageDragEnter = useCallback((event: DragEvent<HTMLDivElement>) => {
    pageImageDragEnterAction({
      event: event as unknown as DragEvent,
      isDirectorToolsOpen,
      setIsPageImageDragOver,
    });
  }, [isDirectorToolsOpen]);

  const handlePageImageDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    pageImageDragLeaveAction({
      event: event as unknown as DragEvent,
      isDirectorToolsOpen,
      setIsPageImageDragOver,
    });
  }, [isDirectorToolsOpen]);

  const handlePageImageDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    pageImageDragOverAction({
      event: event as unknown as DragEvent,
      isDirectorToolsOpen,
      isPageImageDragOver,
      setIsPageImageDragOver,
    });
  }, [isDirectorToolsOpen, isPageImageDragOver]);

  const handlePageImageDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    void pageImageDropAction({
      event: event as unknown as DragEvent,
      isDirectorToolsOpen,
      setIsPageImageDragOver,
      showErrorToast,
      handlePickSourceHistoryImage,
      handlePickSourceImage,
    });
  }, [handlePickSourceHistoryImage, handlePickSourceImage, isDirectorToolsOpen, showErrorToast]);

  useEffect(() => {
    if (typeof document === "undefined")
      return;

    const onPaste = (event: ClipboardEvent) => {
      void pasteSourceImageAction({
        event,
        handlePickSourceImage,
      });
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

    showErrorToast(getNovelAiFreeOnlyMessage("Upscale 已禁用。"));
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
      showErrorToast("请先输入一行自然语言描述");
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
    if (!sanitizeNovelAiTagInput(simplePrompt) && !sanitizeNovelAiTagInput(simpleNegativePrompt)) {
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
    if (nextGenerateMode === "txt2img" && !sanitizeNovelAiTagInput(simplePrompt)) {
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

  const handleCommitSimpleDimensions = useCallback(() => {
    commitRoundedDimensionsForUi("simple");
  }, [commitRoundedDimensionsForUi]);

  const handleCommitProDimensions = useCallback(() => {
    commitRoundedDimensionsForUi("pro");
  }, [commitRoundedDimensionsForUi]);

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

    const normalizedSize = fitNovelAiImageSizeWithinAreaLimit(targetWidth, targetHeight);
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
      setSimpleInfillStrength(DEFAULT_INPAINT_STRENGTH);
      setSimpleInfillNoise(DEFAULT_INPAINT_NOISE);
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
    setProInfillStrength(DEFAULT_INPAINT_STRENGTH);
    setProInfillNoise(DEFAULT_INPAINT_NOISE);
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
    if (mode === "infill") {
      if (uiMode === "simple") {
        setSimpleInfillStrength(value);
        return;
      }
      setProInfillStrength(value);
      return;
    }
    if (uiMode === "simple") {
      setSimpleImg2imgStrength(value);
      return;
    }
    setProImg2imgStrength(value);
  }, [mode, uiMode]);

  const setNoise = useCallback((value: number) => {
    if (mode === "infill") {
      if (uiMode === "simple") {
        setSimpleInfillNoise(value);
        return;
      }
      setProInfillNoise(value);
      return;
    }
    if (uiMode === "simple") {
      setSimpleImg2imgNoise(value);
      return;
    }
    setProImg2imgNoise(value);
  }, [mode, uiMode]);

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
  const canGenerateFromSimpleTags = canGenerate && (Boolean(sanitizeNovelAiTagInput(simplePrompt)) || simpleGenerateMode === "infill");
  const hasSimpleTagsDraft = Boolean(sanitizeNovelAiTagInput(simplePrompt) || sanitizeNovelAiTagInput(simpleNegativePrompt));
  const simpleConvertLabel = simpleConverting ? "转化中..." : loading || pendingPreviewAction ? "处理中..." : "转化为 tags";

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
