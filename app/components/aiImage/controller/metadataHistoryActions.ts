import type {
  HistoryRowClickMode,
  MetadataImportSelectionState,
  UiMode,
  V4CharEditorRow,
} from "@/components/aiImage/types";
import type { AiImageHistoryRow } from "@/utils/aiImageHistoryDb";
import type { NovelAiImageMetadataResult } from "@/utils/novelaiImageMetadata";

import {
  DEFAULT_PRO_FEATURE_SECTION_OPEN,
  DEFAULT_PRO_IMAGE_SETTINGS,
  DEFAULT_SIMPLE_IMAGE_SETTINGS,
  NOVELAI_FREE_FIXED_IMAGE_COUNT,
  NOVELAI_FREE_MAX_IMAGE_AREA,
  NOVELAI_FREE_MAX_STEPS,
} from "@/components/aiImage/constants";
import {
  clamp01,
  clampIntRange,
  clampRange,
  cleanImportedPromptText,
  createProFeatureSectionState,
  extensionFromDataUrl,
  getClosestValidImageSize,
  getNovelAiImageArea,
  makeStableId,
  resolveImportedValue,
} from "@/components/aiImage/helpers";

const DEFAULT_INPAINT_STRENGTH = 1;
const DEFAULT_INPAINT_NOISE = 0;

