import type {
  HistoryRowClickMode,
  MetadataImportSelectionState,
  PreciseReferenceRow,
  ProFeatureSectionKey,
  ResolutionSelection,
  UiMode,
  V4CharEditorRow,
  VibeTransferReferenceRow,
} from "@/components/aiImage/types";
import type { AiImageHistoryMode, AiImageHistoryRow } from "@/utils/aiImageHistoryDb";
import type { NovelAiImageMetadataResult } from "@/utils/novelaiImageMetadata";
import type { NovelAiNl2TagsResult } from "@/utils/novelaiNl2Tags";

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

type ProFeatureSectionsState = Record<ProFeatureSectionKey, boolean>;
type ApplyModeStrengthAndNoise = (
  targetUiMode: UiMode,
  targetMode: AiImageHistoryMode | undefined,
  nextStrength: number | undefined,
  nextNoise: number | undefined,
) => void;
type InferResolutionSelection = (width: number, height: number) => ResolutionSelection;
type RestoreSourceImageForUi = (targetUiMode: UiMode, args: {
  dataUrl?: string | null;
  name: string;
  width?: number | null;
  height?: number | null;
}) => boolean;

interface SimpleMetadataControls {
  setSimpleConverted: (value: NovelAiNl2TagsResult | null) => void;
  setSimpleConvertedFromText: (value: string) => void;
  setSimplePromptTab: (value: "prompt" | "negative") => void;
  setSimpleSeed: (value: number) => void;
  setSimpleWidth: (value: number) => void;
  setSimpleHeight: (value: number) => void;
  setSimpleResolutionSelection: (value: ResolutionSelection) => void;
  setSimpleText: (value: string) => void;
  setSimplePrompt: (value: string) => void;
  setSimpleNegativePrompt: (value: string) => void;
  setSimpleEditorMode: (value: "text" | "tags") => void;
}

interface ProMetadataControls {
  setPrompt: (value: string) => void;
  setNegativePrompt: (value: string) => void;
  setProSeed: (value: number) => void;
  setProWidth: (value: number) => void;
  setProHeight: (value: number) => void;
  setProResolutionSelection: (value: ResolutionSelection) => void;
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
  setProFeatureSectionOpen: (section: ProFeatureSectionKey, open: boolean) => void;
  setProFeatureSections: (value: ProFeatureSectionsState) => void;
}

interface CharacterMetadataControls {
  setV4UseCoords: (value: boolean) => void;
  setV4UseOrder: (value: boolean) => void;
  setV4Chars: (value: V4CharEditorRow[]) => void;
  setCharPromptTabs: (value: Record<string, "prompt" | "negative">) => void;
}

interface ReferenceMetadataControls {
  setVibeTransferReferences: (value: VibeTransferReferenceRow[]) => void;
  setPreciseReference: (value: PreciseReferenceRow | null) => void;
}

interface SharedMetadataControls {
  setIsPageImageDragOver: (value: boolean) => void;
  setUiMode: (value: UiMode) => void;
  setSelectedHistoryPreviewKey: (value: string | null) => void;
  clearSourceImageForUi: (value: UiMode) => void;
  restoreSourceImageForUi: RestoreSourceImageForUi;
  applyModeStrengthAndNoise: ApplyModeStrengthAndNoise;
  inferResolutionSelection: InferResolutionSelection;
  showSuccessToast: (message: string) => void;
}

interface ImportedMetadataContext {
  uiMode: UiMode;
  simpleWidth: number;
  simpleHeight: number;
  proWidth: number;
  proHeight: number;
  v4Chars: V4CharEditorRow[];
  samplerOptions: readonly string[];
  noiseScheduleOptions: readonly string[];
}

