import type { ComponentProps, Dispatch, RefObject, SetStateAction } from "react";

import { useMemo } from "react";

import { AiImageHistoryPane } from "@/components/aiImage/AiImageHistoryPane";
import { AiImagePreviewPane } from "@/components/aiImage/AiImagePreviewPane";
import { AiImageWorkspace } from "@/components/aiImage/AiImageWorkspace";
import { InpaintDialog } from "@/components/aiImage/InpaintDialog";
import { MetadataImportDialog } from "@/components/aiImage/MetadataImportDialog";
import { PreviewImageDialog } from "@/components/aiImage/PreviewImageDialog";
import { StylePickerDialog } from "@/components/aiImage/StylePickerDialog";
import type {
  MetadataImportSelectionState,
  PreciseReferenceRow,
  ProFeatureSectionKey,
  V4CharGender,
  ResolutionPreset,
  ResolutionSelection,
  UiMode,
  V4CharEditorRow,
  VibeTransferReferenceRow,
} from "@/components/aiImage/types";
import type { AiImageHistoryMode } from "@/utils/aiImageHistoryDb";
import type { NovelAiNl2TagsResult } from "@/utils/novelaiNl2Tags";
import type { AiImageStylePreset } from "@/utils/aiImageStylePresets";

import { buildInpaintDialogProps, buildMetadataImportDialogProps, buildPreviewImageDialogProps, buildSidebarProps, buildStylePickerDialogProps, buildWorkspaceProps } from "@/components/aiImage/controller/buildViewModels";
import { generatedItemKey } from "@/components/aiImage/helpers";

type WorkspaceProps = ComponentProps<typeof AiImageWorkspace>;
type PreviewPaneProps = ComponentProps<typeof AiImagePreviewPane>;
type HistoryPaneProps = Omit<ComponentProps<typeof AiImageHistoryPane>, "isDirectorToolsOpen" | "onCollapse">;
type MetadataImportDialogProps = ComponentProps<typeof MetadataImportDialog>;
type PreviewImageDialogProps = ComponentProps<typeof PreviewImageDialog>;
type InpaintDialogProps = ComponentProps<typeof InpaintDialog>;
type StylePickerDialogProps = ComponentProps<typeof StylePickerDialog>;
type RunGenerate = (args?: {
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
}) => Promise<boolean>;

