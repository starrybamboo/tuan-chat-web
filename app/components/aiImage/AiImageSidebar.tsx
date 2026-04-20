import type { AiImagePageController } from "@/components/aiImage/useAiImagePageController";
import { ArrowClockwise, ArrowCounterClockwise, CaretDownIcon, CaretLeftIcon, CaretUpIcon, CheckCircleIcon, CircleIcon, CircleNotch, DiceFiveIcon, FileArrowUpIcon, GenderFemaleIcon, GenderMaleIcon, GearSixIcon, ImageSquareIcon, ImagesSquareIcon, PencilSimpleLineIcon, PlusIcon, SelectionPlusIcon, SparkleIcon, TrashIcon, XCircleIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import preciseReferenceIconSrc from "@/components/aiImage/assets/precise-reference.png";
import vibeTransferIconSrc from "@/components/aiImage/assets/vibe-transfer.png";
import {
  CUSTOM_RESOLUTION_ID,
  DEFAULT_PRO_IMAGE_SETTINGS,
  NOVELAI_FREE_MAX_STEPS,
  RESOLUTION_PRESETS,
  SAMPLER_LABELS,
  SCHEDULE_LABELS,
  SIMPLE_MODE_CUSTOM_MAX_DIMENSION,
  UC_PRESET_OPTIONS,
} from "@/components/aiImage/constants";
import {
  clamp01,
  clampIntRange,
  clampRange,
  formatSliderValue,
  getV4CharGridCellByCenter,
  getV4CharGridCellByCode,
  insertNovelAiRandomTags,
  modelLabel,
  resolveNovelAiRandomTagTarget,
  V4_CHAR_GRID_CELLS,
} from "@/components/aiImage/helpers";
import { HighlightEmphasisTextarea } from "@/components/aiImage/HighlightEmphasisTextarea";
import { AiImageContextLimitMeter } from "@/components/aiImage/AiImageContextLimitMeter";
import { NOVELAI_V45_CONTEXT_LIMIT, useNovelAiV45TokenSnapshot } from "@/components/aiImage/novelaiV45TokenMeter";
import { ReferenceActionIcon } from "@/components/aiImage/ReferenceActionIcon";
import { ChevronDown } from "@/icons";
import { ProFeatureSection } from "@/components/aiImage/ProFeatureSection";

interface AiImageSidebarProps {
  sidebarProps: AiImagePageController["sidebarProps"];
}

const MODE_OPTIONS = [
  {
    value: "simple",
    label: "快速模式",
    description: "通过自然语言描述角色",
  },
  {
    value: "pro",
    label: "专家模式",
    description: "通过 NovelAI Tags 描述角色",
  },
] as const;

const MODE_MODEL_LABEL = "NAI Diffusion V4.5 Curated";
const MODE_SELECTOR_TRANSITION_MS = 180;
type ModeOptionValue = (typeof MODE_OPTIONS)[number]["value"];

export function AiImageSidebar({ sidebarProps }: AiImageSidebarProps) {
  const {
    canConvertSimpleText,
    canGenerate,
    canGenerateFromSimpleTags,
    canTriggerProGenerate,
    cfgRescale,
    charPromptTabs,
    characterPromptDescription,
    hasSimpleTagsDraft,
    isBusy,
    handleAddV4Char,
    handleClearSeed,
    handleClearCurrentDisplayedImage,
    handleClearSourceImage,
    handleClearSimpleDraft,
    handleOpenSourceImagePicker,
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
    handleOpenBaseImageInpaint,
    handleClearInfillMask,
    handleReturnFromInfillSettings,
    hasCurrentDisplayedImage,
    imageCount,
    infillMaskDataUrl,
    isDirectorToolsOpen,
    isNAI3,
    isNAI4,
    mode,
    model,
    negativePrompt,
    noise,
    noiseSchedule,
    noiseScheduleOptions,
    preciseReferenceDescription,
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
    selectedStylePresets,
    selectedStyleTags,
    setCfgRescale,
    setCharPromptTabs,
    setImageCount,
    setIsStylePickerOpen,
    setNegativePrompt,
    setNoise,
    setNoiseSchedule,
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
    handleSetV4UseCoords,
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
    uiMode,
    v4Chars,
    v4UseCoords,
    v4UseOrder,
    vibeTransferDescription,
    widthInput,
    heightInput,
  } = sidebarProps;

  const sideCardClassName = "card border-x-0 border-b border-t-0 border-[#D6DCE3] bg-[#F3F5F7] shadow-none dark:border-[#2A3138] dark:bg-[#161A1F]";
  const editorPanelClassName = "rounded-2xl border border-[#D6DCE3] bg-[#F3F5F7] p-3 shadow-none dark:border-[#2A3138] dark:bg-[#161A1F]";
  const segmentedControlClassName = "join rounded-xl bg-transparent p-0";
  const segmentedButtonBaseClassName = "btn btn-xs join-item border-0";
  const featureUploadActionClassName = "inline-flex size-11 items-center justify-center rounded-md border border-[#2A3138] bg-[#161A1F] text-base-content/78 transition hover:border-primary/40 hover:text-primary focus:outline-none";
  const characterAddTriggerClassName = "inline-flex h-8 items-center gap-1 rounded-md border border-[#2A3138] bg-[#161A1F] px-2.5 text-[13px] font-semibold text-base-content transition hover:border-primary/40 hover:text-primary focus:outline-none";
  const characterAddMenuPanelClassName = "absolute right-0 top-0 z-30 w-[139.72px] overflow-hidden border border-[#2A3138] bg-[#161A1F] shadow-2xl";
  const characterAddMenuItemClassName = "flex h-8 w-full items-center gap-1.5 px-3 text-left text-[13px] font-medium leading-none text-base-content/92 transition hover:bg-white/6 focus:outline-none";
  const characterCardClassName = "relative overflow-hidden rounded-2xl border border-[#2A3138] bg-[#161A1F] p-3 shadow-none";
  const characterCardHeaderActionClassName = "inline-flex size-7 items-center justify-center rounded-md text-white/56 transition hover:bg-white/6 hover:text-white focus:outline-none disabled:cursor-not-allowed disabled:opacity-35";
  const characterCardTitleIconClassName = "size-4 shrink-0 text-white/80";
  const characterPositionsSectionClassName = "flex items-center justify-between gap-3 bg-[#161A1F] py-3 pr-4";
  const characterPositionsToggleBaseClassName = "inline-flex h-9 min-w-[110px] items-center justify-center rounded-md border px-3 text-[14px] font-semibold transition whitespace-nowrap focus:outline-none focus-visible:outline-none";
  const promptTextareaClassName = "textarea textarea-bordered !rounded-none min-h-36 w-full resize-none border-[#D6DCE3] bg-[#F3F5F7] text-base-content leading-7 transition-colors hover:border-primary active:border-primary focus:border-primary focus:bg-primary/[0.03] focus:outline-none dark:border-[#2A3138] dark:bg-[#161A1F] dark:hover:border-primary";
  const simplePromptTextareaClassName = promptTextareaClassName;
  const subtleInputClassName = "input input-bordered input-sm !rounded-none border-[#D6DCE3] bg-[#F3F5F7] text-base-content dark:border-[#2A3138] dark:bg-[#161A1F]";
  const subtleSelectClassName = "select select-bordered select-sm !rounded-none border-[#D6DCE3] bg-[#F3F5F7] text-base-content dark:border-[#2A3138] dark:bg-[#161A1F]";
  const simpleResolutionValueInputClassName = "min-w-0 appearance-none bg-transparent text-center text-xs font-semibold leading-none tabular-nums text-base-content focus:outline-none [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";
  const highlightPromptSurfaceClassName = "relative min-h-36 w-full overflow-hidden !rounded-none border border-[#D6DCE3] bg-[#F3F5F7] shadow-none transition-colors hover:border-primary active:border-primary focus-within:border-primary focus-within:bg-primary/[0.03] dark:border-[#2A3138] dark:bg-[#161A1F] dark:hover:border-primary";
  const highlightPromptContentClassName = "min-h-36 px-3 py-2 text-sm leading-6";
  const highlightCharSurfaceClassName = "relative min-h-28 w-full overflow-hidden !rounded-none border border-[#D6DCE3] bg-[#F3F5F7] shadow-none transition-colors hover:border-primary active:border-primary focus-within:border-primary focus-within:bg-primary/[0.03] dark:border-[#2A3138] dark:bg-[#161A1F] dark:hover:border-primary";
  const highlightCharContentClassName = "min-h-28 px-3 py-2 text-sm leading-6";
  const floatingInputActionBaseClassName = "btn btn-xs btn-ghost border-0 bg-transparent px-2 text-base-content/35 shadow-none transition-colors backdrop-blur-0 hover:bg-black/28 hover:text-white focus-visible:text-white disabled:cursor-not-allowed disabled:opacity-40 dark:text-base-content/40 dark:hover:bg-white/12";
  const floatingInputActionClassName = `${floatingInputActionBaseClassName} absolute right-3 top-3 z-10`;
  const baseImageToggleButtonClassName = "inline-flex size-11 items-center justify-center bg-transparent text-base-content/60 transition hover:text-base-content focus:outline-none focus-visible:text-base-content dark:text-white/58 dark:hover:text-white dark:focus-visible:text-white";
  const baseImageActionButtonClassName = "inline-flex h-11 items-center gap-2 rounded-md border border-[#2A3138] bg-[#161A1F] px-4 text-[14px] font-semibold text-white/92 transition hover:border-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/15";
  const baseImageRangeClassName = "mt-2 w-full cursor-pointer appearance-none bg-transparent focus:outline-none [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-white/10 [&::-webkit-slider-thumb]:mt-[-4px] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:shadow-black/30 [&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-white/10 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-sm [&::-moz-range-thumb]:shadow-black/30";
  const simpleBaseImageAttachmentClassName = "mt-[2px] overflow-hidden !rounded-none border-x border-b border-[#D6DCE3] bg-[#F3F5F7] shadow-none dark:border-[#2A3138] dark:bg-[#161A1F]";
  const [isModeSelectorOpen, setIsModeSelectorOpen] = useState<boolean>(false);
  const [isModeSelectorMounted, setIsModeSelectorMounted] = useState<boolean>(false);
  const [isProPromptSettingsOpen, setIsProPromptSettingsOpen] = useState<boolean>(false);
  const [isBaseImageToolsOpen, setIsBaseImageToolsOpen] = useState<boolean>(() => mode === "img2img" || mode === "infill");
  const [isProBottomSettingsOpen, setIsProBottomSettingsOpen] = useState<boolean>(false);
  const [isCharacterAddMenuOpen, setIsCharacterAddMenuOpen] = useState<boolean>(false);
  const [highlightEmphasisEnabled, setHighlightEmphasisEnabled] = useState<boolean>(true);
  const [proPromptSettingsPosition, setProPromptSettingsPosition] = useState({ top: 96, left: 96 });
  const [isSimpleResolutionSelectorOpen, setIsSimpleResolutionSelectorOpen] = useState<boolean>(false);
  const [isProResolutionSelectorOpen, setIsProResolutionSelectorOpen] = useState<boolean>(false);
  const [characterPositionPickerState, setCharacterPositionPickerState] = useState<{ characterId: string; code: string } | null>(null);
  const modeSelectorContainerRef = useRef<HTMLDivElement | null>(null);
  const sidebarSurfaceRef = useRef<HTMLDivElement | null>(null);
  const proPromptSettingsRef = useRef<HTMLDivElement | null>(null);
  const proPromptSettingsButtonRef = useRef<HTMLButtonElement | null>(null);
  const characterAddMenuRef = useRef<HTMLDivElement | null>(null);
  const proPromptEditorPanelRef = useRef<HTMLDivElement | null>(null);
  const proPromptTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const proPromptRandomInsertionRef = useRef<Record<"prompt" | "negative", {
    selectionStart: number;
    selectionEnd: number;
    insertedText: string;
  } | null>>({
    prompt: null,
    negative: null,
  });
  const simpleResolutionSelectorRef = useRef<HTMLDivElement | null>(null);
  const proResolutionSelectorRef = useRef<HTMLDivElement | null>(null);
  const activeModeOption = MODE_OPTIONS.find(option => option.value === uiMode) ?? MODE_OPTIONS[0];
  const isSimplePreviewingConverted = Boolean(simpleConverted);
  const isSimpleTextEditor = simpleEditorMode === "text" && !isSimplePreviewingConverted;
  const isSimpleTagsEditor = simpleEditorMode === "tags";
  const simpleResolutionOptions = [...RESOLUTION_PRESETS, { id: CUSTOM_RESOLUTION_ID, label: "自定义" }] as const;
  const activeSimpleResolutionOption = simpleResolutionOptions.find(option => option.id === simpleResolutionSelection) ?? simpleResolutionOptions[simpleResolutionOptions.length - 1];
  const activeProResolutionOption = simpleResolutionOptions.find(option => option.id === proResolutionSelection) ?? simpleResolutionOptions[simpleResolutionOptions.length - 1];
  const hasReadySimpleTags = isSimpleTagsEditor && hasSimpleTagsDraft;
  const hasGeneratedSimpleTags = hasSimpleTagsDraft || Boolean(simpleConverted);
  const simplePrimaryActionLabel = hasReadySimpleTags
    ? proGenerateLabel
    : simpleConvertLabel !== "转化为 tags"
        ? simpleConvertLabel
        : hasGeneratedSimpleTags
            ? "重新生成tags"
            : "生成tags";
  const canTriggerSimplePrimaryAction = hasReadySimpleTags ? canGenerateFromSimpleTags : canConvertSimpleText;
  const simplePrimaryActionToneClassName = hasReadySimpleTags
    ? "border-[#7C3AED] bg-[#7C3AED] text-white hover:bg-[#6D28D9]"
    : hasGeneratedSimpleTags
        ? "border-[#F59E0B] bg-[#F59E0B] text-white hover:bg-[#D97706]"
        : "border-primary bg-primary text-primary-content hover:bg-primary/90";
  const simplePrimaryActionBadgeClassName = hasReadySimpleTags
    ? "border-white/20 bg-white/10 text-white"
    : hasGeneratedSimpleTags
        ? "border-white/20 bg-white/10 text-white"
        : "border-white/20 bg-white/10 text-white";
  const clearCurrentImageButtonClassName = `group flex size-11 shrink-0 items-center justify-center rounded-md border transition focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-45 ${
    hasCurrentDisplayedImage
      ? "border-[#D6DCE3] bg-[#F3F5F7] text-base-content/60 hover:border-primary/45 hover:text-primary dark:border-[#2A3138] dark:bg-[#161A1F] dark:hover:border-primary/45 dark:hover:text-primary"
      : "border-[#D6DCE3] bg-[#F3F5F7] text-base-content/35 dark:border-[#2A3138] dark:bg-[#161A1F] dark:text-base-content/30"
  }`;
  const tokenSnapshot = useNovelAiV45TokenSnapshot({
    prompt,
    negativePrompt,
    v4Chars,
    qualityToggle,
    ucPreset,
  });
  const activeChannelSnapshot = proPromptTab === "prompt" ? tokenSnapshot.prompt : tokenSnapshot.negative;
  const activeBaseMeter = activeChannelSnapshot.base;
  const proPromptFooterLabel = proPromptTab === "prompt"
    ? (qualityToggle ? "Quality Tags Enabled" : undefined)
    : (ucPreset !== 2 ? "UC Preset Enabled" : undefined);
  const proPromptFooterHint = proPromptTab === "prompt"
    ? (qualityToggle && tokenSnapshot.prompt.hiddenText ? tokenSnapshot.prompt.hiddenText : undefined)
    : (ucPreset !== 2 && tokenSnapshot.negative.hiddenText ? tokenSnapshot.negative.hiddenText : undefined);
  const showCharacterPositionsGlobalSection = v4Chars.length >= 2;
  const isCharacterPositionAiChoiceEnabled = !v4UseCoords;
  const characterPositionAssignments = new Map<string, { characterId: string; index: number }>();
  v4Chars.forEach((row, idx) => {
    const code = characterPositionPickerState?.characterId === row.id
      ? characterPositionPickerState.code
      : getV4CharGridCellByCenter(row.centerX, row.centerY).code;
    characterPositionAssignments.set(code, { characterId: row.id, index: idx });
  });
  const baseImagePanelClassName = isBaseImageToolsOpen
    ? "relative min-h-[220px] px-4 py-4"
    : "relative min-h-[84px] px-4 py-4";
  const baseImageHeaderClassName = "relative flex items-start justify-between gap-4";
  const baseImageControlGroupClassName = "flex items-center gap-1.5";
  useEffect(() => {
    if (!sourceImageDataUrl)
      setIsBaseImageToolsOpen(false);
  }, [sourceImageDataUrl]);
  const previousModeRef = useRef(mode);
  useEffect(() => {
    const prev = previousModeRef.current;
    previousModeRef.current = mode;
    if (prev === mode)
      return;
    if (mode === "img2img" || mode === "infill")
      setIsBaseImageToolsOpen(true);
  }, [mode]);
  useEffect(() => {
    if (!proFeatureSections.characterPrompts)
      setIsCharacterAddMenuOpen(false);
  }, [proFeatureSections.characterPrompts]);
  useEffect(() => {
    setCharacterPositionPickerState((prev) => {
      if (!prev)
        return prev;
      if (!showCharacterPositionsGlobalSection || isCharacterPositionAiChoiceEnabled)
        return null;
      if (!v4Chars.some(row => row.id === prev.characterId))
        return null;
      return prev;
    });
  }, [isCharacterPositionAiChoiceEnabled, showCharacterPositionsGlobalSection, v4Chars]);
  useEffect(() => {
    if (!isCharacterAddMenuOpen)
      return;

    function handlePointerDown(event: PointerEvent) {
      const container = characterAddMenuRef.current;
      const target = event.target;
      if (!container || !(target instanceof Node))
        return;
      if (!container.contains(target))
        setIsCharacterAddMenuOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape")
        setIsCharacterAddMenuOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCharacterAddMenuOpen]);
  useEffect(() => {
    if (isModeSelectorOpen) {
      setIsModeSelectorMounted(true);
      return;
    }

    const timer = window.setTimeout(() => {
      setIsModeSelectorMounted(false);
    }, MODE_SELECTOR_TRANSITION_MS);
    return () => window.clearTimeout(timer);
  }, [isModeSelectorOpen]);

  useEffect(() => {
    if (!isModeSelectorOpen)
      return;

    function handlePointerDown(event: PointerEvent) {
      const container = modeSelectorContainerRef.current;
      const target = event.target;
      if (!container || !(target instanceof Node))
        return;
      if (!container.contains(target))
        setIsModeSelectorOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape")
        setIsModeSelectorOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isModeSelectorOpen]);

  useEffect(() => {
    if (!isSimpleResolutionSelectorOpen)
      return;

    function handlePointerDown(event: PointerEvent) {
      const container = simpleResolutionSelectorRef.current;
      const target = event.target;
      if (!container || !(target instanceof Node))
        return;
      if (!container.contains(target))
        setIsSimpleResolutionSelectorOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape")
        setIsSimpleResolutionSelectorOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSimpleResolutionSelectorOpen]);

  useEffect(() => {
    if (!isProResolutionSelectorOpen)
      return;

    function handlePointerDown(event: PointerEvent) {
      const container = proResolutionSelectorRef.current;
      const target = event.target;
      if (!container || !(target instanceof Node))
        return;
      if (!container.contains(target))
        setIsProResolutionSelectorOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape")
        setIsProResolutionSelectorOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isProResolutionSelectorOpen]);

  useEffect(() => {
    if (!isProPromptSettingsOpen)
      return;

    function updatePanelPosition() {
      const sidebarSurface = sidebarSurfaceRef.current;
      const editorPanel = proPromptEditorPanelRef.current;
      if (!sidebarSurface || !editorPanel)
        return;

      const panelWidth = 320;
      const gap = 12;
      const viewportPadding = 16;
      const sidebarRect = sidebarSurface.getBoundingClientRect();
      const editorPanelRect = editorPanel.getBoundingClientRect();
      const maxLeft = Math.max(
        viewportPadding,
        window.innerWidth - panelWidth - viewportPadding,
      );
      const maxTop = Math.max(
        viewportPadding,
        window.innerHeight - 240,
      );
      const nextLeft = Math.max(
        viewportPadding,
        Math.min(
          sidebarRect.right + gap,
          maxLeft,
        ),
      );
      const nextTop = Math.min(
        Math.max(viewportPadding, editorPanelRect.top),
        maxTop,
      );

      setProPromptSettingsPosition((prev) => {
        if (prev.top === nextTop && prev.left === nextLeft)
          return prev;
        return { top: nextTop, left: nextLeft };
      });
    }

    function handlePointerDown(event: PointerEvent) {
      const container = proPromptSettingsRef.current;
      const target = event.target;
      if (!container || !(target instanceof Node))
        return;
      if (!container.contains(target))
        setIsProPromptSettingsOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape")
        setIsProPromptSettingsOpen(false);
    }

    updatePanelPosition();
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
    };
  }, [isProPromptSettingsOpen]);

  const handleToggleCharacterPositionAiChoice = useCallback(() => {
    setCharacterPositionPickerState(prev => (prev ? null : prev));
    handleSetV4UseCoords(isCharacterPositionAiChoiceEnabled);
  }, [handleSetV4UseCoords, isCharacterPositionAiChoiceEnabled]);

  const handleOpenCharacterPositionPicker = useCallback((characterId: string, code: string) => {
    setCharacterPositionPickerState((prev) => {
      if (prev?.characterId === characterId)
        return null;
      return { characterId, code };
    });
  }, []);

  const handleSelectCharacterPositionCode = useCallback((code: string) => {
    setCharacterPositionPickerState((prev) => {
      if (!prev || prev.code === code)
        return prev;
      return { ...prev, code };
    });
  }, []);

  const handleSaveCharacterPosition = useCallback((characterId: string) => {
    if (!characterPositionPickerState || characterPositionPickerState.characterId !== characterId)
      return;
    const cell = getV4CharGridCellByCode(characterPositionPickerState.code);
    if (!cell)
      return;
    handleUpdateV4Char(characterId, {
      centerX: cell.centerX,
      centerY: cell.centerY,
    });
    setCharacterPositionPickerState(null);
  }, [characterPositionPickerState, handleUpdateV4Char]);

  const handleInsertProRandomizerTag = useCallback(() => {
    const activeTab = proPromptTab === "prompt" ? "prompt" : "negative";
    const activeValue = activeTab === "prompt" ? prompt : negativePrompt;
    const target = resolveNovelAiRandomTagTarget({
      currentValue: activeValue,
      selectionStart: proPromptTextareaRef.current?.selectionStart,
      selectionEnd: proPromptTextareaRef.current?.selectionEnd,
      previousInsertion: proPromptRandomInsertionRef.current[activeTab],
    });
    const insertion = insertNovelAiRandomTags({
      kind: activeTab,
      value: activeValue,
      selectionStart: target.selectionStart,
      selectionEnd: target.selectionEnd,
    });
    proPromptRandomInsertionRef.current[activeTab] = {
      selectionStart: insertion.selectionStart,
      selectionEnd: insertion.selectionEnd,
      insertedText: insertion.insertedText,
    };

    if (activeTab === "prompt")
      setPrompt(insertion.value);
    else
      setNegativePrompt(insertion.value);

    window.requestAnimationFrame(() => {
      const textarea = proPromptTextareaRef.current;
      if (!textarea)
        return;
      textarea.focus();
      textarea.setSelectionRange(insertion.selectionStart, insertion.selectionEnd);
    });
  }, [negativePrompt, proPromptTab, prompt, setNegativePrompt, setPrompt]);

  function handleSelectMode(nextMode: ModeOptionValue) {
    setUiMode(nextMode);
    setIsModeSelectorOpen(false);
  }

  function renderSimpleInfillSection() {
    if (!sourceImageDataUrl || !infillMaskDataUrl)
      return null;

    const infillActionButtonClassName = "inline-flex size-11 items-center justify-center bg-black/[0.03] text-base-content/70 transition hover:bg-black/[0.06] hover:text-base-content focus:outline-none focus-visible:bg-black/[0.06] focus-visible:text-base-content disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white/[0.04] dark:text-white/80 dark:hover:bg-white/[0.08] dark:hover:text-white dark:focus-visible:bg-white/[0.08] dark:focus-visible:text-white";

    return (
      <div className={simpleBaseImageAttachmentClassName}>
        <div className="px-4 py-4">
          <div className={baseImageHeaderClassName}>
            <div className="min-w-0">
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  className="mt-[1px] inline-flex size-9 items-center justify-center rounded-md text-base-content/70 transition hover:bg-base-200 hover:text-base-content focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-white/80 dark:hover:bg-white/6 dark:hover:text-white dark:focus:ring-white/15"
                  aria-label="返回"
                  title="返回"
                  onClick={handleReturnFromInfillSettings}
                >
                  <CaretLeftIcon className="size-5" weight="bold" />
                </button>
                <div className="min-w-0">
                  <div className="text-[15px] font-semibold leading-6 text-base-content dark:text-white">Inpaint</div>
                  <div className="mt-1 text-[13px] leading-5 text-base-content/58 dark:text-white/72">Change part of an image.</div>
                </div>
              </div>
            </div>
            <div className={baseImageControlGroupClassName}>
              <div className="flex overflow-hidden rounded-md border border-[#D6DCE3] bg-[#F3F5F7] dark:border-[#2A3138] dark:bg-[#161A1F]">
                <button
                  type="button"
                  className={infillActionButtonClassName}
                  aria-label="编辑蒙版"
                  title="编辑蒙版"
                  disabled={isBusy}
                  onClick={() => void handleOpenBaseImageInpaint()}
                >
                  <PencilSimpleLineIcon className="size-5" weight="bold" />
                </button>
                <span className="h-11 w-px bg-[#D6DCE3] dark:bg-[#2A3138]" aria-hidden="true" />
                <button
                  type="button"
                  className={infillActionButtonClassName}
                  aria-label="清空"
                  title="清空"
                  disabled={isBusy}
                  onClick={handleClearSourceImage}
                >
                  <TrashIcon className="size-5" weight="bold" />
                </button>
                <span className="h-11 w-px bg-[#D6DCE3] dark:bg-[#2A3138]" aria-hidden="true" />
                <button
                  type="button"
                  className={baseImageToggleButtonClassName}
                  aria-label={isBaseImageToolsOpen ? "收起" : "展开"}
                  title={isBaseImageToolsOpen ? "收起" : "展开"}
                  disabled={isBusy}
                  onClick={() => setIsBaseImageToolsOpen(prev => !prev)}
                >
                  <ChevronDown className={`size-5 shrink-0 transition-transform ${isBaseImageToolsOpen ? "rotate-180" : ""}`} />
                </button>
              </div>
            </div>
          </div>

          {isBaseImageToolsOpen
            ? (
                <div className="mt-4 space-y-4">
            <div>
              <div className="text-[13px] font-semibold leading-5 text-base-content dark:text-white">Mask</div>
              <div className="mt-2 overflow-hidden rounded-md border border-[#D6DCE3] bg-[#F3F5F7] dark:border-[#2A3138] dark:bg-[#0B0D1B]">
                <div className="relative h-[220px] w-full">
                  <img
                    src={sourceImageDataUrl}
                    alt="Inpaint Mask"
                    className="absolute inset-0 h-full w-full object-contain"
                    draggable={false}
                  />
                  <img
                    src={infillMaskDataUrl}
                    alt="Mask Overlay"
                    className="absolute inset-0 h-full w-full object-contain opacity-55 mix-blend-screen"
                    draggable={false}
                  />
                </div>
              </div>
            </div>

            <label className="block">
              <div className="flex items-center justify-between text-[13px] font-semibold leading-5 text-base-content dark:text-white">
                <span>Strength</span>
                <span>{formatSliderValue(strength)}</span>
              </div>
              <input
                type="range"
                min={0.01}
                max={1}
                step={0.01}
                value={strength}
                className={baseImageRangeClassName}
                onChange={event => setStrength(clampRange(Number(event.target.value), 0.01, 1, 0.7))}
              />
            </label>
                </div>
              )
            : null}
        </div>
      </div>
    );
  }

  function renderProInfillSection() {
    if (!sourceImageDataUrl || !infillMaskDataUrl)
      return null;

    const infillActionButtonClassName = "inline-flex size-11 items-center justify-center bg-white/[0.04] text-white/80 transition hover:bg-white/[0.08] hover:text-white focus:outline-none focus-visible:bg-white/[0.08] focus-visible:text-white disabled:cursor-not-allowed disabled:opacity-40";

    return (
      <div className="-mx-3 -mb-3 mt-3 overflow-hidden border-t border-[#2A3138] bg-[#161A1F]">
        <div className="px-4 py-4">
          <div className={baseImageHeaderClassName}>
            <div className="min-w-0">
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  className="mt-[1px] inline-flex size-9 items-center justify-center rounded-md text-white/80 transition hover:bg-white/6 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/15"
                  aria-label="返回"
                  title="返回"
                  onClick={handleReturnFromInfillSettings}
                >
                  <CaretLeftIcon className="size-5" weight="bold" />
                </button>
                <div className="min-w-0">
                  <div className="text-[15px] font-semibold leading-6 text-white">Inpaint</div>
                  <div className="mt-1 text-[13px] leading-5 text-white/72">Change part of an image.</div>
                </div>
              </div>
            </div>
            <div className={baseImageControlGroupClassName}>
              <div className="flex overflow-hidden rounded-md border border-[#2A3138] bg-[#161A1F]">
                <button
                  type="button"
                  className={infillActionButtonClassName}
                  aria-label="编辑蒙版"
                  title="编辑蒙版"
                  disabled={isBusy}
                  onClick={() => void handleOpenBaseImageInpaint()}
                >
                  <PencilSimpleLineIcon className="size-5" weight="bold" />
                </button>
                <span className="h-11 w-px bg-[#2A3138]" aria-hidden="true" />
                <button
                  type="button"
                  className={infillActionButtonClassName}
                  aria-label="清空"
                  title="清空"
                  disabled={isBusy}
                  onClick={handleClearSourceImage}
                >
                  <TrashIcon className="size-5" weight="bold" />
                </button>
                <span className="h-11 w-px bg-[#2A3138]" aria-hidden="true" />
                <button
                  type="button"
                  className={baseImageToggleButtonClassName}
                  aria-label={isBaseImageToolsOpen ? "收起" : "展开"}
                  title={isBaseImageToolsOpen ? "收起" : "展开"}
                  disabled={isBusy}
                  onClick={() => setIsBaseImageToolsOpen(prev => !prev)}
                >
                  <ChevronDown className={`size-5 shrink-0 transition-transform ${isBaseImageToolsOpen ? "rotate-180" : ""}`} />
                </button>
              </div>
            </div>
          </div>

          {isBaseImageToolsOpen
            ? (
                <div className="mt-4 space-y-4">
            <div>
              <div className="text-[13px] font-semibold leading-5 text-white">Mask</div>
              <div className="mt-2 overflow-hidden rounded-md border border-[#2A3138] bg-[#0B0D1B]">
                <div className="relative h-[220px] w-full">
                  <img
                    src={sourceImageDataUrl}
                    alt="Inpaint Mask"
                    className="absolute inset-0 h-full w-full object-contain"
                    draggable={false}
                  />
                  <img
                    src={infillMaskDataUrl}
                    alt="Mask Overlay"
                    className="absolute inset-0 h-full w-full object-contain opacity-55 mix-blend-screen"
                    draggable={false}
                  />
                </div>
              </div>
            </div>

            <label className="block">
              <div className="flex items-center justify-between text-[13px] font-semibold leading-5 text-white">
                <span>Strength</span>
                <span>{formatSliderValue(strength)}</span>
              </div>
              <input
                type="range"
                min={0.01}
                max={1}
                step={0.01}
                value={strength}
                className={baseImageRangeClassName}
                onChange={event => setStrength(clampRange(Number(event.target.value), 0.01, 1, 0.7))}
              />
            </label>
                </div>
              )
            : null}
        </div>
      </div>
    );
  }

  function renderSimpleBaseImageSection() {
    if (!sourceImageDataUrl) {
      return (
        <div className={simpleBaseImageAttachmentClassName}>
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="text-[15px] text-base-content/58">
              Add a Base Img (Optional)
            </div>
            <button
              type="button"
              className={featureUploadActionClassName}
              aria-label="上传 Base Img"
              title="上传 Base Img"
              onClick={handleOpenSourceImagePicker}
            >
              <FileArrowUpIcon className="size-5" weight="bold" />
            </button>
          </div>
        </div>
      );
    }

    if (mode === "infill")
      return renderSimpleInfillSection();

    if (mode !== "img2img")
      return null;

    return (
      <div className={simpleBaseImageAttachmentClassName}>
        <div className={baseImagePanelClassName}>
          <img
            src={sourceImageDataUrl}
            alt="Base Img"
            className="absolute inset-0 h-full w-full object-cover opacity-28"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,13,27,0.66)_0%,rgba(11,13,27,0.74)_100%)]" />
          <div className={baseImageHeaderClassName}>
            <div className="min-w-0">
              <div className="text-[15px] font-semibold leading-6 text-white">Image2Image</div>
              <div className="mt-1 text-[13px] leading-5 text-white/72">Transform your image.</div>
            </div>
            <div className={baseImageControlGroupClassName}>
              <div className="flex overflow-hidden rounded-md border border-[#2A3138] bg-[#161A1F]">
                <button
                  type="button"
                  className="inline-flex size-11 items-center justify-center text-white/80 transition hover:bg-white/6 hover:text-white focus:outline-none"
                  aria-label="更换 Base Img"
                  title="更换 Base Img"
                  onClick={handleOpenSourceImagePicker}
                >
                  <ArrowClockwise className="size-5" weight="bold" />
                </button>
                <span className="h-11 w-px bg-[#2A3138]" aria-hidden="true" />
                <button
                  type="button"
                  className="inline-flex size-11 items-center justify-center text-white/80 transition hover:bg-white/6 hover:text-white focus:outline-none"
                  aria-label="移除 Base Img"
                  title="移除 Base Img"
                  onClick={handleClearSourceImage}
                >
                  <TrashIcon className="size-5" weight="bold" />
                </button>
              </div>
              <button
                type="button"
                className={baseImageToggleButtonClassName}
                aria-label={isBaseImageToolsOpen ? "收起 Base Img 工具" : "展开 Base Img 工具"}
                title={isBaseImageToolsOpen ? "收起 Base Img 工具" : "展开 Base Img 工具"}
                onClick={() => setIsBaseImageToolsOpen(prev => !prev)}
              >
                <ChevronDown className={`size-5 shrink-0 transition-transform ${isBaseImageToolsOpen ? "rotate-180" : ""}`} />
              </button>
            </div>
          </div>
          {isBaseImageToolsOpen
            ? (
                <div className="relative z-10 mt-4 space-y-4">
                  <label className="block">
                    <div className="flex items-center justify-between text-[13px] font-semibold leading-5 text-white">
                      <span>Strength</span>
                      <span>{formatSliderValue(strength)}</span>
                    </div>
                    <input
                      type="range"
                      min={0.01}
                      max={1}
                      step={0.01}
                      value={strength}
                      className={baseImageRangeClassName}
                      onChange={event => setStrength(clampRange(Number(event.target.value), 0.01, 1, 0.7))}
                    />
                  </label>

                  <label className="block">
                    <div className="flex items-center justify-between text-[13px] font-semibold leading-5 text-white">
                      <span>Noise</span>
                      <span>{formatSliderValue(noise)}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={0.99}
                      step={0.01}
                      value={noise}
                      className={baseImageRangeClassName}
                      onChange={event => setNoise(clampRange(Number(event.target.value), 0, 0.99, 0.2))}
                    />
                  </label>

                  <button
                    type="button"
                    className={baseImageActionButtonClassName}
                    disabled={isBusy}
                    onClick={() => void handleOpenBaseImageInpaint()}
                  >
                    <SelectionPlusIcon className="size-5" weight="bold" />
                    <span>Inpaint Image</span>
                  </button>
                </div>
              )
            : null}
        </div>
      </div>
    );
  }

  function renderResolutionGlyph(optionId: string) {
    let glyph: React.ReactNode;
    if (optionId === "portrait") {
      glyph = <div className="h-5 w-3 rounded-sm border border-current opacity-80" />;
    }
    else if (optionId === "landscape") {
      glyph = <div className="h-3 w-5 rounded-sm border border-current opacity-80" />;
    }
    else if (optionId === "square") {
      glyph = <div className="size-4 rounded-sm border border-current opacity-80" />;
    }
    else {
      glyph = (
        <div className="flex size-4 items-center justify-center rounded-sm border border-dashed border-current opacity-80">
          <span className="text-[10px] font-bold leading-none">+</span>
        </div>
      );
    }

    return <span className="flex w-5 shrink-0 items-center justify-start">{glyph}</span>;
  }

  function renderProBottomSettingsDrawer() {
    if (uiMode !== "pro")
      return null;

    return (
      <div className="relative h-14 shrink-0 bg-[#F3F5F7] px-4 pb-3 dark:bg-[#161A1F]">
        {!isProBottomSettingsOpen
          ? (
              <button
                type="button"
                className="grid h-14 w-full -translate-y-1 grid-cols-[max-content_max-content_max-content_minmax(0,1fr)_auto] items-center gap-[10px] rounded-t-2xl border border-[#D6DCE3] bg-[#F3F5F7] px-3 text-left text-base-content transition hover:bg-[#EAEFF4] focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-[#2A3138] dark:bg-[#161A1F] dark:text-white dark:hover:bg-[#1B2026]"
                aria-expanded={isProBottomSettingsOpen}
                onClick={() => setIsProBottomSettingsOpen(true)}
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <div className="text-xs font-medium leading-none text-base-content/52 dark:text-white/52">Steps</div>
                  <div className="text-sm font-semibold leading-none text-base-content dark:text-white">{steps}</div>
                </div>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <div className="text-xs font-medium leading-none text-base-content/52 dark:text-white/52">Guidance</div>
                  <div className="text-sm font-semibold leading-none text-base-content dark:text-white">{formatSliderValue(scale)}</div>
                </div>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <div className="text-xs font-medium leading-none text-base-content/52 dark:text-white/52">Seed</div>
                  <div className="text-sm font-semibold leading-none text-base-content dark:text-white">{seedIsRandom ? "N/A" : seed}</div>
                </div>
                <div className="flex min-w-0 flex-col gap-0.5 overflow-hidden">
                  <div className="truncate text-xs font-medium leading-none text-base-content/52 dark:text-white/52">Sampler</div>
                  <div className="truncate text-sm font-semibold leading-none text-base-content dark:text-white">{SAMPLER_LABELS[sampler] || sampler}</div>
                </div>
                <div className="flex items-center justify-end">
                  <CaretUpIcon className="size-4" weight="bold" />
                </div>
              </button>
            )
          : null}

        <div
          className={`absolute inset-x-4 bottom-0 z-20 origin-bottom overflow-hidden rounded-t-2xl border border-[#D6DCE3] bg-[#F3F5F7] text-base-content shadow-[0_-16px_36px_rgba(15,23,42,0.18)] transition-all duration-300 ease-out dark:border-[#2A3138] dark:bg-[#161A1F] dark:text-white dark:shadow-[0_-20px_36px_rgba(0,0,0,0.35)] ${
            isProBottomSettingsOpen
              ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
              : "pointer-events-none translate-y-6 scale-[0.98] opacity-0"
          }`}
        >
          <div className="overflow-visible pb-4 pl-4 pr-0 pt-4">
            <div className="mb-4 flex items-center justify-between gap-3 pr-4">
              <div className="text-sm font-semibold text-base-content/92 dark:text-white/92">AI Settings</div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex size-8 items-center justify-center rounded-md text-base-content/72 transition hover:bg-black/5 hover:text-base-content focus:outline-none dark:text-white/72 dark:hover:bg-white/8 dark:hover:text-white"
                  aria-label="重置绘图设置"
                  title="重置绘图设置"
                  onClick={handleResetCurrentImageSettings}
                >
                  <ArrowCounterClockwise className="size-4" weight="bold" />
                </button>
                <button
                  type="button"
                  className="inline-flex size-8 items-center justify-center rounded-md text-base-content/72 transition hover:bg-black/5 hover:text-base-content focus:outline-none dark:text-white/72 dark:hover:bg-white/8 dark:hover:text-white"
                  aria-label="收起 AI 设置"
                  onClick={() => setIsProBottomSettingsOpen(false)}
                >
                  <CaretDownIcon className="size-4" weight="bold" />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between pr-4">
                  <span className="text-sm font-semibold text-base-content dark:text-white">{`Steps: ${steps}`}</span>
                </div>
                <div className="pr-4">
                  <input
                    className="range range-xs w-full"
                    type="range"
                    min="1"
                    max="50"
                    step="1"
                    value={steps}
                    onChange={e => setSteps(clampIntRange(Number(e.target.value), 1, 50, 50))}
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3 pr-4">
                  <span className="text-sm font-semibold text-base-content dark:text-white">{`Prompt Guidance: ${scale}`}</span>
                  <button
                    type="button"
                    className={`inline-flex h-7 items-center rounded-md border px-2.5 text-xs font-semibold transition focus:outline-none ${
                      qualityToggle
                        ? "border-transparent bg-primary/10 text-primary"
                        : "border-transparent bg-[#F3F5F7] text-base-content/72 hover:text-primary dark:bg-[#161A1F] dark:text-white/72 dark:hover:text-primary"
                    }`}
                    aria-pressed={qualityToggle}
                    onClick={() => setQualityToggle(!qualityToggle)}
                  >
                    Variety+
                  </button>
                </div>
                <div className="pr-4">
                  <input
                    className="range range-xs w-full"
                    type="range"
                    min="0"
                    max="10"
                    step="0.1"
                    value={scale}
                    onChange={e => setScale(clampRange(Number(e.target.value), 0, 10, 5))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pr-4">
                <div className="flex flex-col gap-2">
                  <div className="text-sm font-semibold text-base-content dark:text-white">Seed</div>
                  <input
                    className={`${subtleInputClassName} border-[#D6DCE3] bg-[#F3F5F7] text-base-content placeholder:text-base-content/28 [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none dark:border-[#2A3138] dark:bg-[#161A1F] dark:text-white dark:placeholder:text-white/28`}
                    type="number"
                    value={seedIsRandom ? "" : seed}
                    placeholder="Enter a seed"
                    onChange={(e) => {
                      const value = e.target.value.trim();
                      setSeed(value ? Number(value) : -1);
                    }}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <div className="text-sm font-semibold text-base-content dark:text-white">Sampler</div>
                  <select className={`${subtleSelectClassName} border-[#D6DCE3] bg-[#F3F5F7] text-base-content dark:border-[#2A3138] dark:bg-[#161A1F] dark:text-white`} value={sampler} onChange={e => setSampler(e.target.value)}>
                    {samplerOptions.map(s => <option key={s} value={s}>{SAMPLER_LABELS[s] || s}</option>)}
                  </select>
                </div>
              </div>

              <details className="collapse collapse-arrow border-0 bg-transparent" open>
                <summary className="collapse-title min-h-0 px-0 py-0 pr-12 text-sm font-semibold text-base-content dark:text-white">
                  Advanced Settings
                </summary>
                <div className="collapse-content space-y-4 px-0 pb-0 pr-4 pt-4">
                  {isNAI4
                    ? (
                        <div className="flex flex-col gap-2">
                          <span className="text-sm font-semibold text-base-content dark:text-white">{`Prompt Guidance Rescale: ${cfgRescale}`}</span>
                          <div className="pr-4">
                            <input
                              className="range range-xs w-full"
                              type="range"
                              min="0"
                              max="1"
                              step="0.01"
                              value={cfgRescale}
                              onChange={e => setCfgRescale(clampRange(Number(e.target.value), 0, 1, 0))}
                            />
                          </div>
                        </div>
                      )
                    : null}

                  {noiseScheduleOptions.length
                    ? (
                        <div className="flex flex-col gap-2">
                          <span className="text-sm font-semibold text-base-content dark:text-white">Noise Schedule</span>
                          <select className={`${subtleSelectClassName} border-[#D6DCE3] bg-[#F3F5F7] text-base-content dark:border-[#2A3138] dark:bg-[#161A1F] dark:text-white`} value={noiseSchedule} onChange={e => setNoiseSchedule(e.target.value)}>
                            {noiseScheduleOptions.map(s => <option key={s} value={s}>{SCHEDULE_LABELS[s] || s}</option>)}
                          </select>
                        </div>
                      )
                    : null}

                  {isNAI3
                    ? (
                        <>
                          <label className="label cursor-pointer justify-start gap-3 px-0">
                            <input type="checkbox" className="toggle toggle-sm" checked={smea} onChange={e => setSmea(e.target.checked)} />
                            <span className="label-text text-base-content/78 dark:text-white/78">SMEA</span>
                          </label>
                          <label className="label cursor-pointer justify-start gap-3 px-0">
                            <input type="checkbox" className="toggle toggle-sm" checked={smeaDyn} onChange={e => setSmeaDyn(e.target.checked)} />
                            <span className="label-text text-base-content/78 dark:text-white/78">SMEA Dyn</span>
                          </label>
                        </>
                      )
                    : null}
                </div>
              </details>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={sidebarSurfaceRef}
      className={`${isDirectorToolsOpen ? "hidden" : "flex"} relative h-full min-h-0 w-full min-w-0 flex-col gap-0 overflow-hidden border-r border-black/5 bg-[#F3F5F7] p-0 shadow-none after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:w-5 after:bg-linear-to-l after:from-[rgba(15,23,42,0.08)] after:via-[rgba(15,23,42,0.03)] after:to-transparent after:content-[''] dark:border-white/5 dark:bg-[#161A1F] dark:after:from-[rgba(0,0,0,0.2)] dark:after:via-[rgba(0,0,0,0.08)]`}
    >
      <div className="ai-image-fade-scrollbar min-h-0 flex-1 overflow-y-auto">
      {isModeSelectorMounted
        ? (
            <div
              aria-hidden="true"
              className={`fixed inset-0 z-30 bg-black/20 backdrop-blur-[1.5px] transition-opacity duration-200 ease-out dark:bg-black/35 ${
                isModeSelectorOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
              }`}
              onClick={() => setIsModeSelectorOpen(false)}
            />
          )
        : null}
      <div className={sideCardClassName}>
        <div className="card-body p-4">
          <div className="mb-3 flex items-stretch gap-2">
            <button
              type="button"
              className={clearCurrentImageButtonClassName}
              aria-label="取消当前图片"
              title={hasCurrentDisplayedImage ? "取消当前图片" : "当前没有可取消的图片"}
              disabled={!hasCurrentDisplayedImage}
              onClick={handleClearCurrentDisplayedImage}
            >
              <span className="relative inline-flex size-5 items-center justify-center">
                <ImageSquareIcon className="size-5" weight="regular" aria-hidden="true" />
                <XCircleIcon className="absolute -right-1 -top-1 size-4 text-primary" weight="fill" aria-hidden="true" />
              </span>
            </button>

            <div className="relative min-w-0 flex-1" ref={modeSelectorContainerRef}>
              <button
                type="button"
                className={`flex w-full items-center justify-between rounded-md border px-3 py-3 text-left transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                  isModeSelectorOpen
                    ? "border-primary bg-primary/5 shadow-sm dark:bg-primary/10"
                    : "border-[#D6DCE3] bg-[#F3F5F7] hover:border-primary/40 hover:bg-[#EAEFF4] dark:border-[#2A3138] dark:bg-[#161A1F] dark:hover:bg-[#1B2026]"
                }`}
                aria-expanded={isModeSelectorOpen}
                aria-controls="ai-image-mode-selector-panel"
                onClick={() => setIsModeSelectorOpen(prev => !prev)}
              >
                <div className="flex min-w-0 items-baseline gap-2">
                  <span className="font-medium leading-none text-base-content">{activeModeOption.label}</span>
                  <span className="truncate text-[11px] leading-none text-base-content/45">{MODE_MODEL_LABEL}</span>
                </div>
                <ChevronDown className={`ml-3 size-4 shrink-0 text-base-content/60 transition-transform ${isModeSelectorOpen ? "rotate-180" : ""}`} />
              </button>

              {isModeSelectorOpen
                || isModeSelectorMounted
                ? (
                    <div
                      id="ai-image-mode-selector-panel"
                      className={`ai-image-fade-scrollbar absolute left-0 right-0 top-[calc(100%+0.5rem)] z-40 max-h-[calc(100vh-12rem)] overflow-y-auto rounded-xl border border-[#D6DCE3] bg-[#F3F5F7] p-3 shadow-2xl ring-1 ring-black/5 transform-gpu transition-all duration-200 ease-out dark:border-[#2A3138] dark:bg-[#161A1F] dark:ring-white/5 ${
                        isModeSelectorOpen
                          ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
                          : "pointer-events-none translate-y-2 scale-[0.985] opacity-0"
                      }`}
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-base-content">模式选择</div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          onClick={() => setIsModeSelectorOpen(false)}
                        >
                          关闭
                        </button>
                      </div>
                      <div className="flex flex-col gap-2">
                        {MODE_OPTIONS.map(option => (
                          <button
                            key={option.value}
                            type="button"
                            className={`w-full rounded-lg border px-3 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                              uiMode === option.value
                                ? "border-primary bg-primary/5 text-base-content shadow-sm"
                                : "border-[#D6DCE3] bg-base-100 text-base-content/80 hover:border-primary/40 hover:bg-[#EAEFF4] dark:border-[#2A3138] dark:bg-[#161A1F] dark:hover:border-primary/40 dark:hover:bg-[#1B2026]"
                            }`}
                            onClick={() => handleSelectMode(option.value)}
                            >
                            <div className="flex min-w-0 items-baseline gap-2">
                              <span className="font-medium leading-none">{option.label}</span>
                              <span className="truncate text-[11px] leading-none text-base-content/45">{MODE_MODEL_LABEL}</span>
                            </div>
                            <div className="mt-1 text-xs text-base-content/60">
                              {option.description}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                : null}
            </div>
          </div>
        </div>
      </div>

      <div className={sideCardClassName}>
        <div className={`card-body p-4 ${uiMode === "simple" && isSimpleTagsEditor ? "gap-2" : "gap-3"}`}>
          {uiMode === "simple"
            ? (
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium">{isSimpleTagsEditor || isSimplePreviewingConverted ? "NovelAi Tags" : "提示词 Prompt"}</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className={floatingInputActionBaseClassName}
                      disabled={isBusy}
                      aria-label="添加画风"
                      title="添加画风"
                      onClick={() => setIsStylePickerOpen(true)}
                    >
                      添加画风
                    </button>
                    <button
                      type="button"
                      className={floatingInputActionBaseClassName}
                      disabled={isBusy}
                      aria-label="清空快速模式内容与画风"
                      title="清空快速模式内容与画风"
                      onClick={handleClearSimpleDraft}
                    >
                      清空
                    </button>
                  </div>
                </div>
              )
            : null}

          {uiMode === "simple"
            ? (
                <div className="flex flex-col gap-0">
                  <div className={`grid transition-all duration-300 ease-out ${isSimpleTextEditor ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                    <div className="min-h-0 overflow-hidden">
                      <div className="flex w-full min-w-0 flex-col items-stretch">
                        <div className={editorPanelClassName}>
                          <div className="relative">
                          <textarea
                            className={simplePromptTextareaClassName}
                            value={simpleText}
                            onChange={(e) => {
                              const next = e.target.value;
                              setSimpleText(next);
                              if (simpleConverted) {
                                setSimpleConverted(null);
                                setSimpleConvertedFromText("");
                              }
                              if (!isSimpleTextEditor) {
                                setSimpleEditorMode("text");
                                setSimplePromptTab("prompt");
                              }
                            }}
                            placeholder=""
                          />
                          {hasSimpleTagsDraft
                            ? (
                                <button
                                  type="button"
                                  className={`${floatingInputActionClassName} top-auto bottom-3`}
                                  onClick={handleReturnToSimpleTags}
                                >
                                  <ArrowCounterClockwise className="size-3.5" weight="bold" />
                                  返回tags
                                </button>
                                )
                            : null}
                        </div>
                          {renderSimpleBaseImageSection()}
                        </div>
                      </div>
                  </div>
                  </div>
                  <div className={`grid transition-all duration-300 ease-out ${simpleConverted ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                    <div className="min-h-0 overflow-hidden">
                      <div className={`rounded-2xl border border-[#D6DCE3] bg-base-100 p-3 shadow-sm transition-all duration-300 ease-out dark:border-[#2A3138] dark:bg-[#1B2026] ${simpleConverted ? "translate-y-0 scale-100" : "translate-y-2 scale-[0.98]"}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                              <SparkleIcon className="size-4" weight="fill" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-base-content">候选 tags</div>
                              <div className="text-xs text-base-content/55">待确认</div>
                            </div>
                          </div>
                          <div className="rounded-full border border-primary/20 bg-primary/[0.08] px-2 py-1 text-[11px] font-medium text-primary">
                            预览
                          </div>
                        </div>

                        <div className="mt-3 flex items-center gap-2">
                          <div className={segmentedControlClassName}>
                            <button
                              type="button"
                              className={`${segmentedButtonBaseClassName} ${simplePromptTab === "prompt" ? "bg-base-100 text-base-content shadow-sm" : "bg-transparent text-base-content/60 hover:bg-base-100 hover:text-base-content"}`}
                              onClick={() => setSimplePromptTab("prompt")}
                            >
                              Base Prompt
                            </button>
                            <button
                              type="button"
                              className={`${segmentedButtonBaseClassName} ${simplePromptTab === "negative" ? "bg-base-100 text-base-content shadow-sm" : "bg-transparent text-base-content/60 hover:bg-base-100 hover:text-base-content"}`}
                              onClick={() => setSimplePromptTab("negative")}
                            >
                              Undesired Content
                            </button>
                          </div>
                        </div>

                        <textarea
                          className={`${promptTextareaClassName} mt-3 min-h-28 overflow-hidden [field-sizing:content] text-sm`}
                          value={simplePromptTab === "prompt" ? simpleConverted?.prompt ?? "" : simpleConverted?.negativePrompt ?? ""}
                          readOnly
                        />

                        {renderSimpleBaseImageSection()}

                        <div className="mt-3 flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={handleRejectSimpleConverted}
                          >
                            <XCircleIcon className="size-4" weight="fill" />
                            拒绝
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={handleAcceptSimpleConverted}
                          >
                            <CheckCircleIcon className="size-4" weight="fill" />
                            接受
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className={`grid transition-all duration-300 ease-out ${isSimpleTagsEditor ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                  <div className="min-h-0 overflow-hidden">
                      <div className="flex flex-col gap-2">
                        <div className={editorPanelClassName}>
                          <div className="mb-3 flex items-center gap-2">
                            <div className={segmentedControlClassName}>
                              <button
                                type="button"
                                className={`${segmentedButtonBaseClassName} ${simplePromptTab === "prompt" ? "bg-base-100 text-base-content shadow-sm" : "bg-transparent text-base-content/60 hover:bg-base-100 hover:text-base-content"}`}
                                onClick={() => setSimplePromptTab("prompt")}
                              >
                                Base Prompt
                              </button>
                              <button
                                type="button"
                                className={`${segmentedButtonBaseClassName} ${simplePromptTab === "negative" ? "bg-base-100 text-base-content shadow-sm" : "bg-transparent text-base-content/60 hover:bg-base-100 hover:text-base-content"}`}
                                onClick={() => setSimplePromptTab("negative")}
                              >
                                Undesired Content
                              </button>
                            </div>
                          </div>
                          <div className="relative">
                            <textarea
                              className={`${promptTextareaClassName} overflow-hidden [field-sizing:content]`}
                              value={simplePromptTab === "prompt" ? simplePrompt : simpleNegativePrompt}
                              onChange={(e) => {
                                if (simplePromptTab === "prompt")
                                  setSimplePrompt(e.target.value);
                                else
                                  setSimpleNegativePrompt(e.target.value);
                              }}
                            />
                            {hasSimpleTagsDraft
                              ? (
                                  <button
                                    type="button"
                                    className={`${floatingInputActionClassName} top-auto bottom-3`}
                                    onClick={handleReturnToSimpleText}
                                  >
                                    <ArrowCounterClockwise className="size-3.5" weight="bold" />
                                    返回描述
                                  </button>
                                )
                              : null}
                          </div>
                          {renderSimpleBaseImageSection()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {selectedStylePresets.length
                    ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {selectedStylePresets.map((preset) => {
                            return (
                              <button
                                key={preset.id}
                                type="button"
                                className="flex items-center gap-2 rounded-box border border-base-300 bg-base-100 pr-2 hover:border-primary"
                                onClick={() => setIsStylePickerOpen(true)}
                                title="点击继续添加画风"
                              >
                                <div className="w-10 aspect-square rounded-box bg-base-200 overflow-hidden flex items-center justify-center">
                                  {preset.imageUrl
                                    ? <img src={preset.imageUrl} alt={preset.title} className="w-full h-full object-cover" />
                                    : <div className="text-xs opacity-60">{preset.title}</div>}
                                </div>
                                <div className="text-xs opacity-70 max-w-32 truncate">{preset.title}</div>
                              </button>
                            );
                          })}
                        </div>
                      )
                    : null}

                </div>
              )
            : (
                <div className="flex flex-col gap-3">
                  <div className={editorPanelClassName} ref={proPromptEditorPanelRef}>
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className={segmentedControlClassName}>
                        <button
                          type="button"
                          className={`${segmentedButtonBaseClassName} ${proPromptTab === "prompt" ? "bg-base-100 text-base-content shadow-sm" : "bg-transparent text-base-content/60 hover:bg-base-100 hover:text-base-content"}`}
                          onClick={() => setProPromptTab("prompt")}
                        >
                          Base Prompt
                        </button>
                        <button
                          type="button"
                          className={`${segmentedButtonBaseClassName} ${proPromptTab === "negative" ? "bg-base-100 text-base-content shadow-sm" : "bg-transparent text-base-content/60 hover:bg-base-100 hover:text-base-content"}`}
                          onClick={() => setProPromptTab("negative")}
                        >
                          Undesired Content
                        </button>
                      </div>
                      <div className="shrink-0" ref={proPromptSettingsRef}>
                        <button
                          ref={proPromptSettingsButtonRef}
                          type="button"
                          className={`inline-flex size-9 items-center justify-center rounded-md border transition focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                            isProPromptSettingsOpen
                              ? "border-primary/40 bg-[#F3F5F7] text-base-content shadow-sm dark:bg-[#161A1F]"
                              : "border-[#D6DCE3] bg-[#F3F5F7] text-base-content/70 hover:border-primary/40 hover:text-base-content dark:border-[#2A3138] dark:bg-[#161A1F] dark:text-base-content/70 dark:hover:text-base-content"
                          }`}
                          aria-label="打开输入设置"
                          aria-expanded={isProPromptSettingsOpen}
                          aria-controls="ai-image-pro-prompt-settings"
                          onClick={() => setIsProPromptSettingsOpen(prev => !prev)}
                        >
                          <GearSixIcon className={`size-4 transition-transform duration-200 ${isProPromptSettingsOpen ? "rotate-90" : ""}`} weight="fill" />
                        </button>

                        <div
                          id="ai-image-pro-prompt-settings"
                          className={`fixed z-40 w-80 origin-top-left rounded-2xl border border-[#D6DCE3] bg-[#F3F5F7] p-4 shadow-[0_18px_40px_rgba(15,23,42,0.18)] transition-all duration-200 ease-out dark:border-[#2A3138] dark:bg-[#161A1F] dark:shadow-[0_24px_48px_rgba(0,0,0,0.42)] ${
                            isProPromptSettingsOpen
                              ? "pointer-events-auto translate-x-0 scale-100 opacity-100"
                              : "pointer-events-none -translate-x-2 scale-[0.98] opacity-0"
                          }`}
                          style={{
                            top: `${proPromptSettingsPosition.top}px`,
                            left: `${proPromptSettingsPosition.left}px`,
                          }}
                        >
                          <div className="mb-4 flex items-center gap-2 border-b border-[#D6DCE3] pb-3 dark:border-[#2A3138]">
                            <div className="rounded-md bg-base-100 px-2 py-1 text-xs font-medium text-base-content shadow-sm dark:bg-[#1B2026]">
                              Settings
                            </div>
                          </div>

                          <div className="space-y-5">
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm font-semibold text-base-content">Add Quality tags</div>
                              <input
                                type="checkbox"
                                className="toggle toggle-sm"
                                checked={qualityToggle}
                                onChange={e => setQualityToggle(e.target.checked)}
                              />
                            </div>

                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm font-semibold text-base-content">Highlight Emphasis</div>
                              <input
                                type="checkbox"
                                className="toggle toggle-sm"
                                checked={highlightEmphasisEnabled}
                                onChange={e => setHighlightEmphasisEnabled(e.target.checked)}
                              />
                            </div>

                            <div className="space-y-2">
                              <div className="text-sm font-semibold text-base-content">Undesired Content Preset</div>
                              <select
                                className={`${subtleSelectClassName} w-full !rounded-none bg-base-100 dark:bg-[#1B2026]`}
                                value={ucPreset}
                                onChange={e => setUcPreset(clampIntRange(Number(e.target.value), 0, 2, 0))}
                              >
                                {UC_PRESET_OPTIONS.map(option => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <HighlightEmphasisTextarea
                      highlightEnabled={highlightEmphasisEnabled}
                      surfaceClassName={highlightPromptSurfaceClassName}
                      contentClassName={highlightPromptContentClassName}
                      textareaRef={proPromptTextareaRef}
                      value={proPromptTab === "prompt" ? prompt : negativePrompt}
                      onChange={(e) => {
                        if (proPromptTab === "prompt")
                          setPrompt(e.target.value);
                        else
                          setNegativePrompt(e.target.value);
                      }}
                      spellCheck={false}
                    />
                    <div className="mt-3 flex items-start gap-3">
                      <button
                        type="button"
                        className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-[#D6DCE3] bg-[#F3F5F7] text-base-content/72 transition outline-none hover:border-primary/40 hover:text-primary focus:outline-none dark:border-[#2A3138] dark:bg-[#161A1F] dark:text-base-content/70"
                        aria-label={proPromptTab === "prompt" ? "插入随机 Prompt tag" : "插入随机 Undesired Content tag"}
                        title="插入随机 tag 语法"
                        onMouseDown={event => event.preventDefault()}
                        onClick={handleInsertProRandomizerTag}
                      >
                        <DiceFiveIcon className="size-5" weight="fill" />
                      </button>
                      <AiImageContextLimitMeter
                        className="min-w-0 flex-1 pt-1"
                        localUsed={activeBaseMeter.localUsed}
                        totalUsed={activeBaseMeter.totalUsed}
                        remaining={activeBaseMeter.remaining}
                        overflow={activeBaseMeter.overflow}
                        status={tokenSnapshot.status}
                        footerLabel={proPromptFooterLabel}
                        footerHint={proPromptFooterHint}
                        rows={[
                          {
                            label: "当前输入",
                            value: `${activeBaseMeter.localUsed}`,
                          },
                          {
                            label: proPromptTab === "prompt" ? "已写 Prompt" : "已写 UC",
                            value: `${activeBaseMeter.writtenTokens}`,
                          },
                          ...(activeBaseMeter.hiddenTokens > 0
                            ? [{
                                label: activeChannelSnapshot.hiddenLabel,
                                value: `${activeBaseMeter.hiddenTokens}`,
                              }]
                            : []),
                          {
                            label: proPromptTab === "prompt" ? "Character Prompts" : "Character UCs",
                            value: `${activeBaseMeter.characterTokens}`,
                          },
                          {
                            label: "总计",
                            value: `${activeBaseMeter.totalUsed}/${NOVELAI_V45_CONTEXT_LIMIT}`,
                          },
                        ]}
                      />
                    </div>
                     {!sourceImageDataUrl
                      ? (
                          <div className="-mx-3 -mb-3 mt-3 flex items-center justify-between border-t border-[#2A3138] bg-[#161A1F] px-4 py-3">
                            <div className="text-[15px] text-base-content/58">
                              Add a Base Img (Optional)
                            </div>
                            <button
                              type="button"
                              className={featureUploadActionClassName}
                              aria-label="上传 Base Img"
                              title="上传 Base Img"
                              onClick={handleOpenSourceImagePicker}
                            >
                              <FileArrowUpIcon className="size-5" weight="bold" />
                            </button>
                          </div>
                        )
                      : null}
                    {mode === "infill" && sourceImageDataUrl
                      ? renderProInfillSection()
                      : null}
                    {mode === "img2img" && sourceImageDataUrl
                      ? (
                          <div className="-mx-3 -mb-3 mt-3 overflow-hidden border-t border-[#2A3138] bg-[#161A1F]">
                            <div className={baseImagePanelClassName}>
                                <img
                                  src={sourceImageDataUrl}
                                  alt="Base Img"
                                  className="absolute inset-0 h-full w-full object-cover opacity-28"
                              />
                              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,13,27,0.66)_0%,rgba(11,13,27,0.74)_100%)]" />
                              <div className={baseImageHeaderClassName}>
                                <div className="min-w-0">
                                  <div className="text-[15px] font-semibold leading-6 text-white">Image2Image</div>
                                  <div className="mt-1 text-[13px] leading-5 text-white/72">Transform your image.</div>
                                </div>
                                <div className={baseImageControlGroupClassName}>
                                  <div className="flex overflow-hidden rounded-md border border-[#2A3138] bg-[#161A1F]">
                                    <button
                                      type="button"
                                      className="inline-flex size-11 items-center justify-center text-white/80 transition hover:bg-white/6 hover:text-white focus:outline-none"
                                      aria-label="更换 Base Img"
                                      title="更换 Base Img"
                                      onClick={handleOpenSourceImagePicker}
                                    >
                                      <ArrowClockwise className="size-5" weight="bold" />
                                    </button>
                                    <span className="h-11 w-px bg-[#2A3138]" aria-hidden="true" />
                                    <button
                                      type="button"
                                      className="inline-flex size-11 items-center justify-center text-white/80 transition hover:bg-white/6 hover:text-white focus:outline-none"
                                      aria-label="移除 Base Img"
                                      title="移除 Base Img"
                                      onClick={handleClearSourceImage}
                                    >
                                      <TrashIcon className="size-5" weight="bold" />
                                    </button>
                                  </div>
                                  <button
                                    type="button"
                                    className={baseImageToggleButtonClassName}
                                    aria-label={isBaseImageToolsOpen ? "收起 Base Img 工具" : "展开 Base Img 工具"}
                                    title={isBaseImageToolsOpen ? "收起 Base Img 工具" : "展开 Base Img 工具"}
                                    onClick={() => setIsBaseImageToolsOpen(prev => !prev)}
                                  >
                                    <ChevronDown className={`size-5 shrink-0 transition-transform ${isBaseImageToolsOpen ? "rotate-180" : ""}`} />
                                  </button>
                                </div>
                              </div>
                              {isBaseImageToolsOpen
                                ? (
                                    <div className="relative z-10 mt-4 space-y-4">
                                      <label className="block">
                                        <div className="flex items-center justify-between text-[13px] font-semibold leading-5 text-white">
                                          <span>Strength</span>
                                          <span>{formatSliderValue(strength)}</span>
                                        </div>
                                        <input
                                          type="range"
                                          min={0.01}
                                          max={1}
                                          step={0.01}
                                          value={strength}
                                          className={baseImageRangeClassName}
                                          onChange={event => setStrength(clampRange(Number(event.target.value), 0.01, 1, 0.7))}
                                        />
                                      </label>

                                      <label className="block">
                                        <div className="flex items-center justify-between text-[13px] font-semibold leading-5 text-white">
                                          <span>Noise</span>
                                          <span>{formatSliderValue(noise)}</span>
                                        </div>
                                        <input
                                          type="range"
                                          min={0}
                                          max={0.99}
                                          step={0.01}
                                          value={noise}
                                          className={baseImageRangeClassName}
                                          onChange={event => setNoise(clampRange(Number(event.target.value), 0, 0.99, 0.2))}
                                        />
                                      </label>

                                      <button
                                        type="button"
                                        className={baseImageActionButtonClassName}
                                        disabled={isBusy}
                                        onClick={() => void handleOpenBaseImageInpaint()}
                                      >
                                        <SelectionPlusIcon className="size-5" weight="bold" />
                                        <span>Inpaint Image</span>
                                      </button>
                                    </div>
                                  )
                                : null}
                            </div>
                          </div>
                        )
                      : null}
                  </div>

                  <div>
                    <div className="flex items-start justify-between gap-4 px-1 py-1">
                      <div className="min-w-0">
                        <div className="text-[15px] leading-6 text-base-content/86">Character Prompts</div>
                        <div className="mt-1 text-[13px] leading-5 text-base-content/58">{characterPromptDescription}</div>
                      </div>
                      <div ref={characterAddMenuRef} className="relative shrink-0">
                        <button
                          type="button"
                          className={`${characterAddTriggerClassName} ${isCharacterAddMenuOpen ? "invisible pointer-events-none" : ""}`}
                          aria-haspopup="menu"
                          aria-expanded={isCharacterAddMenuOpen}
                          onClick={() => setIsCharacterAddMenuOpen(prev => !prev)}
                          disabled={!isNAI4}
                        >
                          <PlusIcon className="size-5" weight="bold" />
                          <span>Add Character</span>
                        </button>
                        {isCharacterAddMenuOpen
                          ? (
                              <div className={characterAddMenuPanelClassName} role="menu" aria-label="Add Character presets">
                                <button
                                  type="button"
                                  className={characterAddMenuItemClassName}
                                  role="menuitem"
                                  onClick={() => {
                                    setIsCharacterAddMenuOpen(false);
                                    handleAddV4Char({ defaultPrompt: "girl,", gender: "female" });
                                  }}
                                >
                                  <GenderFemaleIcon className="size-3.5 shrink-0 text-white/90" weight="regular" />
                                  <span>Female</span>
                                </button>
                                <button
                                  type="button"
                                  className={characterAddMenuItemClassName}
                                  role="menuitem"
                                  onClick={() => {
                                    setIsCharacterAddMenuOpen(false);
                                    handleAddV4Char({ defaultPrompt: "boy,", gender: "male" });
                                  }}
                                >
                                  <GenderMaleIcon className="size-3.5 shrink-0 text-white/90" weight="regular" />
                                  <span>Male</span>
                                </button>
                                <button
                                  type="button"
                                  className={characterAddMenuItemClassName}
                                  role="menuitem"
                                  onClick={() => {
                                    setIsCharacterAddMenuOpen(false);
                                    handleAddV4Char({ gender: "other" });
                                  }}
                                >
                                  <CircleIcon className="size-3.5 shrink-0 text-white/85" weight="regular" />
                                  <span>Other</span>
                                </button>
                              </div>
                            )
                          : null}
                      </div>
                    </div>
                    {proFeatureSections.characterPrompts
                      ? (isNAI4
                          ? (
                              <div className="mt-4 space-y-3">
                                {v4Chars.map((row, idx) => {
                                  const disabledUp = idx === 0 || !v4UseOrder;
                                  const disabledDown = idx === v4Chars.length - 1 || !v4UseOrder;
                                  const activeTab = charPromptTabs[row.id] || "prompt";
                                  const activeCharChannelSnapshot = activeTab === "prompt" ? tokenSnapshot.prompt : tokenSnapshot.negative;
                                  const activeCharMeter = activeCharChannelSnapshot.characters[row.id];
                                  const rowGender = row.gender || "other";
                                  const RowGenderIcon = rowGender === "female"
                                    ? GenderFemaleIcon
                                    : rowGender === "male"
                                      ? GenderMaleIcon
                                      : CircleIcon;
                                  const currentPositionCode = getV4CharGridCellByCenter(row.centerX, row.centerY).code;
                                  const isCharacterPositionPickerOpen = characterPositionPickerState?.characterId === row.id;
                                  const selectedPositionCode = isCharacterPositionPickerOpen ? characterPositionPickerState.code : currentPositionCode;
                                  return (
                                    <div key={row.id} className={characterCardClassName}>
                                      <div className={isCharacterPositionPickerOpen ? "invisible pointer-events-none select-none" : ""}>
                                        <div className="mb-3 flex items-center gap-2">
                                          <div className="flex min-w-0 items-center gap-1.5 text-white/92">
                                            <RowGenderIcon className={characterCardTitleIconClassName} weight="regular" />
                                            <div className="truncate text-[14px] font-medium leading-6">{`Character ${idx + 1}`}</div>
                                          </div>
                                          <div className="ml-auto flex items-center gap-0.5">
                                            <button
                                              type="button"
                                              className={characterCardHeaderActionClassName}
                                              onClick={() => handleMoveV4Char(row.id, -1)}
                                              disabled={disabledUp}
                                              aria-label="上移角色"
                                              title="上移角色"
                                            >
                                              <CaretUpIcon className="size-4" weight="bold" />
                                            </button>
                                            <button
                                              type="button"
                                              className={characterCardHeaderActionClassName}
                                              onClick={() => handleMoveV4Char(row.id, 1)}
                                              disabled={disabledDown}
                                              aria-label="下移角色"
                                              title="下移角色"
                                            >
                                              <CaretDownIcon className="size-4" weight="bold" />
                                            </button>
                                            <button
                                              type="button"
                                              className={characterCardHeaderActionClassName}
                                              onClick={() => handleRemoveV4Char(row.id)}
                                              aria-label="删除角色"
                                              title="删除角色"
                                            >
                                              <TrashIcon className="size-4" weight="bold" />
                                            </button>
                                          </div>
                                        </div>
                                        <div className="space-y-3">
                                          <div className={segmentedControlClassName}>
                                            <button
                                              type="button"
                                              className={`${segmentedButtonBaseClassName} ${activeTab === "prompt" ? "bg-white/10 text-white shadow-none" : "bg-transparent text-white/55 hover:bg-white/6 hover:text-white"}`}
                                              onClick={() => setCharPromptTabs(prev => ({ ...prev, [row.id]: "prompt" }))}
                                            >
                                              Prompt
                                            </button>
                                            <button
                                              type="button"
                                              className={`${segmentedButtonBaseClassName} ${activeTab === "negative" ? "bg-white/10 text-white shadow-none" : "bg-transparent text-white/55 hover:bg-white/6 hover:text-white"}`}
                                              onClick={() => setCharPromptTabs(prev => ({ ...prev, [row.id]: "negative" }))}
                                            >
                                              Undesired Content
                                            </button>
                                          </div>
                                          <HighlightEmphasisTextarea
                                            highlightEnabled={highlightEmphasisEnabled}
                                            surfaceClassName={highlightCharSurfaceClassName}
                                            contentClassName={highlightCharContentClassName}
                                            value={activeTab === "prompt" ? row.prompt : row.negativePrompt}
                                            onChange={(e) => {
                                              if (activeTab === "prompt")
                                                handleUpdateV4Char(row.id, { prompt: e.target.value });
                                              else
                                                handleUpdateV4Char(row.id, { negativePrompt: e.target.value });
                                            }}
                                            placeholder=""
                                            spellCheck={false}
                                          />
                                          <AiImageContextLimitMeter
                                            localUsed={activeCharMeter?.localUsed ?? 0}
                                            totalUsed={activeCharMeter?.totalUsed ?? 0}
                                            remaining={activeCharMeter?.remaining ?? NOVELAI_V45_CONTEXT_LIMIT}
                                            overflow={activeCharMeter?.overflow ?? 0}
                                            status={tokenSnapshot.status}
                                            rows={[
                                              {
                                                label: "当前角色",
                                                value: `${activeCharMeter?.localUsed ?? 0}`,
                                              },
                                              {
                                                label: "主输入",
                                                value: `${activeCharMeter?.baseTokens ?? 0}`,
                                              },
                                              ...((activeCharMeter?.hiddenTokens ?? 0) > 0
                                                ? [{
                                                    label: activeCharChannelSnapshot.hiddenLabel,
                                                    value: `${activeCharMeter?.hiddenTokens ?? 0}`,
                                                  }]
                                                : []),
                                              {
                                                label: "其他角色",
                                                value: `${activeCharMeter?.otherCharacterTokens ?? 0}`,
                                              },
                                              {
                                                label: "总计",
                                                value: `${activeCharMeter?.totalUsed ?? 0}/${NOVELAI_V45_CONTEXT_LIMIT}`,
                                              },
                                            ]}
                                          />
                                          {showCharacterPositionsGlobalSection
                                            ? (
                                                <div className="relative space-y-3">
                                                  <div className={`flex flex-wrap items-center gap-2 text-[12px] font-medium leading-5 text-white/90 ${isCharacterPositionAiChoiceEnabled || isCharacterPositionPickerOpen ? "invisible" : ""}`}>
                                                    <span className="text-white/72">Position</span>
                                                    {isCharacterPositionAiChoiceEnabled
                                                      ? <span className="text-white/92">AI's Choice</span>
                                                      : (
                                                          <>
                                                            <button
                                                              type="button"
                                                              className="inline-flex h-8 items-center rounded-md bg-white/10 px-3 text-[12px] font-semibold text-white transition hover:bg-white/14 focus:outline-none focus:ring-2 focus:ring-white/15"
                                                              onClick={() => handleOpenCharacterPositionPicker(row.id, currentPositionCode)}
                                                            >
                                                              Adjust
                                                            </button>
                                                            <span className="text-[20px] font-semibold leading-none tracking-[0.08em] text-white/96">{selectedPositionCode}</span>
                                                          </>
                                                        )}
                                                  </div>
                                                </div>
                                              )
                                            : null}
                                        </div>
                                      </div>

                                      {showCharacterPositionsGlobalSection && !isCharacterPositionAiChoiceEnabled && isCharacterPositionPickerOpen
                                        ? (
                                            <div className="absolute inset-0 z-20 flex flex-col rounded-2xl border border-[#2A3138] bg-[#161A1F] p-2.5 shadow-2xl">
                                              <div className="flex items-center gap-1.5 text-[11px] font-medium leading-5 text-white/90">
                                                <span className="text-white/72">Position</span>
                                                <span className="text-[16px] font-semibold leading-none tracking-[0.08em] text-white/96">{selectedPositionCode}</span>
                                              </div>
                                              <div className="mt-2 grid grid-cols-5 gap-1 rounded-md border border-[#2A3138] bg-[#161A1F] p-1">
                                                {V4_CHAR_GRID_CELLS.map((cell) => {
                                                  const occupant = characterPositionAssignments.get(cell.code);
                                                  const occupiedByOther = Boolean(occupant && occupant.characterId !== row.id);
                                                  const isSelected = selectedPositionCode === cell.code;
                                                  return (
                                                    <button
                                                      key={cell.code}
                                                      type="button"
                                                      className={`flex h-8 items-center justify-center rounded-md border text-[16px] font-semibold leading-none transition focus:outline-none ${
                                                        occupiedByOther
                                                          ? "cursor-not-allowed border-white/8 bg-transparent text-white/42"
                                                          : isSelected
                                                            ? "border-white/60 bg-white/18 text-white"
                                                            : "border-white/8 bg-transparent text-white/72 hover:border-white/20 hover:bg-white/6"
                                                      }`}
                                                      disabled={occupiedByOther}
                                                      aria-label={`选择位置 ${cell.code}`}
                                                      title={cell.code}
                                                      onClick={() => handleSelectCharacterPositionCode(cell.code)}
                                                    >
                                                      {occupant ? `${occupant.index + 1}` : ""}
                                                    </button>
                                                  );
                                                })}
                                              </div>
                                              <div className="mt-2 flex justify-center">
                                                <button
                                                  type="button"
                                                  className="inline-flex h-9 items-center rounded-md bg-white/10 px-4 text-[14px] font-semibold text-white transition hover:bg-white/14 focus:outline-none focus:ring-2 focus:ring-white/15"
                                                  onClick={() => handleSaveCharacterPosition(row.id)}
                                                >
                                                  Done
                                                </button>
                                              </div>
                                            </div>
                                          )
                                        : null}
                                    </div>
                                  );
                                })}
                                {showCharacterPositionsGlobalSection
                                  ? (
                                      <div className={characterPositionsSectionClassName}>
                                        <div className="min-w-0 text-[15px] font-medium leading-6 text-white/92">
                                          Character Positions (Global)
                                        </div>
                                        <button
                                          type="button"
                                          className={`${characterPositionsToggleBaseClassName} ${
                                            isCharacterPositionAiChoiceEnabled
                                              ? "border-[#F2E8A5] bg-[#F2E8A5] text-[#201C0F] hover:bg-[#E7DB87]"
                                              : "border-[#2F3841] bg-[#1B2026] text-white/74 hover:border-primary/40 hover:text-white"
                                          }`}
                                          aria-pressed={isCharacterPositionAiChoiceEnabled}
                                          onClick={handleToggleCharacterPositionAiChoice}
                                        >
                                          <span>AI's Choice</span>
                                        </button>
                                      </div>
                                    )
                                  : null}
                              </div>
                            )
                          : <div className="mt-4 text-sm opacity-60">当前模型不支持 Character Prompts。</div>)
                      : null}
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="rounded-md border border-[#2A3138] bg-[#161A1F] shadow-none">
                      <div className="flex items-center justify-between gap-4 px-4 py-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex size-8 shrink-0 items-center justify-center text-white/90" aria-hidden="true">
                            <ReferenceActionIcon className="size-6 shrink-0" src={vibeTransferIconSrc} />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[15px] font-semibold leading-6 text-white">Vibe Transfer</div>
                            <div className="mt-0.5 text-[13px] leading-5 text-white/58">{vibeTransferDescription}</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          className={`${featureUploadActionClassName} cursor-not-allowed opacity-45`}
                          aria-label="上传 Vibe Transfer 参考图"
                          title="上传 Vibe Transfer 参考图"
                          disabled
                        >
                          <FileArrowUpIcon className="size-5" weight="bold" />
                        </button>
                      </div>
                    </div>

                    <div className="rounded-md border border-[#2A3138] bg-[#161A1F] shadow-none">
                      <div className="flex items-center justify-between gap-4 px-4 py-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex size-8 shrink-0 items-center justify-center text-white/90" aria-hidden="true">
                            <ReferenceActionIcon className="size-6 shrink-0" src={preciseReferenceIconSrc} />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[15px] font-semibold leading-6 text-white">Precise Reference</div>
                            <div className="mt-0.5 text-[13px] leading-5 text-white/58">{preciseReferenceDescription}</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          className={`${featureUploadActionClassName} cursor-not-allowed opacity-45`}
                          aria-label="上传 Precise Reference 参考图"
                          title="上传 Precise Reference 参考图"
                          disabled
                        >
                          <FileArrowUpIcon className="size-5" weight="bold" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
        </div>
      </div>

      <div className={sideCardClassName}>
        <div className="card-body gap-3 p-4">
          <div className="flex items-center gap-2">
            <div className="font-medium">绘图设置</div>
          </div>
          {uiMode === "simple"
            ? (
                <>
                  <div className="grid w-full max-w-full grid-cols-[minmax(0,1fr)_135px] items-start gap-[50px]">
                    <div className="relative" ref={simpleResolutionSelectorRef}>
                      <button
                        type="button"
                        className={`flex h-11 w-full items-center justify-between !rounded-none border border-[#D6DCE3] bg-[#F3F5F7] px-3 py-2 text-left transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 hover:border-primary/40 hover:bg-[#EAEFF4] dark:border-[#2A3138] dark:bg-[#161A1F] dark:hover:bg-[#1B2026] ${isSimpleResolutionSelectorOpen ? "border-primary bg-primary/5 shadow-sm dark:bg-primary/10" : ""}`}
                        aria-expanded={isSimpleResolutionSelectorOpen}
                        onClick={() => setIsSimpleResolutionSelectorOpen(prev => !prev)}
                      >
                        <div className="flex min-w-0 items-center gap-2.5 text-base-content/80">
                          {renderResolutionGlyph(activeSimpleResolutionOption.id)}
                          <span className="truncate text-xs font-medium tracking-tight">{activeSimpleResolutionOption.label}</span>
                        </div>
                        <ChevronDown className={`size-4 shrink-0 text-base-content/60 transition-transform ${isSimpleResolutionSelectorOpen ? "rotate-180" : ""}`} />
                      </button>

                      {isSimpleResolutionSelectorOpen
                        ? (
                            <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 overflow-hidden !rounded-none border border-[#D6DCE3] bg-[#F3F5F7] p-2 shadow-2xl dark:border-[#2A3138] dark:bg-[#161A1F]">
                              <div className="flex flex-col gap-1">
                                {simpleResolutionOptions.map(option => (
                                  <button
                                    key={option.id}
                                    type="button"
                                    className={`flex items-center gap-3 rounded-lg px-4 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                                      simpleResolutionSelection === option.id
                                        ? "bg-primary/10 text-base-content"
                                        : "text-base-content/78 hover:bg-base-100 dark:hover:bg-[#1B2026]"
                                    }`}
                                    onClick={() => {
                                      handleSelectSimpleResolutionPreset(option.id);
                                      setIsSimpleResolutionSelectorOpen(false);
                                    }}
                                  >
                                    {renderResolutionGlyph(option.id)}
                                    <span className="text-xs font-medium">{option.label}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )
                        : null}
                    </div>

                    <div className="grid h-11 w-[135px] grid-cols-[minmax(0,1fr)_10px_minmax(0,1fr)] items-center gap-1 !rounded-none border border-[#D6DCE3] bg-[#F3F5F7] px-3 py-2 shadow-sm dark:border-[#2A3138] dark:bg-[#161A1F]">
                      <input
                        className={simpleResolutionValueInputClassName}
                        type="number"
                        min={1}
                        max={SIMPLE_MODE_CUSTOM_MAX_DIMENSION}
                        step={1}
                        value={widthInput}
                        onChange={e => handleSimpleWidthChange(e.target.value)}
                      />
                      <span className="text-center text-xs font-medium text-base-content/55">×</span>
                      <input
                        className={simpleResolutionValueInputClassName}
                        type="number"
                        min={1}
                        max={SIMPLE_MODE_CUSTOM_MAX_DIMENSION}
                        step={1}
                        value={heightInput}
                        onChange={e => handleSimpleHeightChange(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center text-xs text-base-content/70">
                      <span>种子 (Seed)</span>
                    </div>
                    <input
                      className={`h-8 w-full appearance-none focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${subtleInputClassName}`}
                      type="number"
                      value={seedIsRandom ? "" : seed}
                      onChange={(e) => {
                        const value = e.target.value.trim();
                        setSeed(value ? Number(value) : -1);
                      }}
                    />
                  </div>
                </>
              )
            : (
                <>
                  <div className="grid w-full max-w-full grid-cols-[minmax(0,1fr)_135px] items-start gap-[50px]">
                    <div className="relative" ref={proResolutionSelectorRef}>
                      <button
                        type="button"
                        className={`flex h-11 w-full items-center justify-between !rounded-none border border-[#D6DCE3] bg-[#F3F5F7] px-3 py-2 text-left transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 hover:border-primary/40 hover:bg-[#EAEFF4] dark:border-[#2A3138] dark:bg-[#161A1F] dark:hover:bg-[#1B2026] ${isProResolutionSelectorOpen ? "border-primary bg-primary/5 shadow-sm dark:bg-primary/10" : ""}`}
                        aria-expanded={isProResolutionSelectorOpen}
                        onClick={() => setIsProResolutionSelectorOpen(prev => !prev)}
                      >
                        <div className="flex min-w-0 items-center gap-2.5 text-base-content/80">
                          {renderResolutionGlyph(activeProResolutionOption.id)}
                          <span className="truncate text-xs font-medium tracking-tight">{activeProResolutionOption.label}</span>
                        </div>
                        <ChevronDown className={`size-4 shrink-0 text-base-content/60 transition-transform ${isProResolutionSelectorOpen ? "rotate-180" : ""}`} />
                      </button>

                      {isProResolutionSelectorOpen
                        ? (
                            <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 overflow-hidden !rounded-none border border-[#D6DCE3] bg-[#F3F5F7] p-2 shadow-2xl dark:border-[#2A3138] dark:bg-[#161A1F]">
                              <div className="flex flex-col gap-1">
                                {simpleResolutionOptions.map(option => (
                                  <button
                                    key={option.id}
                                    type="button"
                                    className={`flex items-center gap-3 rounded-lg px-4 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                                      activeProResolutionOption.id === option.id
                                        ? "bg-primary/10 text-base-content"
                                        : "text-base-content/78 hover:bg-base-100 dark:hover:bg-[#1B2026]"
                                    }`}
                                    onClick={() => {
                                      handleSelectProResolutionPreset(option.id);
                                      setIsProResolutionSelectorOpen(false);
                                    }}
                                  >
                                    {renderResolutionGlyph(option.id)}
                                    <span className="text-xs font-medium">{option.label}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )
                        : null}
                    </div>

                    <div className="grid h-11 w-[135px] grid-cols-[minmax(0,1fr)_10px_minmax(0,1fr)] items-center gap-1 !rounded-none border border-[#D6DCE3] bg-[#F3F5F7] px-3 py-2 shadow-sm dark:border-[#2A3138] dark:bg-[#161A1F]">
                      <input
                        className={simpleResolutionValueInputClassName}
                        type="number"
                        min={1}
                        max={SIMPLE_MODE_CUSTOM_MAX_DIMENSION}
                        step={1}
                        value={widthInput}
                        onChange={e => handleProWidthChange(e.target.value)}
                      />
                      <button
                        type="button"
                        className="flex items-center justify-center text-center text-xs font-medium text-base-content/55 focus:outline-none"
                        title="交换宽高"
                        aria-label="交换宽高"
                        onClick={handleSwapImageDimensions}
                      >
                        ×
                      </button>
                      <input
                        className={simpleResolutionValueInputClassName}
                        type="number"
                        min={1}
                        max={SIMPLE_MODE_CUSTOM_MAX_DIMENSION}
                        step={1}
                        value={heightInput}
                        onChange={e => handleProHeightChange(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="grid h-11 w-full grid-cols-9 overflow-hidden border border-[#2A3138] bg-[#161A1F] shadow-none">
                      <div className="flex h-11 items-center justify-center border-r border-[#2A3138] text-white/90" aria-hidden="true">
                        <ImagesSquareIcon className="size-4.5" weight="regular" />
                      </div>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(count => {
                        const isActive = imageCount === count;
                        const isDisabled = count !== 1;
                        return (
                          <button
                            key={count}
                            type="button"
                            className={`flex h-11 w-11 items-center justify-center border-r border-[#2A3138] text-[14px] font-semibold leading-none transition last:border-r-0 ${
                              isActive
                                ? "bg-[#1E252D] text-[#EAF7F5]"
                                : "bg-transparent text-white/35"
                            }`}
                            disabled={isDisabled}
                            aria-pressed={isActive}
                            onClick={() => setImageCount(count)}
                          >
                            {count}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </>
              )}
        </div>
      </div>

      </div>

      {renderProBottomSettingsDrawer()}

      {uiMode === "simple" || uiMode === "pro"
        ? (
            <div className="shrink-0 bg-[#F3F5F7] p-4 backdrop-blur dark:bg-[#161A1F]">
              <button
                type="button"
                className={`btn h-12 w-full justify-between border px-4 disabled:border-base-300 disabled:bg-base-200 disabled:text-base-content/35 ${
                  uiMode === "simple"
                    ? simplePrimaryActionToneClassName
                    : "btn-primary"
                }`}
                disabled={uiMode === "simple" ? !canTriggerSimplePrimaryAction : !canTriggerProGenerate}
                onClick={() => {
                  if (uiMode === "simple") {
                    if (hasReadySimpleTags) {
                      void handleSimpleGenerateFromTags();
                      return;
                    }
                    void handleSimpleConvertToTags();
                    return;
                  }
                  void runGenerate();
                }}
              >
                <span className="font-semibold">{uiMode === "simple" ? simplePrimaryActionLabel : proGenerateLabel}</span>
                {uiMode === "simple"
                  ? (
                      hasReadySimpleTags
                        ? (
                            <span className={`badge badge-sm badge-outline px-2 py-1 text-xs font-semibold ${simplePrimaryActionBadgeClassName}`}>
                              1x
                            </span>
                          )
                        : (
                            simpleConverting
                              ? <CircleNotch className="size-4 animate-spin" weight="bold" />
                              : <SparkleIcon className="size-4" weight="fill" />
                          )
                    )
                  : (
                      <span className="badge badge-sm badge-outline px-2 py-1 text-xs font-semibold text-current">
                        {`${imageCount}x`}
                      </span>
                    )}
              </button>
            </div>
          )
        : null}

    </div>

  );
}