export function applyImportedMetadataAction(args: {
  metadata: NovelAiImageMetadataResult;
  selection: MetadataImportSelectionState;
  uiMode: UiMode;
  simpleWidth: number;
  simpleHeight: number;
  proWidth: number;
  proHeight: number;
  v4Chars: V4CharEditorRow[];
  samplerOptions: readonly string[];
  noiseScheduleOptions: readonly string[];
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
}) {
  const {
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
  } = args;

  args.setIsPageImageDragOver(false);
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
      args.setSimpleConverted({
        prompt: importedPrompt,
        negativePrompt: importedNegativePrompt,
        raw: JSON.stringify(metadata.raw),
      });
      args.setSimpleConvertedFromText("");
      args.setSimplePromptTab("prompt");
    }

    if (selection.seed && settings.seed != null)
      args.setSimpleSeed(settings.seed);
    else if (selection.seed && selection.cleanImports)
      args.setSimpleSeed(DEFAULT_SIMPLE_IMAGE_SETTINGS.seed);

    if (selection.settings) {
      const cleanImports = selection.cleanImports;
      const normalizedImportedSize = getClosestValidImageSize(
        resolveImportedValue(settings.width, cleanImports, DEFAULT_SIMPLE_IMAGE_SETTINGS.width) ?? simpleWidth,
        resolveImportedValue(settings.height, cleanImports, DEFAULT_SIMPLE_IMAGE_SETTINGS.height) ?? simpleHeight,
      );
      args.setSimpleWidth(normalizedImportedSize.width);
      args.setSimpleHeight(normalizedImportedSize.height);
      args.setSimpleResolutionSelection(args.inferResolutionSelection(normalizedImportedSize.width, normalizedImportedSize.height));

      const importedStrength = resolveImportedValue(
        settings.strength,
        cleanImports,
        settings.mode === "infill" ? DEFAULT_INPAINT_STRENGTH : DEFAULT_SIMPLE_IMAGE_SETTINGS.strength,
      );
      const importedNoise = resolveImportedValue(
        settings.noise,
        cleanImports,
        settings.mode === "infill" ? DEFAULT_INPAINT_NOISE : DEFAULT_SIMPLE_IMAGE_SETTINGS.noise,
      );
      args.applyModeStrengthAndNoise("simple", settings.mode, importedStrength ?? undefined, importedNoise ?? undefined);
    }

    return;
  }

  args.setUiMode("pro");

  if (selection.settings) {
    args.clearSourceImageForUi("pro");
    args.setVibeTransferReferences([]);
    args.setPreciseReference(null);
    args.setProFeatureSectionOpen("baseImage", false);
    args.setProFeatureSectionOpen("vibeTransfer", false);
    args.setProFeatureSectionOpen("preciseReference", false);
  }

  if (selection.prompt && settings.prompt != null)
    args.setPrompt(shouldCleanImportedText ? cleanImportedPromptText(settings.prompt) : settings.prompt);
  else if (selection.prompt && selection.cleanImports)
    args.setPrompt("");

  if (selection.undesiredContent && settings.negativePrompt != null)
    args.setNegativePrompt(shouldCleanImportedText ? cleanImportedPromptText(settings.negativePrompt) : settings.negativePrompt);
  else if (selection.undesiredContent && selection.cleanImports)
    args.setNegativePrompt("");

  if (selection.seed && settings.seed != null)
    args.setProSeed(settings.seed);
  else if (selection.seed && selection.cleanImports)
    args.setProSeed(DEFAULT_PRO_IMAGE_SETTINGS.seed);
  if (selection.settings) {
    const cleanImports = selection.cleanImports;
    const normalizedImportedSize = getClosestValidImageSize(
      resolveImportedValue(settings.width, cleanImports, DEFAULT_PRO_IMAGE_SETTINGS.width) ?? proWidth,
      resolveImportedValue(settings.height, cleanImports, DEFAULT_PRO_IMAGE_SETTINGS.height) ?? proHeight,
    );
    args.setProWidth(normalizedImportedSize.width);
    args.setProHeight(normalizedImportedSize.height);
    args.setProResolutionSelection(args.inferResolutionSelection(normalizedImportedSize.width, normalizedImportedSize.height));
    args.setProImageCount(NOVELAI_FREE_FIXED_IMAGE_COUNT);
    const importedSteps = resolveImportedValue(settings.steps, cleanImports, DEFAULT_PRO_IMAGE_SETTINGS.steps);
    if (importedSteps != null)
      args.setProSteps(clampIntRange(importedSteps, 1, NOVELAI_FREE_MAX_STEPS, DEFAULT_PRO_IMAGE_SETTINGS.steps));
    const importedScale = resolveImportedValue(settings.scale, cleanImports, DEFAULT_PRO_IMAGE_SETTINGS.scale);
    if (importedScale != null)
      args.setProScale(clampRange(importedScale, 0, 20, DEFAULT_PRO_IMAGE_SETTINGS.scale));
    const importedSampler = resolveImportedValue(settings.sampler, cleanImports, samplerOptions[0] || DEFAULT_PRO_IMAGE_SETTINGS.sampler);
    if (importedSampler != null)
      args.setProSampler(importedSampler);
    const importedNoiseSchedule = resolveImportedValue(settings.noiseSchedule, cleanImports, noiseScheduleOptions[0] || DEFAULT_PRO_IMAGE_SETTINGS.noiseSchedule);
    if (importedNoiseSchedule != null)
      args.setProNoiseSchedule(importedNoiseSchedule);
    const importedCfgRescale = resolveImportedValue(settings.cfgRescale, cleanImports, DEFAULT_PRO_IMAGE_SETTINGS.cfgRescale);
    if (importedCfgRescale != null)
      args.setProCfgRescale(clampRange(importedCfgRescale, 0, 1, DEFAULT_PRO_IMAGE_SETTINGS.cfgRescale));
    const importedUcPreset = resolveImportedValue(settings.ucPreset, cleanImports, DEFAULT_PRO_IMAGE_SETTINGS.ucPreset);
    if (importedUcPreset != null)
      args.setProUcPreset(clampIntRange(importedUcPreset, 0, 2, DEFAULT_PRO_IMAGE_SETTINGS.ucPreset));
    const importedQualityToggle = resolveImportedValue(settings.qualityToggle, cleanImports, DEFAULT_PRO_IMAGE_SETTINGS.qualityToggle);
    if (importedQualityToggle != null)
      args.setProQualityToggle(Boolean(importedQualityToggle));
    const importedDynamicThresholding = resolveImportedValue(settings.dynamicThresholding, cleanImports, DEFAULT_PRO_IMAGE_SETTINGS.dynamicThresholding);
    if (importedDynamicThresholding != null)
      args.setProDynamicThresholding(Boolean(importedDynamicThresholding));
    const importedSmea = resolveImportedValue(settings.smea, cleanImports, DEFAULT_PRO_IMAGE_SETTINGS.smea);
    if (importedSmea != null)
      args.setProSmea(Boolean(importedSmea));
    const importedSmeaDyn = resolveImportedValue(settings.smeaDyn, cleanImports, DEFAULT_PRO_IMAGE_SETTINGS.smeaDyn);
    if (importedSmeaDyn != null)
      args.setProSmeaDyn(Boolean(importedSmeaDyn));
    const importedStrength = resolveImportedValue(
      settings.strength,
      cleanImports,
      settings.mode === "infill" ? DEFAULT_INPAINT_STRENGTH : DEFAULT_PRO_IMAGE_SETTINGS.strength,
    );
    const importedNoise = resolveImportedValue(
      settings.noise,
      cleanImports,
      settings.mode === "infill" ? DEFAULT_INPAINT_NOISE : DEFAULT_PRO_IMAGE_SETTINGS.noise,
    );
    args.applyModeStrengthAndNoise("pro", settings.mode, importedStrength ?? undefined, importedNoise ?? undefined);
    const importedV4UseCoords = resolveImportedValue(settings.v4UseCoords, cleanImports, false);
    if (importedV4UseCoords != null)
      args.setV4UseCoords(Boolean(importedV4UseCoords));
    const importedV4UseOrder = resolveImportedValue(settings.v4UseOrder, cleanImports, true);
    if (importedV4UseOrder != null)
      args.setV4UseOrder(Boolean(importedV4UseOrder));

    if (cleanImports || (settings.vibeTransferReferences?.length ?? 0) > 0)
      args.setVibeTransferReferences([]);

    if (cleanImports || settings.preciseReference)
      args.setPreciseReference(null);
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
    args.setV4Chars(nextChars);
    args.setCharPromptTabs(
      nextChars.reduce<Record<string, "prompt" | "negative">>((acc, item) => {
        acc[item.id] = "prompt";
        return acc;
      }, {}),
    );
    args.setProFeatureSectionOpen("characterPrompts", nextChars.length > 0);
  }
}

