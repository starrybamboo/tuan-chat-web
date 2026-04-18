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
  generateNovelImageViaProxy,
} from "@/components/aiImage/api";
import {
  CUSTOM_RESOLUTION_ID,
  DEFAULT_PRO_FEATURE_SECTION_OPEN,
  DEFAULT_PRO_IMAGE_SETTINGS,
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
} from "@/components/aiImage/constants";
import {
  base64DataUrl,
  base64ToBytes,
  bytesToBase64,
  clamp01,
  clampIntRange,
  clampRange,
  clampSimpleModeDimension,
  clampToMultipleOf64,
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
  makeStableId,
  mergeTagString,
  mimeFromDataUrl,
  mimeFromFilename,
  modelLabel,
  newV4CharEditorRow,
  normalizeReferenceStrengthRows,
  readFileAsBytes,
  readImagePixels,
  readImageSize,
  readLocalStorageString,
  resolveFixedImageModel,
  resolveImportedValue,
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
import { getAiImageStylePresets } from "@/utils/aiImageStylePresets";
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

  const [mode, setMode] = useState<AiImageHistoryMode>("txt2img");
  const [sourceImageDataUrl, setSourceImageDataUrl] = useState("");
  const [sourceImageBase64, setSourceImageBase64] = useState("");

  const [simpleText, setSimpleText] = useState("");
  const [simpleConvertedFromText, setSimpleConvertedFromText] = useState("");
  const [simpleConverted, setSimpleConverted] = useState<NovelAiNl2TagsResult | null>(null);
  const [simplePrompt, setSimplePrompt] = useState("");
  const [simpleNegativePrompt, setSimpleNegativePrompt] = useState("");
  const [simpleEditorMode, setSimpleEditorMode] = useState<"text" | "tags">("text");
  const [simplePromptTab, setSimplePromptTab] = useState<"prompt" | "negative">("prompt");
  const [simpleConverting, setSimpleConverting] = useState(false);
  const [isPageImageDragOver, setIsPageImageDragOver] = useState(false);
  const [isStylePickerOpen, setIsStylePickerOpen] = useState(false);
  const [selectedStyleIds, setSelectedStyleIds] = useState<string[]>([]);
  const [proPromptTab, setProPromptTab] = useState<"prompt" | "negative">("prompt");
  const [charPromptTabs, setCharPromptTabs] = useState<Record<string, "prompt" | "negative">>({});

  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");

  const [v4UseCoords, setV4UseCoords] = useState(false);
  const [v4UseOrder, setV4UseOrder] = useState(true);
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
    if (uiMode === "simple") {
      setMode("txt2img");
      setSourceImageDataUrl("");
      setSourceImageBase64("");
    }
  }, [uiMode]);

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
  const selectedStylePresets = useMemo(() => {
    const index = new Map<string, AiImageStylePreset>(stylePresets.map(p => [p.id, p]));
    return selectedStyleIds.map(id => index.get(id)).filter(Boolean) as AiImageStylePreset[];
  }, [selectedStyleIds, stylePresets]);

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

  const samplerOptions = SAMPLERS_NAI4;
  const noiseScheduleOptions = NOISE_SCHEDULES_NAI4;

  const [width, setWidth] = useState<number>(DEFAULT_PRO_IMAGE_SETTINGS.width);
  const [height, setHeight] = useState<number>(DEFAULT_PRO_IMAGE_SETTINGS.height);
  const [imageCount, setImageCount] = useState<number>(DEFAULT_PRO_IMAGE_SETTINGS.imageCount);
  const [simpleResolutionSelection, setSimpleResolutionSelection] = useState<ResolutionSelection>(DEFAULT_PRO_IMAGE_SETTINGS.simpleResolutionSelection);
  const [steps, setSteps] = useState<number>(DEFAULT_PRO_IMAGE_SETTINGS.steps);
  const [scale, setScale] = useState<number>(DEFAULT_PRO_IMAGE_SETTINGS.scale);
  const [sampler, setSampler] = useState<string>(DEFAULT_PRO_IMAGE_SETTINGS.sampler);
  const [noiseSchedule, setNoiseSchedule] = useState<string>(DEFAULT_PRO_IMAGE_SETTINGS.noiseSchedule);
  const [cfgRescale, setCfgRescale] = useState<number>(DEFAULT_PRO_IMAGE_SETTINGS.cfgRescale);
  const [ucPreset, setUcPreset] = useState<number>(DEFAULT_PRO_IMAGE_SETTINGS.ucPreset);
  const [smea, setSmea] = useState(false);
  const [smeaDyn, setSmeaDyn] = useState(false);
  const [qualityToggle, setQualityToggle] = useState(true);
  const [dynamicThresholding, setDynamicThresholding] = useState(false);
  const [strength, setStrength] = useState(0.7);
  const [noise, setNoise] = useState(0.2);

  const [seed, setSeed] = useState<number>(-1);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pendingMetadataImport, setPendingMetadataImport] = useState<PendingMetadataImportState | null>(null);
  const [metadataImportSelection, setMetadataImportSelection] = useState<MetadataImportSelectionState>(DEFAULT_METADATA_IMPORT_SELECTION);
  const [isDirectorToolsOpen, setIsDirectorToolsOpen] = useState(false);
  const [activeDirectorTool, setActiveDirectorTool] = useState<DirectorToolId>("removeBackground");
  const pendingPreviewAction = "" as ActivePreviewAction;
  const [directorSourcePreview, setDirectorSourcePreview] = useState<GeneratedImageItem | null>(null);
  const [directorOutputPreview, setDirectorOutputPreview] = useState<GeneratedImageItem | null>(null);
  const [directorColorizePrompt, setDirectorColorizePrompt] = useState("");
  const [directorColorizeDefry, setDirectorColorizeDefry] = useState(0);
  const [directorEmotion, setDirectorEmotion] = useState<NovelAiEmotion>("neutral");
  const [directorEmotionDefry, setDirectorEmotionDefry] = useState(0);
  const [directorEmotionExtraPrompt, setDirectorEmotionExtraPrompt] = useState("");
  const [results, setResults] = useState<GeneratedImageItem[]>([]);
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);
  const [selectedHistoryPreviewKey, setSelectedHistoryPreviewKey] = useState<string | null>(null);
  const [pinnedPreviewKey, setPinnedPreviewKey] = useState<string | null>(null);
  const [isPreviewImageModalOpen, setIsPreviewImageModalOpen] = useState(false);
  const [inpaintDialogSource, setInpaintDialogSource] = useState<InpaintDialogSource | null>(null);
  const [normalizeReferenceStrengths, setNormalizeReferenceStrengths] = useState(false);

  const [history, setHistory] = useState<AiImageHistoryRow[]>([]);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

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
  const directorInputPreview = directorSourcePreview ?? selectedPreviewResult;
  const inferResolutionSelection = useCallback((nextWidth: number, nextHeight: number): ResolutionSelection => {
    return RESOLUTION_PRESETS.find(item => item.width === nextWidth && item.height === nextHeight)?.id ?? CUSTOM_RESOLUTION_ID;
  }, []);
  const imageCountLimit = useMemo(() => {
    return NOVELAI_FREE_FIXED_IMAGE_COUNT;
  }, []);

  useEffect(() => {
    if (!isDirectorToolsOpen || directorSourcePreview || !selectedPreviewResult)
      return;
    setDirectorSourcePreview(selectedPreviewResult);
  }, [directorSourcePreview, isDirectorToolsOpen, selectedPreviewResult]);

  useEffect(() => {
    if (!selectedPreviewResult)
      setIsDirectorToolsOpen(false);
  }, [selectedPreviewResult]);

  useEffect(() => {
    if (!selectedPreviewResult && isPreviewImageModalOpen)
      setIsPreviewImageModalOpen(false);
  }, [isPreviewImageModalOpen, selectedPreviewResult]);

  useEffect(() => {
    if (pinnedPreviewKey && !pinnedPreviewResult)
      setPinnedPreviewKey(null);
  }, [pinnedPreviewKey, pinnedPreviewResult]);

  useEffect(() => {
    if (!samplerOptions.includes(sampler as any))
      setSampler(samplerOptions[0]);
  }, [sampler, samplerOptions]);

  useEffect(() => {
    if (!noiseScheduleOptions.length)
      return;
    if (!noiseScheduleOptions.includes(noiseSchedule as any))
      setNoiseSchedule(noiseScheduleOptions[0]);
  }, [noiseSchedule, noiseScheduleOptions]);

  useEffect(() => {
    if (imageCount > imageCountLimit)
      setImageCount(imageCountLimit);
  }, [imageCount, imageCountLimit]);

  useEffect(() => {
    if (uiMode !== "simple" || simpleResolutionSelection === CUSTOM_RESOLUTION_ID)
      return;
    const matchedPresetId = inferResolutionSelection(width, height);
    if (matchedPresetId !== simpleResolutionSelection)
      setSimpleResolutionSelection(matchedPresetId);
  }, [height, inferResolutionSelection, simpleResolutionSelection, uiMode, width]);

  useEffect(() => {
    if (uiMode !== "simple" || simpleResolutionSelection !== CUSTOM_RESOLUTION_ID)
      return;

    const nextWidth = Math.min(
      SIMPLE_MODE_CUSTOM_MAX_DIMENSION,
      clampToMultipleOf64(width, DEFAULT_PRO_IMAGE_SETTINGS.width),
    );
    const nextHeight = Math.min(
      SIMPLE_MODE_CUSTOM_MAX_DIMENSION,
      clampToMultipleOf64(height, DEFAULT_PRO_IMAGE_SETTINGS.height),
    );

    if (nextWidth === width && nextHeight === height)
      return;

    setWidth(nextWidth);
    setHeight(nextHeight);
  }, [height, simpleResolutionSelection, uiMode, width]);

  const applyImportedMetadata = useCallback((settings: NovelAiImportedSettings, selection: MetadataImportSelectionState) => {
    setUiMode("pro");
    setIsPageImageDragOver(false);

    if (selection.settings) {
      setMode("txt2img");
      setSourceImageDataUrl("");
      setSourceImageBase64("");
      setVibeTransferReferences([]);
      setPreciseReference(null);
      setProFeatureSectionOpen("baseImage", false);
      setProFeatureSectionOpen("vibeTransfer", false);
      setProFeatureSectionOpen("preciseReference", false);
    }

    if (selection.prompt && settings.prompt != null)
      setPrompt(settings.prompt);
    else if (selection.prompt && selection.cleanImports)
      setPrompt("");

    if (selection.undesiredContent && settings.negativePrompt != null)
      setNegativePrompt(settings.negativePrompt);
    else if (selection.undesiredContent && selection.cleanImports)
      setNegativePrompt("");

    if (selection.seed && settings.seed != null)
      setSeed(settings.seed);
    else if (selection.seed && selection.cleanImports)
      setSeed(-1);
    if (selection.settings) {
      const cleanImports = selection.cleanImports;
      const normalizedImportedSize = getClosestValidImageSize(
        resolveImportedValue(settings.width, cleanImports, DEFAULT_PRO_IMAGE_SETTINGS.width) ?? width,
        resolveImportedValue(settings.height, cleanImports, DEFAULT_PRO_IMAGE_SETTINGS.height) ?? height,
      );
      setWidth(normalizedImportedSize.width);
      setHeight(normalizedImportedSize.height);
      setSimpleResolutionSelection(inferResolutionSelection(normalizedImportedSize.width, normalizedImportedSize.height));

      setImageCount(NOVELAI_FREE_FIXED_IMAGE_COUNT);
      const importedSteps = resolveImportedValue(settings.steps, cleanImports, DEFAULT_PRO_IMAGE_SETTINGS.steps);
      if (importedSteps != null)
        setSteps(clampIntRange(importedSteps, 1, NOVELAI_FREE_MAX_STEPS, NOVELAI_FREE_MAX_STEPS));
      const importedScale = resolveImportedValue(settings.scale, cleanImports, DEFAULT_PRO_IMAGE_SETTINGS.scale);
      if (importedScale != null)
        setScale(clampRange(importedScale, 0, 20, 5));
      const importedSampler = resolveImportedValue(settings.sampler, cleanImports, samplerOptions[0] || DEFAULT_PRO_IMAGE_SETTINGS.sampler);
      if (importedSampler != null)
        setSampler(importedSampler);
      const importedNoiseSchedule = resolveImportedValue(settings.noiseSchedule, cleanImports, noiseScheduleOptions[0] || DEFAULT_PRO_IMAGE_SETTINGS.noiseSchedule);
      if (importedNoiseSchedule != null)
        setNoiseSchedule(importedNoiseSchedule);
      const importedCfgRescale = resolveImportedValue(settings.cfgRescale, cleanImports, DEFAULT_PRO_IMAGE_SETTINGS.cfgRescale);
      if (importedCfgRescale != null)
        setCfgRescale(clampRange(importedCfgRescale, 0, 1, 0));
      const importedUcPreset = resolveImportedValue(settings.ucPreset, cleanImports, DEFAULT_PRO_IMAGE_SETTINGS.ucPreset);
      if (importedUcPreset != null)
        setUcPreset(clampIntRange(importedUcPreset, 0, 2, 2));
      const importedQualityToggle = resolveImportedValue(settings.qualityToggle, cleanImports, DEFAULT_PRO_IMAGE_SETTINGS.qualityToggle);
      if (importedQualityToggle != null)
        setQualityToggle(Boolean(importedQualityToggle));
      const importedDynamicThresholding = resolveImportedValue(settings.dynamicThresholding, cleanImports, DEFAULT_PRO_IMAGE_SETTINGS.dynamicThresholding);
      if (importedDynamicThresholding != null)
        setDynamicThresholding(Boolean(importedDynamicThresholding));
      const importedSmea = resolveImportedValue(settings.smea, cleanImports, DEFAULT_PRO_IMAGE_SETTINGS.smea);
      if (importedSmea != null)
        setSmea(Boolean(importedSmea));
      const importedSmeaDyn = resolveImportedValue(settings.smeaDyn, cleanImports, DEFAULT_PRO_IMAGE_SETTINGS.smeaDyn);
      if (importedSmeaDyn != null)
        setSmeaDyn(Boolean(importedSmeaDyn));
      const importedStrength = resolveImportedValue(settings.strength, cleanImports, DEFAULT_PRO_IMAGE_SETTINGS.strength);
      if (importedStrength != null)
        setStrength(clampRange(importedStrength, 0, 1, 0.7));
      const importedNoise = resolveImportedValue(settings.noise, cleanImports, DEFAULT_PRO_IMAGE_SETTINGS.noise);
      if (importedNoise != null)
        setNoise(clampRange(importedNoise, 0, 1, 0.2));
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
            prompt: String(item.prompt || ""),
            negativePrompt: String(item.negativePrompt || ""),
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
  }, [height, inferResolutionSelection, noiseScheduleOptions, samplerOptions, v4Chars, width, setProFeatureSectionOpen]);

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

    if (importedMetadata) {
      setPendingMetadataImport({
        sourceImage,
        metadata: importedMetadata,
        source: args.source,
        imageCount: args.imageCount ?? 1,
      });
      setMetadataImportSelection(createMetadataImportSelection(importedMetadata.settings));
      return;
    }

    if ((args.imageCount ?? 1) > 1) {
      return;
    }

  }, []);

  const handlePickSourceImage = useCallback(async (
    file: File,
    options?: { source?: ImageImportSource; imageCount?: number },
  ) => {
    const bytes = await readFileAsBytes(file);
    await handleImportSourceImageBytes({
      bytes,
      mime: file.type || mimeFromFilename(file.name),
      name: file.name,
      source: options?.source,
      imageCount: options?.imageCount,
    });
  }, [handleImportSourceImageBytes]);

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
    const nextIsImageDrag = hasFileDrag(event.dataTransfer) || hasInternalHistoryImageDrag(event.dataTransfer);
    if (!nextIsImageDrag)
      return;
    event.preventDefault();
    event.stopPropagation();
    setIsPageImageDragOver(nextIsImageDrag);
  }, []);

  const handlePageImageDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!event.currentTarget.contains(event.relatedTarget as Node | null))
      setIsPageImageDragOver(false);
  }, []);

  const handlePageImageDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    const nextIsImageDrag = hasFileDrag(event.dataTransfer) || hasInternalHistoryImageDrag(event.dataTransfer);
    if (!nextIsImageDrag)
      return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
    if (nextIsImageDrag !== isPageImageDragOver)
      setIsPageImageDragOver(nextIsImageDrag);
  }, [isPageImageDragOver]);

  const handlePageImageDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
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
  }, [handlePickSourceHistoryImage, handlePickSourceImage, showErrorToast]);

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
    setMode("txt2img");
    setSourceImageDataUrl("");
    setSourceImageBase64("");
    setIsPageImageDragOver(false);
    setProFeatureSectionOpen("baseImage", true);
  }, [setProFeatureSectionOpen]);

  const handleCloseMetadataImportDialog = useCallback(() => {
    setPendingMetadataImport(null);
    setMetadataImportSelection(DEFAULT_METADATA_IMPORT_SELECTION);
  }, []);

  const handleImportSourceImageTarget = useCallback((_target: "img2img" | "vibe" | "precise") => {
    if (!pendingMetadataImport)
      return;

    setPendingMetadataImport(null);
    setMetadataImportSelection(DEFAULT_METADATA_IMPORT_SELECTION);
  }, [pendingMetadataImport]);

  const handleConfirmMetadataImport = useCallback(() => {
    if (!pendingMetadataImport)
      return;

    const hasAnySelection = metadataImportSelection.prompt
      || metadataImportSelection.undesiredContent
      || metadataImportSelection.characters
      || metadataImportSelection.settings
      || metadataImportSelection.seed;
    if (!hasAnySelection)
      return;

    applyImportedMetadata(pendingMetadataImport.metadata.settings, metadataImportSelection);
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
    // 这里是明确的 destructive 操作确认，沿用浏览器 confirm 比额外弹层更轻。
    // eslint-disable-next-line no-alert
    if (typeof window !== "undefined" && !window.confirm("确定要清空历史绘画吗？此操作不可撤销。"))
      return;
    await clearAiImageHistory();
    setSelectedHistoryPreviewKey(null);
    await refreshHistory();
  }, [refreshHistory]);

  const handleUseSelectedResultAsBaseImage = useCallback(() => {
    if (!selectedPreviewResult)
      return;
    showErrorToast(getNovelAiFreeOnlyMessage("Base Img / img2img 已禁用；需要局部重绘时，请改用预览区的 Inpaint。"));
    setProFeatureSectionOpen("baseImage", true);
  }, [selectedPreviewResult, setProFeatureSectionOpen, showErrorToast]);

  const handleToggleDirectorTools = useCallback(() => {
    showErrorToast(getNovelAiFreeOnlyMessage("Director Tools 已禁用。"));
  }, [showErrorToast]);

  const handleSyncDirectorSourceFromCurrentPreview = useCallback(() => {
    if (!selectedPreviewResult)
      return;
    setDirectorSourcePreview(selectedPreviewResult);
    setDirectorOutputPreview(null);
    showSuccessToast("已把当前预览同步为导演工具输入图。");
  }, [selectedPreviewResult, showSuccessToast]);

  const handleRunUpscale = useCallback(async () => {
    if (!selectedPreviewResult)
      return;

    showErrorToast(getNovelAiFreeOnlyMessage("Upscale 已禁用。"));
  }, [selectedPreviewResult, showErrorToast]);

  const handleRunDirectorTool = useCallback(async () => {
    if (!directorInputPreview || !directorTool)
      return;

    showErrorToast(getNovelAiFreeOnlyMessage("Director Tools 已禁用。"));
  }, [
    directorInputPreview,
    directorTool,
    showErrorToast,
  ]);

  const runGenerate = useCallback(async (args?: {
    prompt?: string;
    negativePrompt?: string;
    mode?: AiImageHistoryMode;
    sourceImageBase64?: string;
    sourceImageDataUrl?: string;
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
    const effectivePrompt = mergeStyleTags ? mergeTagString(basePrompt, selectedStyleTags).trim() : basePrompt;
    const effectiveNegative = mergeStyleTags ? mergeTagString(baseNegative, selectedStyleNegativeTags) : baseNegative;
    const effectiveWidth = args?.width ?? width;
    const effectiveHeight = args?.height ?? height;
    const effectiveStrength = args?.strength ?? strength;
    const usesSourceImage = effectiveMode === "img2img" || effectiveMode === "infill";
    const effectiveSourceImageBase64 = args?.sourceImageBase64 ?? (usesSourceImage ? sourceImageBase64 : undefined);
    const effectiveSourceImageDataUrl = args?.sourceImageDataUrl ?? (usesSourceImage ? sourceImageDataUrl : undefined);
    const effectiveMaskBase64 = args?.maskBase64;
    const v4CharsPayload = isNAI4 && uiMode === "pro" ? v4Chars.map(({ id, ...rest }) => rest) : undefined;
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
      setSeed(seedValue == null ? -1 : res.seed);
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
    selectedStyleNegativeTags,
    selectedStyleTags,
    seed,
    simpleNegativePrompt,
    simplePrompt,
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
  ]);

  const handleOpenInpaint = useCallback(() => {
    if (!selectedPreviewResult)
      return;

    const sourceImageBase64 = dataUrlToBase64(selectedPreviewResult.dataUrl);
    if (!sourceImageBase64) {
      showErrorToast("当前预览图片读取失败，无法启动 Inpaint。");
      return;
    }

    setError("");
    setInpaintDialogSource({
      dataUrl: selectedPreviewResult.dataUrl,
      imageBase64: sourceImageBase64,
      width: selectedPreviewResult.width,
      height: selectedPreviewResult.height,
      seed: selectedPreviewResult.seed,
      model: selectedPreviewResult.model,
      prompt: selectedPreviewHistoryRow?.prompt || (uiMode === "simple" ? simplePrompt : prompt),
      negativePrompt: selectedPreviewHistoryRow?.negativePrompt || (uiMode === "simple" ? simpleNegativePrompt : negativePrompt),
      strength,
    });
  }, [negativePrompt, prompt, selectedPreviewHistoryRow, selectedPreviewResult, showErrorToast, simpleNegativePrompt, simplePrompt, strength, uiMode]);

  const handleCloseInpaintDialog = useCallback(() => {
    if (loading)
      return;
    setError("");
    setInpaintDialogSource(null);
  }, [loading]);

  const handleRunInpaint = useCallback(async (payload: InpaintSubmitPayload) => {
    if (!inpaintDialogSource)
      return;

    const success = await runGenerate({
      mode: "infill",
      prompt: payload.prompt,
      negativePrompt: payload.negativePrompt,
      sourceImageBase64: inpaintDialogSource.imageBase64,
      sourceImageDataUrl: inpaintDialogSource.dataUrl,
      maskBase64: dataUrlToBase64(payload.maskDataUrl),
      width: inpaintDialogSource.width,
      height: inpaintDialogSource.height,
      strength: payload.strength,
      toolLabel: "Inpaint",
    });

    if (!success)
      return;

    setPrompt(payload.prompt);
    setNegativePrompt(payload.negativePrompt);
    setStrength(payload.strength);
    setInpaintDialogSource(null);
    showSuccessToast("Inpaint 完成，结果已加入本次绘画与历史记录。");
  }, [inpaintDialogSource, runGenerate, showSuccessToast]);

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
        prompt: mergeTagString(converted.prompt, selectedStyleTags).trim(),
        negativePrompt: mergeTagString(converted.negativePrompt, selectedStyleNegativeTags),
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
    selectedStyleNegativeTags,
    selectedStyleTags,
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
    if (!simplePrompt.trim()) {
      showErrorToast("prompt 为空：请先补充 tags");
      return;
    }
    await runGenerate({ mode: "txt2img", prompt: simplePrompt, negativePrompt: simpleNegativePrompt });
  }, [runGenerate, showErrorToast, simpleNegativePrompt, simplePrompt]);

  const handleSelectCurrentResult = useCallback((index: number) => {
    setSelectedHistoryPreviewKey(null);
    setSelectedResultIndex(index);
    if (isDirectorToolsOpen) {
      const nextItem = results[index] || null;
      setDirectorSourcePreview(nextItem);
      setDirectorOutputPreview(null);
    }
  }, [isDirectorToolsOpen, results]);

  const handlePreviewHistoryRow = useCallback((row: AiImageHistoryRow) => {
    setSelectedHistoryPreviewKey(historyRowKey(row));
    if (isDirectorToolsOpen) {
      setDirectorSourcePreview(historyRowToGeneratedItem(row));
      setDirectorOutputPreview(null);
    }
  }, [isDirectorToolsOpen]);

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

  const handleApplyHistorySettings = useCallback((row: AiImageHistoryRow, clickMode: Exclude<HistoryRowClickMode, "preview">) => {
    const importSettings = clickMode === "settings" || clickMode === "settings-with-seed";
    const importSeed = clickMode === "seed" || clickMode === "settings-with-seed";
    setSelectedHistoryPreviewKey(historyRowKey(row));

    if (!importSettings) {
      if (importSeed)
        setSeed(row.seed);
      if (importSeed)
        showSuccessToast("已导入历史 seed，其他设置保持当前值。");
      return;
    }

    setUiMode("pro");

    const normalizedSize = getClosestValidImageSize(row.width, row.height);
    const droppedPaidSettings = [
      row.mode === "img2img" ? "Base Img" : row.mode === "infill" ? "Inpaint" : "",
      row.referenceImages?.length ? "Vibe Transfer" : "",
      row.preciseReference ? "Precise Reference" : "",
      (row.imageCount ?? row.batchSize ?? 1) > NOVELAI_FREE_FIXED_IMAGE_COUNT ? "多张生成" : "",
      (row.steps ?? NOVELAI_FREE_MAX_STEPS) > NOVELAI_FREE_MAX_STEPS ? "高步数" : "",
      row.width > NOVELAI_FREE_MAX_DIMENSION || row.height > NOVELAI_FREE_MAX_DIMENSION ? "超尺寸" : "",
    ].filter(Boolean);

    setMode("txt2img");
    setSourceImageDataUrl("");
    setSourceImageBase64("");
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
      baseImage: false,
      characterPrompts: restoredChars.length > 0 ? true : DEFAULT_PRO_FEATURE_SECTION_OPEN.characterPrompts,
      vibeTransfer: false,
      preciseReference: false,
    }));
    if (importSeed)
      setSeed(row.seed);
    setWidth(normalizedSize.width);
    setHeight(normalizedSize.height);
    setSimpleResolutionSelection(inferResolutionSelection(normalizedSize.width, normalizedSize.height));
    setImageCount(NOVELAI_FREE_FIXED_IMAGE_COUNT);
    setSteps(clampIntRange(
      resolveImportedValue(row.steps, true, DEFAULT_PRO_IMAGE_SETTINGS.steps) ?? DEFAULT_PRO_IMAGE_SETTINGS.steps,
      1,
      NOVELAI_FREE_MAX_STEPS,
      DEFAULT_PRO_IMAGE_SETTINGS.steps,
    ));
    setScale(clampRange(
      resolveImportedValue(row.scale, true, DEFAULT_PRO_IMAGE_SETTINGS.scale) ?? DEFAULT_PRO_IMAGE_SETTINGS.scale,
      0,
      20,
      DEFAULT_PRO_IMAGE_SETTINGS.scale,
    ));
    setSampler(row.sampler || samplerOptions[0] || DEFAULT_PRO_IMAGE_SETTINGS.sampler);
    setNoiseSchedule(row.noiseSchedule || noiseScheduleOptions[0] || DEFAULT_PRO_IMAGE_SETTINGS.noiseSchedule);
    setCfgRescale(clampRange(
      resolveImportedValue(row.cfgRescale, true, DEFAULT_PRO_IMAGE_SETTINGS.cfgRescale) ?? DEFAULT_PRO_IMAGE_SETTINGS.cfgRescale,
      0,
      1,
      DEFAULT_PRO_IMAGE_SETTINGS.cfgRescale,
    ));
    setUcPreset(clampIntRange(
      resolveImportedValue(row.ucPreset, true, DEFAULT_PRO_IMAGE_SETTINGS.ucPreset) ?? DEFAULT_PRO_IMAGE_SETTINGS.ucPreset,
      0,
      2,
      DEFAULT_PRO_IMAGE_SETTINGS.ucPreset,
    ));
    setQualityToggle(resolveImportedValue(row.qualityToggle, true, DEFAULT_PRO_IMAGE_SETTINGS.qualityToggle) ?? DEFAULT_PRO_IMAGE_SETTINGS.qualityToggle);
    setDynamicThresholding(resolveImportedValue(row.dynamicThresholding, true, DEFAULT_PRO_IMAGE_SETTINGS.dynamicThresholding) ?? DEFAULT_PRO_IMAGE_SETTINGS.dynamicThresholding);
    setSmea(resolveImportedValue(row.smea, true, DEFAULT_PRO_IMAGE_SETTINGS.smea) ?? DEFAULT_PRO_IMAGE_SETTINGS.smea);
    setSmeaDyn(resolveImportedValue(row.smeaDyn, true, DEFAULT_PRO_IMAGE_SETTINGS.smeaDyn) ?? DEFAULT_PRO_IMAGE_SETTINGS.smeaDyn);
    setStrength(clampRange(
      resolveImportedValue(row.strength, true, DEFAULT_PRO_IMAGE_SETTINGS.strength) ?? DEFAULT_PRO_IMAGE_SETTINGS.strength,
      0,
      1,
      DEFAULT_PRO_IMAGE_SETTINGS.strength,
    ));
    setNoise(clampRange(
      resolveImportedValue(row.noise, true, DEFAULT_PRO_IMAGE_SETTINGS.noise) ?? DEFAULT_PRO_IMAGE_SETTINGS.noise,
      0,
      1,
      DEFAULT_PRO_IMAGE_SETTINGS.noise,
    ));
    showSuccessToast([
      importSeed ? "已导入历史设置与 seed。" : "已导入历史设置，seed 保持当前值。",
      droppedPaidSettings.length ? `已自动忽略会消耗 Anlas 的项：${droppedPaidSettings.join(" / ")}。` : "",
    ].filter(Boolean).join(" "));
  }, [inferResolutionSelection, noiseScheduleOptions, samplerOptions, showSuccessToast]);

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
    // 这里同样保留最短路径确认，避免误触叉叉后直接删档。
    // eslint-disable-next-line no-alert
    if (typeof window !== "undefined" && !window.confirm("确定要删除这条绘画记录吗？此操作不可撤销。"))
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
    if (!selectedPreviewResult)
      return;
    triggerBrowserDownload(
      selectedPreviewResult.dataUrl,
      `nai_${selectedPreviewResult.seed}_${selectedPreviewResult.batchIndex + 1}.${extensionFromDataUrl(selectedPreviewResult.dataUrl)}`,
    );
  }, [selectedPreviewResult]);

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
    setSelectedStyleIds((prev) => {
      if (prev.includes(id))
        return prev.filter(item => item !== id);
      return [...prev, id];
    });
  }, []);

  const handleSelectSingleStyle = useCallback((id: string) => {
    setSelectedStyleIds((prev) => {
      if (prev.length === 1 && prev[0] === id)
        return prev;
      return [id];
    });
  }, []);

  const handleClearStyles = useCallback(() => {
    setSelectedStyleIds([]);
  }, []);

  const handleAddV4Char = useCallback(() => {
    const row = newV4CharEditorRow();
    setV4Chars(prev => [...prev, row]);
    setCharPromptTabs(prev => ({ ...prev, [row.id]: "prompt" }));
    setProFeatureSectionOpen("characterPrompts", true);
  }, [setProFeatureSectionOpen]);

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

  const handleUpdateVibeReference = useCallback((id: string, patch: Partial<VibeTransferReferenceRow>) => {
    setVibeTransferReferences(prev => prev.map(item => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const handleRemoveVibeReference = useCallback((id: string) => {
    setVibeTransferReferences(prev => prev.filter(item => item.id !== id));
  }, []);

  const activeResolutionPreset = useMemo(() => {
    return RESOLUTION_PRESETS.find(item => item.width === width && item.height === height) || null;
  }, [height, width]);
  const simpleResolutionArea = width * height;

  const handleSelectSimpleResolutionPreset = useCallback((selection: ResolutionSelection) => {
    if (selection === CUSTOM_RESOLUTION_ID) {
      setSimpleResolutionSelection(CUSTOM_RESOLUTION_ID);
      return;
    }
    const preset = RESOLUTION_PRESETS.find(item => item.id === selection);
    if (!preset)
      return;
    setSimpleResolutionSelection(preset.id);
    setWidth(preset.width);
    setHeight(preset.height);
  }, []);

  const handleSimpleWidthChange = useCallback((value: number) => {
    setSimpleResolutionSelection(CUSTOM_RESOLUTION_ID);
    const nextHeight = Math.min(
      SIMPLE_MODE_CUSTOM_MAX_DIMENSION,
      clampToMultipleOf64(height, DEFAULT_PRO_IMAGE_SETTINGS.height),
    );
    const nextWidth = Math.min(
      SIMPLE_MODE_CUSTOM_MAX_DIMENSION,
      clampSimpleModeDimension(value, nextHeight, width || DEFAULT_PRO_IMAGE_SETTINGS.width),
    );
    setWidth(nextWidth);
    setHeight(nextHeight);
  }, [height, width]);

  const handleSimpleHeightChange = useCallback((value: number) => {
    setSimpleResolutionSelection(CUSTOM_RESOLUTION_ID);
    const nextWidth = Math.min(
      SIMPLE_MODE_CUSTOM_MAX_DIMENSION,
      clampToMultipleOf64(width, DEFAULT_PRO_IMAGE_SETTINGS.width),
    );
    const nextHeight = Math.min(
      SIMPLE_MODE_CUSTOM_MAX_DIMENSION,
      clampSimpleModeDimension(value, nextWidth, height || DEFAULT_PRO_IMAGE_SETTINGS.height),
    );
    setWidth(nextWidth);
    setHeight(nextHeight);
  }, [height, width]);

  const handleSwapImageDimensions = useCallback(() => {
    const nextWidth = clampToMultipleOf64(height, DEFAULT_PRO_IMAGE_SETTINGS.height);
    const nextHeight = clampToMultipleOf64(width, DEFAULT_PRO_IMAGE_SETTINGS.width);
    setWidth(nextWidth);
    setHeight(nextHeight);
    setSimpleResolutionSelection(inferResolutionSelection(nextWidth, nextHeight));
  }, [height, inferResolutionSelection, width]);

  const handleCropToClosestValidSize = useCallback(async () => {
    let targetWidth = width;
    let targetHeight = height;

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
    setWidth(normalizedSize.width);
    setHeight(normalizedSize.height);
    setSimpleResolutionSelection(inferResolutionSelection(normalizedSize.width, normalizedSize.height));
    showSuccessToast(sourceImageDataUrl ? "已按 Base Img 裁到最近合法尺寸。" : "已把当前尺寸裁到最近合法尺寸。");
  }, [height, inferResolutionSelection, showSuccessToast, sourceImageDataUrl, width]);

  const handleResetCurrentImageSettings = useCallback(() => {
    setWidth(DEFAULT_PRO_IMAGE_SETTINGS.width);
    setHeight(DEFAULT_PRO_IMAGE_SETTINGS.height);
    setImageCount(DEFAULT_PRO_IMAGE_SETTINGS.imageCount);
    setSteps(DEFAULT_PRO_IMAGE_SETTINGS.steps);
    setScale(DEFAULT_PRO_IMAGE_SETTINGS.scale);
    setSampler(DEFAULT_PRO_IMAGE_SETTINGS.sampler);
    setNoiseSchedule(DEFAULT_PRO_IMAGE_SETTINGS.noiseSchedule);
    setCfgRescale(DEFAULT_PRO_IMAGE_SETTINGS.cfgRescale);
    setUcPreset(DEFAULT_PRO_IMAGE_SETTINGS.ucPreset);
    setQualityToggle(DEFAULT_PRO_IMAGE_SETTINGS.qualityToggle);
    setDynamicThresholding(DEFAULT_PRO_IMAGE_SETTINGS.dynamicThresholding);
    setSmea(DEFAULT_PRO_IMAGE_SETTINGS.smea);
    setSmeaDyn(DEFAULT_PRO_IMAGE_SETTINGS.smeaDyn);
    setStrength(DEFAULT_PRO_IMAGE_SETTINGS.strength);
    setNoise(DEFAULT_PRO_IMAGE_SETTINGS.noise);
    setSeed(DEFAULT_PRO_IMAGE_SETTINGS.seed);
    setSimpleResolutionSelection(DEFAULT_PRO_IMAGE_SETTINGS.simpleResolutionSelection);
    showSuccessToast("已重置当前图像设置。");
  }, [showSuccessToast]);

  const handleClearSeed = useCallback(() => {
    setSeed(-1);
  }, []);

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
    setSeed(selectedPreviewResult.seed);
    showSuccessToast("已把当前预览 seed 回填到设置。");
  }, [selectedPreviewResult, showSuccessToast]);

  const handleApplySelectedPreviewSettings = useCallback(() => {
    if (!selectedPreviewHistoryRow)
      return;
    handleApplyHistorySettings(selectedPreviewHistoryRow, "settings");
  }, [handleApplyHistorySettings, selectedPreviewHistoryRow]);

  const isBusy = loading || simpleConverting || Boolean(pendingPreviewAction);
  const freeGenerationViolation = getNovelAiFreeGenerationViolation({
    mode,
    width,
    height,
    imageCount,
    steps,
    sourceImageBase64,
    vibeTransferReferenceCount: vibeTransferReferences.length,
    hasPreciseReference: Boolean(preciseReference),
  });
  const canGenerate = !isBusy && !freeGenerationViolation;
  const canTriggerProGenerate = canGenerate && Boolean(prompt.trim());
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
  const ucPresetEnabled = ucPreset !== 2;
  const seedIsRandom = !Number.isFinite(seed) || seed < 0;
  const fixedModelDescription = MODEL_DESCRIPTIONS[model] || "图像生成模型";
  const hasReferenceConflict = vibeTransferReferences.length > 0 && Boolean(preciseReference);
  // 对齐 NovelAI 当前入口行为：Vibe Transfer 与 Precise Reference 在 UI 上互斥，避免出现官方面板里不存在的参数组合。
  const canAddVibeReference = false;
  const baseImageDescription = "Base Img / img2img 仍禁用；局部重绘请从右侧预览工具条进入 Inpaint。";
  const characterPromptDescription = v4Chars.length
    ? `${v4Chars.length} character slot${v4Chars.length > 1 ? "s" : ""} ready.`
    : "Customize separate characters.";
  const vibeTransferDescription = "免费模式下已禁用 Vibe Transfer。";
  const preciseReferenceDescription = "免费模式下已禁用 Precise Reference。";
  const pendingMetadataSettings = pendingMetadataImport?.metadata.settings ?? null;
  const canImportMetadataPrompt = pendingMetadataSettings ? hasNonEmptyText(pendingMetadataSettings.prompt) : false;
  const canImportMetadataNegativePrompt = pendingMetadataSettings ? hasNonEmptyText(pendingMetadataSettings.negativePrompt) : false;
  const canImportMetadataCharacters = pendingMetadataSettings ? (pendingMetadataSettings.v4Chars?.length ?? 0) > 0 : false;
  const canImportMetadataSettings = pendingMetadataSettings ? hasMetadataSettingsPayload(pendingMetadataSettings) : false;
  const canImportMetadataSeed = pendingMetadataSettings?.seed != null;
  const hasAnyMetadataImportSelection = metadataImportSelection.prompt
    || metadataImportSelection.undesiredContent
    || metadataImportSelection.characters
    || metadataImportSelection.settings
    || metadataImportSelection.seed;
  const pendingMetadataModelMismatch = pendingMetadataSettings?.model && pendingMetadataSettings.model !== model
    ? `图片内模型为 ${modelLabel(pendingMetadataSettings.model)}，当前页面仍固定使用 ${modelLabel(model)}。`
    : "";
  const canConvertSimpleText = !isBusy && Boolean(simpleText.trim());
  const canGenerateFromSimpleTags = canGenerate && Boolean(simplePrompt.trim());
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
    handleAddV4Char,
    handleClearSeed,
    handleClearSourceImage,
    handleClearStyles,
    handleCropToClosestValidSize,
    handleMoveV4Char,
    handleRemoveV4Char,
    handleRemoveVibeReference,
    handleAcceptSimpleConverted,
    handleRejectSimpleConverted,
    handleResetCurrentImageSettings,
    handleReturnToSimpleTags,
    handleReturnToSimpleText,
    handleSelectSimpleResolutionPreset,
    handleSimpleConvertToTags,
    handleSimpleGenerateFromTags,
    handleSimpleHeightChange,
    handleSimpleWidthChange,
    handleSwapImageDimensions,
    handleUpdateV4Char,
    handleUpdateVibeReference,
    hasReferenceConflict,
    height,
    imageCount,
    imageCountLimit,
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
    prompt,
    qualityToggle,
    runGenerate,
    sampler,
    samplerOptions,
    scale,
    seed,
    seedIsRandom,
    selectedStyleIds,
    selectedStyleNegativeTags,
    selectedStylePresets,
    selectedStyleTags,
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
    setV4UseCoords,
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
      pinnedPreviewResult,
      isSelectedPreviewPinned,
      isBusy,
      isGeneratingImage: loading,
      pendingPreviewAction,
      activeDirectorTool,
      directorTool,
      directorInputPreview,
      directorOutputPreview,
      directorColorizePrompt,
      directorColorizeDefry,
      directorEmotion,
      directorEmotionExtraPrompt,
      directorEmotionDefry,
      hasSelectedPreviewHistoryRow: Boolean(selectedPreviewHistoryRow),
      onToggleDirectorTools: handleToggleDirectorTools,
      onRunUpscale: handleRunUpscale,
      onSyncDirectorSourceFromCurrentPreview: handleSyncDirectorSourceFromCurrentPreview,
      onUseSelectedResultAsBaseImage: handleUseSelectedResultAsBaseImage,
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
      onApplySelectedPreviewSettings: handleApplySelectedPreviewSettings,
      onDownloadCurrent: handleDownloadCurrent,
      onApplySelectedPreviewSeed: handleApplySelectedPreviewSeed,
      onSelectPinnedPreview: handleSelectPinnedPreview,
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
  };

  const metadataImportDialogProps = {
    pendingMetadataImport,
    pendingMetadataSettings,
    canImportMetadataPrompt,
    canImportMetadataNegativePrompt,
    canImportMetadataCharacters,
    canImportMetadataSettings,
    canImportMetadataSeed,
    hasAnyMetadataImportSelection,
    metadataImportSelection,
    setMetadataImportSelection,
    pendingMetadataModelMismatch,
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
    onSubmit: handleRunInpaint,
  };

  const stylePickerDialogProps = {
    isOpen: isStylePickerOpen,
    selectedStyleIds,
    stylePresets,
    onToggleStyle: handleToggleStyle,
    onSelectSingleStyle: handleSelectSingleStyle,
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