interface SidebarViewModelArgs {
  activeResolutionPreset: ResolutionPreset | null;
  baseImageDescription: string;
  canAddVibeReference: boolean;
  canConvertSimpleText: boolean;
  canGenerate: boolean;
  canGenerateFromSimpleTags: boolean;
  canTriggerProGenerate: boolean;
  cfgRescale: number;
  charPromptTabs: Record<string, "prompt" | "negative">;
  characterPromptDescription: string;
  fixedModelDescription: string;
  freeGenerationViolation: string | null;
  hasSimpleTagsDraft: boolean;
  isBusy: boolean;
  handleAddV4Char: (options?: { defaultPrompt?: string; gender?: V4CharGender }) => void;
  handleClearSeed: () => void;
  handleClearCurrentDisplayedImage: () => void;
  handleOpenSourceImagePicker: () => void;
  handleClearSourceImage: () => void;
  handleClearInfillMask: () => void;
  handleClearSimpleDraft: () => void;
  handleClearStyles: () => void;
  handleCropToClosestValidSize: () => void | Promise<void>;
  handleMoveV4Char: (id: string, direction: -1 | 1) => void;
  handleRemoveV4Char: (id: string) => void;
  handleRemoveVibeReference: (id: string) => void;
  handleAcceptSimpleConverted: () => void;
  handleRejectSimpleConverted: () => void;
  handleCommitProDimensions: () => void;
  handleCommitSimpleDimensions: () => void;
  handleResetCurrentImageSettings: () => void;
  handleReturnToSimpleTags: () => void;
  handleReturnToSimpleText: () => void;
  handleSelectProResolutionPreset: (selection: ResolutionSelection) => void;
  handleSelectSimpleResolutionPreset: (selection: ResolutionSelection) => void;
  handleSimpleConvertToTags: () => void | Promise<void>;
  handleSimpleGenerateFromTags: () => void | Promise<void>;
  handleProHeightChange: (value: string) => void;
  handleProWidthChange: (value: string) => void;
  handleSimpleHeightChange: (value: string) => void;
  handleSimpleWidthChange: (value: string) => void;
  handleSwapImageDimensions: () => void;
  handleUpdateV4Char: (id: string, patch: Partial<V4CharEditorRow>) => void;
  handleUpdateVibeReference: (id: string, patch: Partial<VibeTransferReferenceRow>) => void;
  handleOpenBaseImageInpaint: () => void;
  handleReturnFromInfillSettings: () => void;
  handleSetV4UseCoords: (nextValue: boolean) => void;
  hasReferenceConflict: boolean;
  height: number;
  heightInput: string;
  imageCount: number;
  imageCountLimit: number;
  infillMaskDataUrl: string;
  isDirectorToolsOpen: boolean;
  isNAI3: boolean;
  isNAI4: boolean;
  isPageImageDragOver: boolean;
  mode: AiImageHistoryMode;
  model: string;
  negativePrompt: string;
  noise: number;
  noiseSchedule: string;
  noiseScheduleOptions: readonly string[];
  normalizeReferenceStrengths: boolean;
  preciseReference: PreciseReferenceRow | null;
  preciseReferenceDescription: string;
  preciseReferenceInputRef: RefObject<HTMLInputElement | null>;
  proFeatureSections: Record<ProFeatureSectionKey, boolean>;
  proGenerateLabel: string;
  proPromptTab: "prompt" | "negative";
  proResolutionSelection: ResolutionSelection;
  prompt: string;
  qualityToggle: boolean;
  runGenerate: RunGenerate;
  sampler: string;
  samplerOptions: readonly string[];
  scale: number;
  seed: number;
  seedIsRandom: boolean;
  selectedStyleIds: string[];
  selectedStyleNegativeTags: string[];
  selectedStylePresets: AiImageStylePreset[];
  selectedStyleTags: string[];
  setCfgRescale: (value: number) => void;
  setCharPromptTabs: Dispatch<SetStateAction<Record<string, "prompt" | "negative">>>;
  setDynamicThresholding: (value: boolean) => void;
  setHeight: (value: number) => void;
  setImageCount: (value: number) => void;
  setIsStylePickerOpen: Dispatch<SetStateAction<boolean>>;
  setNegativePrompt: (value: string) => void;
  setNoise: (value: number) => void;
  setNoiseSchedule: (value: string) => void;
  setNormalizeReferenceStrengths: Dispatch<SetStateAction<boolean>>;
  setPreciseReference: Dispatch<SetStateAction<PreciseReferenceRow | null>>;
  setProFeatureSectionOpen: (section: ProFeatureSectionKey, open: boolean) => void;
  setProPromptTab: Dispatch<SetStateAction<"prompt" | "negative">>;
  setPrompt: (value: string) => void;
  setQualityToggle: (value: boolean) => void;
  setSampler: (value: string) => void;
  setScale: (value: number) => void;
  setSeed: (value: number) => void;
  setSimpleEditorMode: Dispatch<SetStateAction<"text" | "tags">>;
  setSimpleConverted: Dispatch<SetStateAction<NovelAiNl2TagsResult | null>>;
  setSimpleConvertedFromText: Dispatch<SetStateAction<string>>;
  setSimpleNegativePrompt: Dispatch<SetStateAction<string>>;
  setSimplePromptTab: Dispatch<SetStateAction<"prompt" | "negative">>;
  setSimplePrompt: Dispatch<SetStateAction<string>>;
  setSimpleText: Dispatch<SetStateAction<string>>;
  setSmea: (value: boolean) => void;
  setSmeaDyn: (value: boolean) => void;
  setSteps: (value: number) => void;
  setStrength: (value: number) => void;
  setUcPreset: (value: number) => void;
  setUiMode: Dispatch<SetStateAction<UiMode>>;
  setV4Chars: Dispatch<SetStateAction<V4CharEditorRow[]>>;
  setV4UseOrder: Dispatch<SetStateAction<boolean>>;
  setWidth: (value: number) => void;
  simpleConvertLabel: string;
  simpleConverting: boolean;
  simpleEditorMode: "text" | "tags";
  simpleConverted: NovelAiNl2TagsResult | null;
  simpleNegativePrompt: string;
  simplePromptTab: "prompt" | "negative";
  simplePrompt: string;
  simpleResolutionArea: number;
  simpleResolutionSelection: ResolutionSelection;
  simpleText: string;
  smea: boolean;
  smeaDyn: boolean;
  sourceImageDataUrl: string;
  hasCurrentDisplayedImage: boolean;
  steps: number;
  strength: number;
  toggleProFeatureSection: (section: ProFeatureSectionKey) => void;
  ucPreset: number;
  ucPresetEnabled: boolean;
  uiMode: UiMode;
  v4Chars: V4CharEditorRow[];
  v4UseCoords: boolean;
  v4UseOrder: boolean;
  vibeReferenceInputRef: RefObject<HTMLInputElement | null>;
  vibeTransferDescription: string;
  vibeTransferReferences: VibeTransferReferenceRow[];
  width: number;
  widthInput: string;
}