export function applyHistorySettingsAction(args: {
  row: AiImageHistoryRow;
  clickMode: Exclude<HistoryRowClickMode, "preview">;
  uiMode: UiMode;
  samplerOptions: readonly string[];
  noiseScheduleOptions: readonly string[];
  setSelectedHistoryPreviewKey: (value: string | null) => void;
  setSimpleSeed: (value: number) => void;
  setProSeed: (value: number) => void;
  showSuccessToast: (message: string) => void;
  restoreSourceImageForUi: (targetUiMode: UiMode, args: { dataUrl?: string | null; name: string; width?: number | null; height?: number | null }) => any;
  setSimpleText: (value: string) => void;
  setSimpleConverted: (value: any) => void;
  setSimpleConvertedFromText: (value: string) => void;
  setSimplePrompt: (value: string) => void;
  setSimpleNegativePrompt: (value: string) => void;
  setSimpleEditorMode: (value: "text" | "tags") => void;
  setSimplePromptTab: (value: "prompt" | "negative") => void;
  setSimpleWidth: (value: number) => void;
  setSimpleHeight: (value: number) => void;
  setSimpleResolutionSelection: (value: any) => void;
  applyModeStrengthAndNoise: (targetUiMode: UiMode, targetMode: any, nextStrength: number | undefined, nextNoise: number | undefined) => void;
  clearSourceImageForUi: (value: UiMode) => void;
  setPrompt: (value: string) => void;
  setNegativePrompt: (value: string) => void;
  setV4UseCoords: (value: boolean) => void;
  setV4UseOrder: (value: boolean) => void;
  setV4Chars: (value: V4CharEditorRow[]) => void;
  setCharPromptTabs: (value: Record<string, "prompt" | "negative">) => void;
  setVibeTransferReferences: (value: any[]) => void;
  setPreciseReference: (value: any) => void;
  setProFeatureSections: (value: Record<string, boolean>) => void;
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
  inferResolutionSelection: (width: number, height: number) => any;
}) {
  const { row, clickMode, uiMode, samplerOptions, noiseScheduleOptions } = args;
  const importSettings = clickMode === "settings" || clickMode === "settings-with-seed";
  const importSeed = clickMode === "seed" || clickMode === "settings-with-seed";
  args.setSelectedHistoryPreviewKey(`id:${row.id ?? `temp:${row.createdAt}-${row.seed}-${row.batchIndex ?? 0}`}`);

  if (!importSettings) {
    if (importSeed)
      if (uiMode === "simple")
        args.setSimpleSeed(row.seed);
      else
        args.setProSeed(row.seed);
    if (importSeed)
      args.showSuccessToast("宸插鍏ュ巻鍙?seed锛屽叾浠栬缃繚鎸佸綋鍓嶅€笺€?");
    return;
  }

  const normalizedSize = getClosestValidImageSize(row.width, row.height);
  const restoredSourceImage = args.restoreSourceImageForUi(uiMode, {
    dataUrl: row.sourceDataUrl,
    name: `history_${row.seed}.${extensionFromDataUrl(row.sourceDataUrl || row.dataUrl)}`,
    width: row.width,
    height: row.height,
  });

  if (uiMode === "simple") {
    args.setSimpleText("");
    args.setSimpleConverted(null);
    args.setSimpleConvertedFromText("");
    args.setSimplePrompt(row.prompt);
    args.setSimpleNegativePrompt(row.negativePrompt);
    args.setSimpleEditorMode("tags");
    args.setSimplePromptTab("prompt");
    args.setSimpleWidth(normalizedSize.width);
    args.setSimpleHeight(normalizedSize.height);
    args.setSimpleResolutionSelection(args.inferResolutionSelection(normalizedSize.width, normalizedSize.height));
    args.applyModeStrengthAndNoise(
      "simple",
      row.mode,
      resolveImportedValue(row.strength, true, row.mode === "infill" ? DEFAULT_INPAINT_STRENGTH : DEFAULT_SIMPLE_IMAGE_SETTINGS.strength) ?? undefined,
      resolveImportedValue(row.noise, true, row.mode === "infill" ? DEFAULT_INPAINT_NOISE : DEFAULT_SIMPLE_IMAGE_SETTINGS.noise) ?? undefined,
    );
    if (importSeed)
      args.setSimpleSeed(row.seed);
    args.showSuccessToast([
      importSeed ? "宸叉寜蹇€熸ā寮忓洖濉交閲忚缃笌 seed銆?" : "宸叉寜蹇€熸ā寮忓洖濉交閲忚缃€?",
      restoredSourceImage && row.mode === "infill" ? "Inpaint 鍘嗗彶宸叉寜 Base Img 鎭㈠銆?" : "",
      "楂樼骇椤逛繚鎸侀粯璁ゅ€笺€?",
    ].filter(Boolean).join(" "));
    return;
  }

  const droppedPaidSettings = [
    row.referenceImages?.length ? "Vibe Transfer" : "",
    row.preciseReference ? "Precise Reference" : "",
    (row.imageCount ?? row.batchSize ?? 1) > NOVELAI_FREE_FIXED_IMAGE_COUNT ? "澶氬紶鐢熸垚" : "",
    (row.steps ?? NOVELAI_FREE_MAX_STEPS) > NOVELAI_FREE_MAX_STEPS ? "楂樻鏁?" : "",
    getNovelAiImageArea(row.width, row.height) > NOVELAI_FREE_MAX_IMAGE_AREA ? "瓒呭昂瀵?" : "",
  ].filter(Boolean);

  if (!restoredSourceImage)
    args.clearSourceImageForUi("pro");
  args.setPrompt(row.prompt);
  args.setNegativePrompt(row.negativePrompt);
  args.setV4UseCoords(Boolean(row.v4UseCoords));
  args.setV4UseOrder(row.v4UseOrder == null ? true : Boolean(row.v4UseOrder));
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
  args.setV4Chars(restoredChars);
  args.setCharPromptTabs(
    restoredChars.reduce<Record<string, "prompt" | "negative">>((acc, item) => {
      acc[item.id] = "prompt";
      return acc;
    }, {}),
  );
  args.setVibeTransferReferences([]);
  args.setPreciseReference(null);
  args.setProFeatureSections(createProFeatureSectionState({
    baseImage: restoredSourceImage,
    characterPrompts: restoredChars.length > 0 ? true : DEFAULT_PRO_FEATURE_SECTION_OPEN.characterPrompts,
    vibeTransfer: false,
    preciseReference: false,
  }));
  if (importSeed)
    args.setProSeed(row.seed);
  args.setProWidth(normalizedSize.width);
  args.setProHeight(normalizedSize.height);
  args.setProResolutionSelection(args.inferResolutionSelection(normalizedSize.width, normalizedSize.height));
  args.setProImageCount(NOVELAI_FREE_FIXED_IMAGE_COUNT);
  args.setProSteps(clampIntRange(
    resolveImportedValue(row.steps, true, DEFAULT_PRO_IMAGE_SETTINGS.steps) ?? DEFAULT_PRO_IMAGE_SETTINGS.steps,
    1,
    NOVELAI_FREE_MAX_STEPS,
    DEFAULT_PRO_IMAGE_SETTINGS.steps,
  ));
  args.setProScale(clampRange(
    resolveImportedValue(row.scale, true, DEFAULT_PRO_IMAGE_SETTINGS.scale) ?? DEFAULT_PRO_IMAGE_SETTINGS.scale,
    0,
    20,
    DEFAULT_PRO_IMAGE_SETTINGS.scale,
  ));
  args.setProSampler(row.sampler || samplerOptions[0] || DEFAULT_PRO_IMAGE_SETTINGS.sampler);
  args.setProNoiseSchedule(row.noiseSchedule || noiseScheduleOptions[0] || DEFAULT_PRO_IMAGE_SETTINGS.noiseSchedule);
  args.setProCfgRescale(clampRange(
    resolveImportedValue(row.cfgRescale, true, DEFAULT_PRO_IMAGE_SETTINGS.cfgRescale) ?? DEFAULT_PRO_IMAGE_SETTINGS.cfgRescale,
    0,
    1,
    DEFAULT_PRO_IMAGE_SETTINGS.cfgRescale,
  ));
  args.setProUcPreset(clampIntRange(
    resolveImportedValue(row.ucPreset, true, DEFAULT_PRO_IMAGE_SETTINGS.ucPreset) ?? DEFAULT_PRO_IMAGE_SETTINGS.ucPreset,
    0,
    2,
    DEFAULT_PRO_IMAGE_SETTINGS.ucPreset,
  ));
  args.setProQualityToggle(resolveImportedValue(row.qualityToggle, true, DEFAULT_PRO_IMAGE_SETTINGS.qualityToggle) ?? DEFAULT_PRO_IMAGE_SETTINGS.qualityToggle);
  args.setProDynamicThresholding(resolveImportedValue(row.dynamicThresholding, true, DEFAULT_PRO_IMAGE_SETTINGS.dynamicThresholding) ?? DEFAULT_PRO_IMAGE_SETTINGS.dynamicThresholding);
  args.setProSmea(resolveImportedValue(row.smea, true, DEFAULT_PRO_IMAGE_SETTINGS.smea) ?? DEFAULT_PRO_IMAGE_SETTINGS.smea);
  args.setProSmeaDyn(resolveImportedValue(row.smeaDyn, true, DEFAULT_PRO_IMAGE_SETTINGS.smeaDyn) ?? DEFAULT_PRO_IMAGE_SETTINGS.smeaDyn);
  args.applyModeStrengthAndNoise(
    "pro",
    row.mode,
    resolveImportedValue(row.strength, true, row.mode === "infill" ? DEFAULT_INPAINT_STRENGTH : DEFAULT_PRO_IMAGE_SETTINGS.strength) ?? undefined,
    resolveImportedValue(row.noise, true, row.mode === "infill" ? DEFAULT_INPAINT_NOISE : DEFAULT_PRO_IMAGE_SETTINGS.noise) ?? undefined,
  );
  args.showSuccessToast([
    importSeed ? "宸插鍏ュ巻鍙茶缃笌 seed銆?" : "宸插鍏ュ巻鍙茶缃紝seed 淇濇寔褰撳墠鍊笺€?",
    restoredSourceImage && row.mode === "infill" ? "Inpaint 鍘嗗彶宸叉寜 Base Img 鎭㈠銆?" : "",
    droppedPaidSettings.length ? `宸茶嚜鍔ㄥ拷鐣ヤ細娑堣€?Anlas 鐨勯」锛?${droppedPaidSettings.join(" / ")}銆?` : "",
  ].filter(Boolean).join(" "));
}