export function applyImportedMetadataAction(args: {
  metadata: NovelAiImageMetadataResult;
  selection: MetadataImportSelectionState;
  current: ImportedMetadataContext;
  shared: Pick<SharedMetadataControls, "setIsPageImageDragOver" | "setUiMode" | "clearSourceImageForUi" | "applyModeStrengthAndNoise" | "inferResolutionSelection">;
  simple: Pick<SimpleMetadataControls, "setSimpleConverted" | "setSimpleConvertedFromText" | "setSimplePromptTab" | "setSimpleSeed" | "setSimpleWidth" | "setSimpleHeight" | "setSimpleResolutionSelection">;
  pro: Pick<ProMetadataControls, "setPrompt" | "setNegativePrompt" | "setProSeed" | "setProWidth" | "setProHeight" | "setProResolutionSelection" | "setProImageCount" | "setProSteps" | "setProScale" | "setProSampler" | "setProNoiseSchedule" | "setProCfgRescale" | "setProUcPreset" | "setProQualityToggle" | "setProDynamicThresholding" | "setProSmea" | "setProSmeaDyn" | "setProFeatureSectionOpen">;
  characters: CharacterMetadataControls;
  references: ReferenceMetadataControls;
}) {
  const {
    metadata,
    selection,
    current,
    shared,
    simple,
    pro,
    characters,
    references,
  } = args;

  shared.setIsPageImageDragOver(false);
  const shouldCleanImportedText = selection.cleanImports;
  const settings = metadata.settings;

  if (current.uiMode === "simple") {
    const importedPrompt = selection.prompt && settings.prompt != null
      ? (shouldCleanImportedText ? cleanImportedPromptText(settings.prompt) : settings.prompt)
      : "";
    const importedNegativePrompt = selection.undesiredContent && settings.negativePrompt != null
      ? (shouldCleanImportedText ? cleanImportedPromptText(settings.negativePrompt) : settings.negativePrompt)
      : "";

    if (importedPrompt || importedNegativePrompt) {
      simple.setSimpleConverted({
        prompt: importedPrompt,
        negativePrompt: importedNegativePrompt,
        raw: JSON.stringify(metadata.raw),
      });
      simple.setSimpleConvertedFromText("");
      simple.setSimplePromptTab("prompt");
    }

    if (selection.seed && settings.seed != null)
      simple.setSimpleSeed(settings.seed);
    else if (selection.seed && selection.cleanImports)
      simple.setSimpleSeed(DEFAULT_SIMPLE_IMAGE_SETTINGS.seed);

    if (selection.settings) {
      const cleanImports = selection.cleanImports;
      const normalizedImportedSize = getClosestValidImageSize(
        resolveImportedValue(settings.width, cleanImports, DEFAULT_SIMPLE_IMAGE_SETTINGS.width) ?? current.simpleWidth,
        resolveImportedValue(settings.height, cleanImports, DEFAULT_SIMPLE_IMAGE_SETTINGS.height) ?? current.simpleHeight,
      );
      simple.setSimpleWidth(normalizedImportedSize.width);
      simple.setSimpleHeight(normalizedImportedSize.height);
      simple.setSimpleResolutionSelection(shared.inferResolutionSelection(normalizedImportedSize.width, normalizedImportedSize.height));

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
      shared.applyModeStrengthAndNoise("simple", settings.mode, importedStrength ?? undefined, importedNoise ?? undefined);
    }

    return;
  }

  shared.setUiMode("pro");

  if (selection.settings) {
    shared.clearSourceImageForUi("pro");
    references.setVibeTransferReferences([]);
    references.setPreciseReference(null);
    pro.setProFeatureSectionOpen("baseImage", false);
    pro.setProFeatureSectionOpen("vibeTransfer", false);
    pro.setProFeatureSectionOpen("preciseReference", false);
  }

  if (selection.prompt && settings.prompt != null)
    pro.setPrompt(shouldCleanImportedText ? cleanImportedPromptText(settings.prompt) : settings.prompt);
  else if (selection.prompt && selection.cleanImports)
    pro.setPrompt("");

  if (selection.undesiredContent && settings.negativePrompt != null)
    pro.setNegativePrompt(shouldCleanImportedText ? cleanImportedPromptText(settings.negativePrompt) : settings.negativePrompt);
  else if (selection.undesiredContent && selection.cleanImports)
    pro.setNegativePrompt("");

  if (selection.seed && settings.seed != null)
    pro.setProSeed(settings.seed);
  else if (selection.seed && selection.cleanImports)
    pro.setProSeed(DEFAULT_PRO_IMAGE_SETTINGS.seed);

  if (selection.settings) {
    const cleanImports = selection.cleanImports;
    const normalizedImportedSize = getClosestValidImageSize(
      resolveImportedValue(settings.width, cleanImports, DEFAULT_PRO_IMAGE_SETTINGS.width) ?? current.proWidth,
      resolveImportedValue(settings.height, cleanImports, DEFAULT_PRO_IMAGE_SETTINGS.height) ?? current.proHeight,
    );
    pro.setProWidth(normalizedImportedSize.width);
    pro.setProHeight(normalizedImportedSize.height);
    pro.setProResolutionSelection(shared.inferResolutionSelection(normalizedImportedSize.width, normalizedImportedSize.height));
    pro.setProImageCount(NOVELAI_FREE_FIXED_IMAGE_COUNT);

    const importedSteps = resolveImportedValue(settings.steps, cleanImports, DEFAULT_PRO_IMAGE_SETTINGS.steps);
    if (importedSteps != null)
      pro.setProSteps(clampIntRange(importedSteps, 1, NOVELAI_FREE_MAX_STEPS, DEFAULT_PRO_IMAGE_SETTINGS.steps));

    const importedScale = resolveImportedValue(settings.scale, cleanImports, DEFAULT_PRO_IMAGE_SETTINGS.scale);
    if (importedScale != null)
      pro.setProScale(clampRange(importedScale, 0, 20, DEFAULT_PRO_IMAGE_SETTINGS.scale));

    const importedSampler = resolveImportedValue(settings.sampler, cleanImports, current.samplerOptions[0] || DEFAULT_PRO_IMAGE_SETTINGS.sampler);
    if (importedSampler != null)
      pro.setProSampler(importedSampler);

    const importedNoiseSchedule = resolveImportedValue(settings.noiseSchedule, cleanImports, current.noiseScheduleOptions[0] || DEFAULT_PRO_IMAGE_SETTINGS.noiseSchedule);
    if (importedNoiseSchedule != null)
      pro.setProNoiseSchedule(importedNoiseSchedule);

    const importedCfgRescale = resolveImportedValue(settings.cfgRescale, cleanImports, DEFAULT_PRO_IMAGE_SETTINGS.cfgRescale);
    if (importedCfgRescale != null)
      pro.setProCfgRescale(clampRange(importedCfgRescale, 0, 1, DEFAULT_PRO_IMAGE_SETTINGS.cfgRescale));

    const importedUcPreset = resolveImportedValue(settings.ucPreset, cleanImports, DEFAULT_PRO_IMAGE_SETTINGS.ucPreset);
    if (importedUcPreset != null)
      pro.setProUcPreset(clampIntRange(importedUcPreset, 0, 2, DEFAULT_PRO_IMAGE_SETTINGS.ucPreset));

    const importedQualityToggle = resolveImportedValue(settings.qualityToggle, cleanImports, DEFAULT_PRO_IMAGE_SETTINGS.qualityToggle);
    if (importedQualityToggle != null)
      pro.setProQualityToggle(Boolean(importedQualityToggle));

    const importedDynamicThresholding = resolveImportedValue(settings.dynamicThresholding, cleanImports, DEFAULT_PRO_IMAGE_SETTINGS.dynamicThresholding);
    if (importedDynamicThresholding != null)
      pro.setProDynamicThresholding(Boolean(importedDynamicThresholding));

    const importedSmea = resolveImportedValue(settings.smea, cleanImports, DEFAULT_PRO_IMAGE_SETTINGS.smea);
    if (importedSmea != null)
      pro.setProSmea(Boolean(importedSmea));

    const importedSmeaDyn = resolveImportedValue(settings.smeaDyn, cleanImports, DEFAULT_PRO_IMAGE_SETTINGS.smeaDyn);
    if (importedSmeaDyn != null)
      pro.setProSmeaDyn(Boolean(importedSmeaDyn));

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
    shared.applyModeStrengthAndNoise("pro", settings.mode, importedStrength ?? undefined, importedNoise ?? undefined);

    const importedV4UseCoords = resolveImportedValue(settings.v4UseCoords, cleanImports, false);
    if (importedV4UseCoords != null)
      characters.setV4UseCoords(Boolean(importedV4UseCoords));

    const importedV4UseOrder = resolveImportedValue(settings.v4UseOrder, cleanImports, true);
    if (importedV4UseOrder != null)
      characters.setV4UseOrder(Boolean(importedV4UseOrder));

    if (cleanImports || (settings.vibeTransferReferences?.length ?? 0) > 0)
      references.setVibeTransferReferences([]);

    if (cleanImports || settings.preciseReference)
      references.setPreciseReference(null);
  }

  if (selection.characters) {
    const importedChars = Array.isArray(settings.v4Chars)
      ? settings.v4Chars.map((item) => ({
          id: makeStableId(),
          prompt: shouldCleanImportedText ? cleanImportedPromptText(String(item.prompt || "")) : String(item.prompt || ""),
          negativePrompt: shouldCleanImportedText ? cleanImportedPromptText(String(item.negativePrompt || "")) : String(item.negativePrompt || ""),
          centerX: clamp01(item.centerX, 0.5),
          centerY: clamp01(item.centerY, 0.5),
        }))
      : [];
    const nextChars = importedChars.length
      ? (selection.appendCharacters ? [...current.v4Chars, ...importedChars] : importedChars)
      : (selection.cleanImports ? [] : current.v4Chars);

    characters.setV4Chars(nextChars);
    characters.setCharPromptTabs(
      nextChars.reduce<Record<string, "prompt" | "negative">>((acc, item) => {
        acc[item.id] = "prompt";
        return acc;
      }, {}),
    );
    pro.setProFeatureSectionOpen("characterPrompts", nextChars.length > 0);
  }
}