export function useAiImageWorkspaceProps(args: WorkspaceProps) {
  const {
    isDirectorToolsOpen,
    previewPaneProps,
    historyPaneProps,
    pinnedPreviewResult,
    onClearPinnedPreview,
    onJumpToPinnedPreview,
    onApplyPinnedPreviewSeed,
  } = args;

  return useMemo(() => buildWorkspaceProps({
    isDirectorToolsOpen,
    previewPaneProps,
    historyPaneProps,
    pinnedPreviewResult,
    onClearPinnedPreview,
    onJumpToPinnedPreview,
    onApplyPinnedPreviewSeed,
  }), [
    historyPaneProps,
    isDirectorToolsOpen,
    onApplyPinnedPreviewSeed,
    onClearPinnedPreview,
    onJumpToPinnedPreview,
    pinnedPreviewResult,
    previewPaneProps,
  ]);
}

export function useAiImageSidebarProps(args: SidebarViewModelArgs) {
  const {
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
    handleClearStyles,
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
  } = args;

  return useMemo(() => buildSidebarProps({
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
    handleClearStyles,
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
  }), [
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
    handleAcceptSimpleConverted,
    handleAddV4Char,
    handleClearCurrentDisplayedImage,
    handleClearInfillMask,
    handleClearSeed,
    handleClearSimpleDraft,
    handleClearSourceImage,
    handleClearStyles,
    handleCommitProDimensions,
    handleCommitSimpleDimensions,
    handleCropToClosestValidSize,
    handleMoveV4Char,
    handleOpenBaseImageInpaint,
    handleOpenSourceImagePicker,
    handleProHeightChange,
    handleProWidthChange,
    handleRejectSimpleConverted,
    handleRemoveV4Char,
    handleRemoveVibeReference,
    handleResetCurrentImageSettings,
    handleReturnFromInfillSettings,
    handleReturnToSimpleTags,
    handleReturnToSimpleText,
    handleSelectProResolutionPreset,
    handleSelectSimpleResolutionPreset,
    handleSetV4UseCoords,
    handleSimpleConvertToTags,
    handleSimpleGenerateFromTags,
    handleSimpleHeightChange,
    handleSimpleWidthChange,
    handleSwapImageDimensions,
    handleUpdateV4Char,
    handleUpdateVibeReference,
    hasCurrentDisplayedImage,
    hasReferenceConflict,
    hasSimpleTagsDraft,
    height,
    heightInput,
    imageCount,
    imageCountLimit,
    infillMaskDataUrl,
    isBusy,
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
    setSimpleConverted,
    setSimpleConvertedFromText,
    setSimpleEditorMode,
    setSimpleNegativePrompt,
    setSimplePrompt,
    setSimplePromptTab,
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
    simpleConverted,
    simpleEditorMode,
    simpleNegativePrompt,
    simplePrompt,
    simplePromptTab,
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
    widthInput,
  ]);
}

