import type {
  HistoryRowClickMode,
  MetadataImportSelectionState,
  ProFeatureSectionKey,
} from "@/components/aiImage/types";
import type { NovelAiImportedSettings } from "@/utils/novelaiImageMetadata";

import { DEFAULT_PRO_FEATURE_SECTION_OPEN } from "@/components/aiImage/constants";

export function resolveImportedValue<T>(value: T | null | undefined, cleanImports: boolean, fallback: T): T | undefined {
  if (value != null)
    return value;
  return cleanImports ? fallback : undefined;
}

export function hasNonEmptyText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

export function hasMetadataSettingsPayload(settings: NovelAiImportedSettings) {
  return (
    settings.mode != null
    || settings.width != null
    || settings.height != null
    || settings.imageCount != null
    || settings.steps != null
    || settings.scale != null
    || settings.sampler != null
    || settings.noiseSchedule != null
    || settings.cfgRescale != null
    || settings.ucPreset != null
    || settings.qualityToggle != null
    || settings.dynamicThresholding != null
    || settings.smea != null
    || settings.smeaDyn != null
    || settings.strength != null
    || settings.noise != null
    || settings.v4UseCoords != null
    || settings.v4UseOrder != null
    || (settings.vibeTransferReferences?.length ?? 0) > 0
    || settings.preciseReference != null
  );
}

export function createMetadataImportSelection(settings: NovelAiImportedSettings): MetadataImportSelectionState {
  return {
    prompt: hasNonEmptyText(settings.prompt),
    undesiredContent: hasNonEmptyText(settings.negativePrompt),
    characters: Array.isArray(settings.v4Chars) && settings.v4Chars.length > 0,
    appendCharacters: false,
    settings: hasMetadataSettingsPayload(settings),
    seed: settings.seed != null,
    cleanImports: false,
  };
}

export function createProFeatureSectionState(overrides?: Partial<Record<ProFeatureSectionKey, boolean>>) {
  return {
    ...DEFAULT_PRO_FEATURE_SECTION_OPEN,
    ...overrides,
  };
}

export function resolveHistoryRowClickMode(modifiers: {
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}): HistoryRowClickMode {
  if (modifiers.metaKey || modifiers.ctrlKey)
    return modifiers.shiftKey ? "settings-with-seed" : "settings";
  return modifiers.shiftKey ? "seed" : "preview";
}