export function applyHistorySettingsAction(args: {
  row: AiImageHistoryRow;
  clickMode: Exclude<HistoryRowClickMode, "preview">;
  uiMode: UiMode;
  samplerOptions: readonly string[];
  noiseScheduleOptions: readonly string[];
  shared: Pick<SharedMetadataControls, "setSelectedHistoryPreviewKey" | "showSuccessToast" | "restoreSourceImageForUi" | "clearSourceImageForUi" | "applyModeStrengthAndNoise" | "inferResolutionSelection">;
  simple: Pick<SimpleMetadataControls, "setSimpleSeed" | "setSimpleText" | "setSimpleConverted" | "setSimpleConvertedFromText" | "setSimplePrompt" | "setSimpleNegativePrompt" | "setSimpleEditorMode" | "setSimplePromptTab" | "setSimpleWidth" | "setSimpleHeight" | "setSimpleResolutionSelection">;
  pro: Pick<ProMetadataControls, "setPrompt" | "setNegativePrompt" | "setProSeed" | "setProFeatureSections" | "setProWidth" | "setProHeight" | "setProResolutionSelection" | "setProImageCount" | "setProSteps" | "setProScale" | "setProSampler" | "setProNoiseSchedule" | "setProCfgRescale" | "setProUcPreset" | "setProQualityToggle" | "setProDynamicThresholding" | "setProSmea" | "setProSmeaDyn">;
  characters: CharacterMetadataControls;
  references: ReferenceMetadataControls;
}) {
  const {
    row,
    clickMode,
    uiMode,
    samplerOptions,
    noiseScheduleOptions,
    shared,
    simple,
    pro,
    characters,
    references,
  } = args;

  const importSettings = clickMode === "settings" || clickMode === "settings-with-seed";
  const importSeed = clickMode === "seed" || clickMode === "settings-with-seed";
  shared.setSelectedHistoryPreviewKey(`id:${row.id ?? `temp:${row.createdAt}-${row.seed}-${row.batchIndex ?? 0}`}`);

  if (!importSettings) {
    if (importSeed) {
      if (uiMode === "simple")
        simple.setSimpleSeed(row.seed);
      else
        pro.setProSeed(row.seed);
      shared.showSuccessToast("Seed applied from history.");
    }
    return;
  }

  const normalizedSize = getClosestValidImageSize(row.width, row.height);
  const restoredSourceImage = shared.restoreSourceImageForUi(uiMode, {
    dataUrl: row.sourceDataUrl,
    name: `history_${row.seed}.${extensionFromDataUrl(row.sourceDataUrl || row.dataUrl)}`,
    width: row.width,
    height: row.height,
  });

  if (uiMode === "simple") {
    simple.setSimpleText("");
    simple.setSimpleConverted(null);
    simple.setSimpleConvertedFromText("");
    simple.setSimplePrompt(row.prompt);
    simple.setSimpleNegativePrompt(row.negativePrompt);
    simple.setSimpleEditorMode("tags");
    simple.setSimplePromptTab("prompt");
    simple.setSimpleWidth(normalizedSize.width);
    simple.setSimpleHeight(normalizedSize.height);
    simple.setSimpleResolutionSelection(shared.inferResolutionSelection(normalizedSize.width, normalizedSize.height));
    shared.applyModeStrengthAndNoise(
      "simple",
      row.mode,
      resolveImportedValue(row.strength, true, row.mode === "infill" ? DEFAULT_INPAINT_STRENGTH : DEFAULT_SIMPLE_IMAGE_SETTINGS.strength) ?? undefined,
      resolveImportedValue(row.noise, true, row.mode === "infill" ? DEFAULT_INPAINT_NOISE : DEFAULT_SIMPLE_IMAGE_SETTINGS.noise) ?? undefined,
    );

    if (importSeed)
      simple.setSimpleSeed(row.seed);

    const successParts = [
      importSeed ? "History settings and seed applied." : "History settings applied.",
      restoredSourceImage && row.mode === "infill" ? "Base image restored for infill." : "",
    ];
    shared.showSuccessToast(successParts.filter(Boolean).join(" "));
    return;
  }

  const droppedPaidSettings = [
    row.referenceImages?.length ? "Vibe Transfer" : "",
    row.preciseReference ? "Precise Reference" : "",
    (row.imageCount ?? row.batchSize ?? 1) > NOVELAI_FREE_FIXED_IMAGE_COUNT ? "extra image count" : "",
    (row.steps ?? NOVELAI_FREE_MAX_STEPS) > NOVELAI_FREE_MAX_STEPS ? "step count" : "",
    getNovelAiImageArea(row.width, row.height) > NOVELAI_FREE_MAX_IMAGE_AREA ? "oversized resolution" : "",
  ].filter(Boolean);

  if (!restoredSourceImage)
    shared.clearSourceImageForUi("pro");

  pro.setPrompt(row.prompt);
  pro.setNegativePrompt(row.negativePrompt);
  characters.setV4UseCoords(Boolean(row.v4UseCoords));
  characters.setV4UseOrder(row.v4UseOrder == null ? true : Boolean(row.v4UseOrder));

  const restoredChars = Array.isArray(row.v4Chars)
    ? row.v4Chars.map((item) => ({
        id: makeStableId(),
        prompt: String(item.prompt || ""),
        negativePrompt: String(item.negativePrompt || ""),
        centerX: clamp01(item.centerX, 0.5),
        centerY: clamp01(item.centerY, 0.5),
      }))
    : [];
  characters.setV4Chars(restoredChars);
  characters.setCharPromptTabs(
    restoredChars.reduce<Record<string, "prompt" | "negative">>((acc, item) => {
      acc[item.id] = "prompt";
      return acc;
    }, {}),
  );

  references.setVibeTransferReferences([]);
  references.setPreciseReference(null);
  pro.setProFeatureSections(createProFeatureSectionState({
    baseImage: restoredSourceImage,
    characterPrompts: restoredChars.length > 0 ? true : DEFAULT_PRO_FEATURE_SECTION_OPEN.characterPrompts,
    vibeTransfer: false,
    preciseReference: false,
  }));

  if (importSeed)
    pro.setProSeed(row.seed);

  pro.setProWidth(normalizedSize.width);
  pro.setProHeight(normalizedSize.height);
  pro.setProResolutionSelection(shared.inferResolutionSelection(normalizedSize.width, normalizedSize.height));
  pro.setProImageCount(NOVELAI_FREE_FIXED_IMAGE_COUNT);
  pro.setProSteps(clampIntRange(
    resolveImportedValue(row.steps, true, DEFAULT_PRO_IMAGE_SETTINGS.steps) ?? DEFAULT_PRO_IMAGE_SETTINGS.steps,
    1,
    NOVELAI_FREE_MAX_STEPS,
    DEFAULT_PRO_IMAGE_SETTINGS.steps,
  ));
  pro.setProScale(clampRange(
    resolveImportedValue(row.scale, true, DEFAULT_PRO_IMAGE_SETTINGS.scale) ?? DEFAULT_PRO_IMAGE_SETTINGS.scale,
    0,
    20,
    DEFAULT_PRO_IMAGE_SETTINGS.scale,
  ));
  pro.setProSampler(row.sampler || samplerOptions[0] || DEFAULT_PRO_IMAGE_SETTINGS.sampler);
  pro.setProNoiseSchedule(row.noiseSchedule || noiseScheduleOptions[0] || DEFAULT_PRO_IMAGE_SETTINGS.noiseSchedule);
  pro.setProCfgRescale(clampRange(
    resolveImportedValue(row.cfgRescale, true, DEFAULT_PRO_IMAGE_SETTINGS.cfgRescale) ?? DEFAULT_PRO_IMAGE_SETTINGS.cfgRescale,
    0,
    1,
    DEFAULT_PRO_IMAGE_SETTINGS.cfgRescale,
  ));
  pro.setProUcPreset(clampIntRange(
    resolveImportedValue(row.ucPreset, true, DEFAULT_PRO_IMAGE_SETTINGS.ucPreset) ?? DEFAULT_PRO_IMAGE_SETTINGS.ucPreset,
    0,
    2,
    DEFAULT_PRO_IMAGE_SETTINGS.ucPreset,
  ));
  pro.setProQualityToggle(resolveImportedValue(row.qualityToggle, true, DEFAULT_PRO_IMAGE_SETTINGS.qualityToggle) ?? DEFAULT_PRO_IMAGE_SETTINGS.qualityToggle);
  pro.setProDynamicThresholding(resolveImportedValue(row.dynamicThresholding, true, DEFAULT_PRO_IMAGE_SETTINGS.dynamicThresholding) ?? DEFAULT_PRO_IMAGE_SETTINGS.dynamicThresholding);
  pro.setProSmea(resolveImportedValue(row.smea, true, DEFAULT_PRO_IMAGE_SETTINGS.smea) ?? DEFAULT_PRO_IMAGE_SETTINGS.smea);
  pro.setProSmeaDyn(resolveImportedValue(row.smeaDyn, true, DEFAULT_PRO_IMAGE_SETTINGS.smeaDyn) ?? DEFAULT_PRO_IMAGE_SETTINGS.smeaDyn);
  shared.applyModeStrengthAndNoise(
    "pro",
    row.mode,
    resolveImportedValue(row.strength, true, row.mode === "infill" ? DEFAULT_INPAINT_STRENGTH : DEFAULT_PRO_IMAGE_SETTINGS.strength) ?? undefined,
    resolveImportedValue(row.noise, true, row.mode === "infill" ? DEFAULT_INPAINT_NOISE : DEFAULT_PRO_IMAGE_SETTINGS.noise) ?? undefined,
  );

  const successParts = [
    importSeed ? "History settings and seed applied." : "History settings applied.",
    restoredSourceImage && row.mode === "infill" ? "Base image restored for infill." : "",
    droppedPaidSettings.length ? `Skipped free-tier-incompatible settings: ${droppedPaidSettings.join(", ")}.` : "",
  ];
  shared.showSuccessToast(successParts.filter(Boolean).join(" "));
}