export function useAiImageDialogViewModels(args: {
  metadataImportDialogProps: MetadataImportDialogProps;
  previewImageDialogProps: PreviewImageDialogProps;
  inpaintDialogProps: InpaintDialogProps;
  stylePickerDialogProps: StylePickerDialogProps;
}) {
  const {
    metadataImportDialogProps,
    previewImageDialogProps,
    inpaintDialogProps,
    stylePickerDialogProps,
  } = args;

  const stableMetadataImportDialogProps = useMemo(() => buildMetadataImportDialogProps(metadataImportDialogProps), [
    metadataImportDialogProps,
  ]);
  const stablePreviewImageDialogProps = useMemo(() => buildPreviewImageDialogProps(previewImageDialogProps), [
    previewImageDialogProps,
  ]);
  const stableInpaintDialogProps = useMemo(() => buildInpaintDialogProps(inpaintDialogProps), [
    inpaintDialogProps,
  ]);
  const stableStylePickerDialogProps = useMemo(() => buildStylePickerDialogProps(stylePickerDialogProps), [
    stylePickerDialogProps,
  ]);

  return {
    metadataImportDialogProps: stableMetadataImportDialogProps,
    previewImageDialogProps: stablePreviewImageDialogProps,
    inpaintDialogProps: stableInpaintDialogProps,
    stylePickerDialogProps: stableStylePickerDialogProps,
  };
}

export function createAiImageWorkspaceProps(args: {
  isDirectorToolsOpen: boolean;
  previewPaneProps: PreviewPaneProps;
  historyPaneProps: HistoryPaneProps;
  pinnedPreviewResult: WorkspaceProps["pinnedPreviewResult"];
  onClearPinnedPreview: WorkspaceProps["onClearPinnedPreview"];
  onJumpToPinnedPreview: WorkspaceProps["onJumpToPinnedPreview"];
  onApplyPinnedPreviewSeed: WorkspaceProps["onApplyPinnedPreviewSeed"];
}): WorkspaceProps {
  return {
    isDirectorToolsOpen: args.isDirectorToolsOpen,
    previewPaneProps: args.previewPaneProps,
    historyPaneProps: args.historyPaneProps,
    pinnedPreviewResult: args.pinnedPreviewResult,
    onClearPinnedPreview: args.onClearPinnedPreview,
    onJumpToPinnedPreview: args.onJumpToPinnedPreview,
    onApplyPinnedPreviewSeed: args.onApplyPinnedPreviewSeed,
  };
}

export function createAiImagePreviewPaneProps(args: PreviewPaneProps): PreviewPaneProps {
  return args;
}

export function createAiImageHistoryPaneProps(args: {
  history: HistoryPaneProps["history"];
  mode: HistoryPaneProps["mode"];
  currentResultCards: HistoryPaneProps["currentResultCards"];
  archivedHistoryRows: HistoryPaneProps["archivedHistoryRows"];
  selectedHistoryPreviewKey: HistoryPaneProps["selectedHistoryPreviewKey"];
  selectedResultIndex: HistoryPaneProps["selectedResultIndex"];
  directorInputPreview: PreviewPaneProps["directorInputPreview"];
  isHistoryExpanded: HistoryPaneProps["isHistoryExpanded"];
  onHistoryExpandedChange: HistoryPaneProps["onHistoryExpandedChange"];
  onCurrentResultCardClick: HistoryPaneProps["onCurrentResultCardClick"];
  onHistoryRowClick: HistoryPaneProps["onHistoryRowClick"];
  onHistoryImageDragStart: HistoryPaneProps["onHistoryImageDragStart"];
  onDeleteHistoryRow: HistoryPaneProps["onDeleteHistoryRow"];
  onDownloadAll: HistoryPaneProps["onDownloadAll"];
  onClearHistory: HistoryPaneProps["onClearHistory"];
}): HistoryPaneProps {
  return {
    history: args.history,
    mode: args.mode,
    currentResultCards: args.currentResultCards,
    archivedHistoryRows: args.archivedHistoryRows,
    selectedHistoryPreviewKey: args.selectedHistoryPreviewKey,
    selectedResultIndex: args.selectedResultIndex,
    directorInputPreviewKey: args.directorInputPreview ? generatedItemKey(args.directorInputPreview) : undefined,
    isHistoryExpanded: args.isHistoryExpanded,
    onHistoryExpandedChange: args.onHistoryExpandedChange,
    onCurrentResultCardClick: args.onCurrentResultCardClick,
    onHistoryRowClick: args.onHistoryRowClick,
    onHistoryImageDragStart: args.onHistoryImageDragStart,
    onDeleteHistoryRow: args.onDeleteHistoryRow,
    onDownloadAll: args.onDownloadAll,
    onClearHistory: args.onClearHistory,
  };
}
