import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import type { ProEditorContentLocalProps } from "@/components/aiImage/sidebar/ProEditorContent";
import type { SimpleEditorContentLocalProps } from "@/components/aiImage/sidebar/SimpleEditorContent";
import type { AiImagePageController } from "@/components/aiImage/useAiImagePageController";
import { CircleNotch, ImageSquareIcon, ImagesSquareIcon, SparkleIcon, XCircleIcon } from "@phosphor-icons/react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CUSTOM_RESOLUTION_ID,
  RESOLUTION_PRESETS,
} from "@/components/aiImage/constants";
import {
  getV4CharGridCellByCenter,
  getV4CharGridCellByCode,
  resolveSimpleGenerateMode,
  toggleNovelAiLineComments,
} from "@/components/aiImage/helpers";
import { useNovelAiV45TokenSnapshot } from "@/components/aiImage/novelaiV45TokenMeter";
import { renderProInfillSectionContent, renderSimpleBaseImageSectionContent } from "@/components/aiImage/sidebar/baseImageSections";
import { renderProBottomSettingsDrawerContent } from "@/components/aiImage/sidebar/ProBottomSettingsDrawer";
import { ProEditorContent } from "@/components/aiImage/sidebar/ProEditorContent";
import { renderResolutionGlyph as renderResolutionGlyphContent } from "@/components/aiImage/sidebar/renderResolutionGlyph";
import { SimpleEditorContent } from "@/components/aiImage/sidebar/SimpleEditorContent";
import { useDelayedPresence } from "@/components/aiImage/sidebar/useDelayedPresence";
import { useDismissibleLayer } from "@/components/aiImage/sidebar/useDismissibleLayer";
import { useFloatingPanelPosition } from "@/components/aiImage/sidebar/useFloatingPanelPosition";
import { ChevronDown } from "@/icons";

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
const RESOLUTION_OPTIONS = [...RESOLUTION_PRESETS, { id: CUSTOM_RESOLUTION_ID, label: "自定义" }] as const;
type ModeOptionValue = (typeof MODE_OPTIONS)[number]["value"];

export const AiImageSidebar = memo(({ sidebarProps }: AiImageSidebarProps) => {
  const {
    canConvertSimpleText,
    canGenerateFromSimpleTags,
    canTriggerProGenerate,
    cfgRescale,
    charPromptTabs,
    characterPromptDescription,
    hasSimpleTagsDraft,
    isBusy,
    handleClearCurrentDisplayedImage,
    handleClearSourceImage,
    handleOpenSourceImagePicker,
    handleCommitProDimensions,
    handleCommitSimpleDimensions,
    freeGenerationViolation,
    handleResetCurrentImageSettings,
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
    handleReturnFromInfillSettings,
    hasCurrentDisplayedImage,
    imageCount,
    infillMaskDataUrl,
    isDirectorToolsOpen,
    isNAI3,
    isNAI4,
    mode,
    negativePrompt,
    noise,
    noiseSchedule,
    noiseScheduleOptions,
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
    setCfgRescale,
    setImageCount,
    setNegativePrompt,
    setNoise,
    setNoiseSchedule,
    setPrompt,
    setQualityToggle,
    setSampler,
    setScale,
    setSeed,
    setSimpleNegativePrompt,
    setSimplePrompt,
    setSmea,
    setSmeaDyn,
    setSteps,
    setStrength,
    setUiMode,
    handleSetV4UseCoords,
    simpleConvertLabel,
    simpleConverting,
    simpleEditorMode,
    simpleConverted,
    simplePromptTab,
    simpleResolutionSelection,
    smea,
    smeaDyn,
    sourceImageDataUrl,
    steps,
    strength,
    ucPreset,
    uiMode,
    v4Chars,
    v4UseCoords,
    widthInput,
    heightInput,
  } = sidebarProps;

  const isToggleLineCommentShortcut = useCallback((event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.altKey)
      return false;
    if (!event.ctrlKey && !event.metaKey)
      return false;
    return event.code === "Slash" || event.key === "/" || event.key === "?";
  }, []);

  const handleToggleLineCommentForProPrompt = useCallback((event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (!isToggleLineCommentShortcut(event))
      return;
    event.preventDefault();

    const textarea = event.currentTarget;
    const toggled = toggleNovelAiLineComments({
      value: textarea.value,
      selectionStart: textarea.selectionStart,
      selectionEnd: textarea.selectionEnd,
    });
    if (proPromptTab === "prompt")
      setPrompt(toggled.value);
    else
      setNegativePrompt(toggled.value);

    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(toggled.selectionStart, toggled.selectionEnd);
    });
  }, [isToggleLineCommentShortcut, proPromptTab, setNegativePrompt, setPrompt]);

  const handleToggleLineCommentForSimpleTags = useCallback((event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (!isToggleLineCommentShortcut(event))
      return;
    event.preventDefault();

    const textarea = event.currentTarget;
    const toggled = toggleNovelAiLineComments({
      value: textarea.value,
      selectionStart: textarea.selectionStart,
      selectionEnd: textarea.selectionEnd,
    });
    if (simplePromptTab === "prompt")
      setSimplePrompt(toggled.value);
    else
      setSimpleNegativePrompt(toggled.value);

    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(toggled.selectionStart, toggled.selectionEnd);
    });
  }, [isToggleLineCommentShortcut, setSimpleNegativePrompt, setSimplePrompt, simplePromptTab]);

  const handleToggleLineCommentForV4Char = useCallback((event: ReactKeyboardEvent<HTMLTextAreaElement>, characterId: string) => {
    if (!isToggleLineCommentShortcut(event))
      return;
    event.preventDefault();

    const textarea = event.currentTarget;
    const toggled = toggleNovelAiLineComments({
      value: textarea.value,
      selectionStart: textarea.selectionStart,
      selectionEnd: textarea.selectionEnd,
    });
    const activeTab = charPromptTabs[characterId] === "negative" ? "negative" : "prompt";
    if (activeTab === "prompt")
      handleUpdateV4Char(characterId, { prompt: toggled.value });
    else
      handleUpdateV4Char(characterId, { negativePrompt: toggled.value });

    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(toggled.selectionStart, toggled.selectionEnd);
    });
  }, [charPromptTabs, handleUpdateV4Char, isToggleLineCommentShortcut]);

  const sideCardClassName = "card border-x-0 border-b border-t-0 border-base-300 bg-base-100 shadow-none";
  const editorPanelClassName = "rounded-2xl border border-base-300 bg-base-100 p-3 shadow-none";
  const segmentedControlClassName = "join rounded-xl bg-transparent p-0";
  const segmentedButtonBaseClassName = "btn btn-xs join-item border-0";
  const featureUploadActionClassName = "inline-flex size-11 items-center justify-center rounded-md border border-base-300 bg-base-100 text-base-content/78 transition hover:border-primary/40 hover:bg-base-200 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/20";
  const characterAddTriggerClassName = "inline-flex h-8 items-center gap-1 rounded-md border border-base-300 bg-base-100 px-2.5 text-[13px] font-semibold text-base-content transition hover:border-primary/40 hover:bg-base-200 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/20";
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
  const baseImageActionButtonClassName = "inline-flex h-11 items-center gap-2 rounded-md border border-base-300 bg-base-100 px-4 text-[14px] font-semibold text-base-content transition hover:border-primary/40 hover:bg-base-200 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/20";
  const baseImageRangeClassName = "mt-2 w-full cursor-pointer appearance-none bg-transparent focus:outline-none [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-white/10 [&::-webkit-slider-thumb]:mt-[-4px] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:shadow-black/30 [&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-white/10 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-sm [&::-moz-range-thumb]:shadow-black/30";
  const simpleBaseImageAttachmentClassName = "mt-[2px] overflow-hidden !rounded-none border-x border-b border-base-300 bg-base-100 shadow-none";
  const [isModeSelectorOpen, setIsModeSelectorOpen] = useState<boolean>(false);
  const [isProPromptSettingsOpen, setIsProPromptSettingsOpen] = useState<boolean>(false);
  const [isBaseImageToolsOpen, setIsBaseImageToolsOpen] = useState<boolean>(() => mode === "img2img" || mode === "infill");
  const [isProBottomSettingsOpen, setIsProBottomSettingsOpen] = useState<boolean>(false);
  const [isCharacterAddMenuOpen, setIsCharacterAddMenuOpen] = useState<boolean>(false);
  const [highlightEmphasisEnabled, setHighlightEmphasisEnabled] = useState<boolean>(true);
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
  const simpleResolutionSelectorRef = useRef<HTMLDivElement | null>(null);
  const proResolutionSelectorRef = useRef<HTMLDivElement | null>(null);
  const isModeSelectorMounted = useDelayedPresence(isModeSelectorOpen, MODE_SELECTOR_TRANSITION_MS);
  const proPromptSettingsPosition = useFloatingPanelPosition({
    isOpen: isProPromptSettingsOpen,
    anchorRef: sidebarSurfaceRef,
    targetRef: proPromptEditorPanelRef,
  });
  const activeModeOption = MODE_OPTIONS.find(option => option.value === uiMode) ?? MODE_OPTIONS[0];
  const isSimplePreviewingConverted = Boolean(simpleConverted);
  const isSimpleTextEditor = simpleEditorMode === "text" && !isSimplePreviewingConverted;
  const isSimpleTagsEditor = simpleEditorMode === "tags";
  const activeSimpleResolutionOption = RESOLUTION_OPTIONS.find(option => option.id === simpleResolutionSelection) ?? RESOLUTION_OPTIONS[RESOLUTION_OPTIONS.length - 1];
  const activeProResolutionOption = RESOLUTION_OPTIONS.find(option => option.id === proResolutionSelection) ?? RESOLUTION_OPTIONS[RESOLUTION_OPTIONS.length - 1];
  const simpleGenerateMode = resolveSimpleGenerateMode(mode);
  const hasReadySimpleTags = isSimpleTagsEditor && (hasSimpleTagsDraft || simpleGenerateMode === "infill");
  const hasGeneratedSimpleTags = hasSimpleTagsDraft || Boolean(simpleConverted);
  const simplePrimaryActionLabel = hasReadySimpleTags
    ? proGenerateLabel
    : simpleConvertLabel !== "转化为 tags"
      ? simpleConvertLabel
      : hasGeneratedSimpleTags
        ? "重新生成 tags"
        : "生成 tags";
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
      queueMicrotask(() => setIsBaseImageToolsOpen(false));
  }, [sourceImageDataUrl]);
  const previousModeRef = useRef(mode);
  useEffect(() => {
    const prev = previousModeRef.current;
    previousModeRef.current = mode;
    if (prev === mode)
      return;
    if (mode === "img2img" || mode === "infill")
      queueMicrotask(() => setIsBaseImageToolsOpen(true));
  }, [mode]);
  const closeCharacterAddMenu = useCallback(() => {
    setIsCharacterAddMenuOpen(false);
  }, []);
  const closeModeSelector = useCallback(() => {
    setIsModeSelectorOpen(false);
  }, []);
  const closeSimpleResolutionSelector = useCallback(() => {
    setIsSimpleResolutionSelectorOpen(false);
  }, []);
  const closeProResolutionSelector = useCallback(() => {
    setIsProResolutionSelectorOpen(false);
  }, []);
  const closeProPromptSettings = useCallback(() => {
    setIsProPromptSettingsOpen(false);
  }, []);
  useEffect(() => {
    if (!proFeatureSections.characterPrompts)
      queueMicrotask(() => closeCharacterAddMenu());
  }, [closeCharacterAddMenu, proFeatureSections.characterPrompts]);
  useEffect(() => {
    queueMicrotask(() => setCharacterPositionPickerState((prev) => {
      if (!prev)
        return prev;
      if (!showCharacterPositionsGlobalSection || isCharacterPositionAiChoiceEnabled)
        return null;
      if (!v4Chars.some(row => row.id === prev.characterId))
        return null;
      return prev;
    }));
  }, [isCharacterPositionAiChoiceEnabled, showCharacterPositionsGlobalSection, v4Chars]);

  useDismissibleLayer({
    isOpen: isCharacterAddMenuOpen,
    containerRef: characterAddMenuRef,
    onDismiss: closeCharacterAddMenu,
  });
  useDismissibleLayer({
    isOpen: isModeSelectorOpen,
    containerRef: modeSelectorContainerRef,
    onDismiss: closeModeSelector,
  });
  useDismissibleLayer({
    isOpen: isSimpleResolutionSelectorOpen,
    containerRef: simpleResolutionSelectorRef,
    onDismiss: closeSimpleResolutionSelector,
  });
  useDismissibleLayer({
    isOpen: isProResolutionSelectorOpen,
    containerRef: proResolutionSelectorRef,
    onDismiss: closeProResolutionSelector,
  });
  useDismissibleLayer({
    isOpen: isProPromptSettingsOpen,
    containerRef: proPromptSettingsRef,
    onDismiss: closeProPromptSettings,
  });

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

  function handleSelectMode(nextMode: ModeOptionValue) {
    setUiMode(nextMode);
    closeModeSelector();
  }

  const renderProInfillSection = useCallback(() => {
    return renderProInfillSectionContent({
      sourceImageDataUrl,
      infillMaskDataUrl,
      isBusy,
      isBaseImageToolsOpen,
      strength,
      baseImageHeaderClassName,
      baseImageControlGroupClassName,
      baseImageToggleButtonClassName,
      baseImageRangeClassName,
      onOpenBaseImageInpaint: handleOpenBaseImageInpaint,
      onClearSourceImage: handleClearSourceImage,
      onReturnFromInfillSettings: handleReturnFromInfillSettings,
      onToggleBaseImageTools: () => setIsBaseImageToolsOpen(prev => !prev),
      setStrength,
    });
  }, [
    baseImageControlGroupClassName,
    baseImageHeaderClassName,
    baseImageRangeClassName,
    baseImageToggleButtonClassName,
    handleClearSourceImage,
    handleOpenBaseImageInpaint,
    handleReturnFromInfillSettings,
    infillMaskDataUrl,
    isBaseImageToolsOpen,
    isBusy,
    setStrength,
    sourceImageDataUrl,
    strength,
  ]);

  const renderSimpleBaseImageSection = useCallback(() => {
    return renderSimpleBaseImageSectionContent({
      sourceImageDataUrl,
      infillMaskDataUrl,
      mode,
      isBusy,
      isBaseImageToolsOpen,
      strength,
      noise,
      featureUploadActionClassName,
      simpleBaseImageAttachmentClassName,
      baseImagePanelClassName,
      baseImageHeaderClassName,
      baseImageControlGroupClassName,
      baseImageToggleButtonClassName,
      baseImageActionButtonClassName,
      baseImageRangeClassName,
      onOpenSourceImagePicker: handleOpenSourceImagePicker,
      onOpenBaseImageInpaint: handleOpenBaseImageInpaint,
      onClearSourceImage: handleClearSourceImage,
      onReturnFromInfillSettings: handleReturnFromInfillSettings,
      onToggleBaseImageTools: () => setIsBaseImageToolsOpen(prev => !prev),
      setStrength,
      setNoise,
    });
  }, [
    baseImageActionButtonClassName,
    baseImageControlGroupClassName,
    baseImageHeaderClassName,
    baseImagePanelClassName,
    baseImageRangeClassName,
    baseImageToggleButtonClassName,
    featureUploadActionClassName,
    handleClearSourceImage,
    handleOpenBaseImageInpaint,
    handleOpenSourceImagePicker,
    handleReturnFromInfillSettings,
    infillMaskDataUrl,
    isBaseImageToolsOpen,
    isBusy,
    mode,
    noise,
    setNoise,
    setStrength,
    simpleBaseImageAttachmentClassName,
    sourceImageDataUrl,
    strength,
  ]);

  function renderResolutionGlyph(optionId: string) {
    return renderResolutionGlyphContent(optionId);
  }

  function renderProBottomSettingsDrawer() {
    return renderProBottomSettingsDrawerContent({
      uiMode,
      isProBottomSettingsOpen,
      steps,
      scale,
      seedIsRandom,
      seed,
      sampler,
      samplerOptions,
      subtleInputClassName,
      subtleSelectClassName,
      noiseScheduleOptions,
      noiseSchedule,
      isNAI4,
      isNAI3,
      cfgRescale,
      qualityToggle,
      smea,
      smeaDyn,
      onResetCurrentImageSettings: handleResetCurrentImageSettings,
      onOpenDrawer: () => setIsProBottomSettingsOpen(true),
      onCloseDrawer: () => setIsProBottomSettingsOpen(false),
      setSteps,
      setQualityToggle,
      setScale,
      setSeed,
      setSampler,
      setCfgRescale,
      setNoiseSchedule,
      setSmea,
      setSmeaDyn,
    });
  }

  const simpleEditorLocal = useMemo<SimpleEditorContentLocalProps>(() => ({
    isSimpleTagsEditor,
    isSimplePreviewingConverted,
    isSimpleTextEditor,
    floatingInputActionBaseClassName,
    editorPanelClassName,
    segmentedControlClassName,
    segmentedButtonBaseClassName,
    floatingInputActionClassName,
    promptTextareaClassName,
    simplePromptTextareaClassName,
    highlightPromptSurfaceClassName,
    highlightPromptContentClassName,
    highlightEmphasisEnabled,
    renderSimpleBaseImageSection,
    handleToggleLineCommentForSimpleTags,
  }), [
    editorPanelClassName,
    floatingInputActionBaseClassName,
    floatingInputActionClassName,
    handleToggleLineCommentForSimpleTags,
    highlightEmphasisEnabled,
    highlightPromptContentClassName,
    highlightPromptSurfaceClassName,
    isSimplePreviewingConverted,
    isSimpleTagsEditor,
    isSimpleTextEditor,
    promptTextareaClassName,
    renderSimpleBaseImageSection,
    segmentedButtonBaseClassName,
    segmentedControlClassName,
    simplePromptTextareaClassName,
  ]);

  const proEditorLocal = useMemo<ProEditorContentLocalProps>(() => ({
    editorPanelClassName,
    segmentedControlClassName,
    segmentedButtonBaseClassName,
    highlightPromptSurfaceClassName,
    highlightPromptContentClassName,
    proPromptEditorPanelRef,
    proPromptSettingsRef,
    proPromptSettingsButtonRef,
    isProPromptSettingsOpen,
    setIsProPromptSettingsOpen,
    proPromptSettingsPosition,
    subtleSelectClassName,
    highlightEmphasisEnabled,
    setHighlightEmphasisEnabled,
    proPromptTextareaRef,
    activeBaseMeter,
    activeChannelSnapshot,
    proPromptFooterLabel,
    proPromptFooterHint,
    featureUploadActionClassName,
    renderProInfillSection,
    baseImagePanelClassName,
    baseImageHeaderClassName,
    baseImageControlGroupClassName,
    baseImageToggleButtonClassName,
    baseImageRangeClassName,
    baseImageActionButtonClassName,
    strength,
    setStrength,
    noise,
    setNoise,
    characterAddMenuRef,
    isCharacterAddMenuOpen,
    setIsCharacterAddMenuOpen,
    characterAddTriggerClassName,
    characterAddMenuPanelClassName,
    characterAddMenuItemClassName,
    characterCardClassName,
    characterCardHeaderActionClassName,
    characterCardTitleIconClassName,
    handleToggleLineCommentForProPrompt,
    handleToggleLineCommentForV4Char,
    highlightCharSurfaceClassName,
    highlightCharContentClassName,
    showCharacterPositionsGlobalSection,
    isCharacterPositionAiChoiceEnabled,
    characterPositionPickerState,
    characterPositionAssignments,
    handleOpenCharacterPositionPicker,
    handleSelectCharacterPositionCode,
    handleSaveCharacterPosition,
    characterPositionsSectionClassName,
    characterPositionsToggleBaseClassName,
    handleToggleCharacterPositionAiChoice,
    tokenSnapshot,
    characterPromptDescription,
    isBaseImageToolsOpen,
    setIsBaseImageToolsOpen,
  }), [
    activeBaseMeter,
    activeChannelSnapshot,
    baseImageActionButtonClassName,
    baseImageControlGroupClassName,
    baseImageHeaderClassName,
    baseImagePanelClassName,
    baseImageRangeClassName,
    baseImageToggleButtonClassName,
    characterAddMenuItemClassName,
    characterAddMenuPanelClassName,
    characterAddMenuRef,
    characterAddTriggerClassName,
    characterCardClassName,
    characterCardHeaderActionClassName,
    characterCardTitleIconClassName,
    characterPositionAssignments,
    characterPositionPickerState,
    characterPositionsSectionClassName,
    characterPositionsToggleBaseClassName,
    characterPromptDescription,
    editorPanelClassName,
    featureUploadActionClassName,
    handleOpenCharacterPositionPicker,
    handleSaveCharacterPosition,
    handleSelectCharacterPositionCode,
    handleToggleCharacterPositionAiChoice,
    handleToggleLineCommentForProPrompt,
    handleToggleLineCommentForV4Char,
    highlightCharContentClassName,
    highlightCharSurfaceClassName,
    highlightEmphasisEnabled,
    highlightPromptContentClassName,
    highlightPromptSurfaceClassName,
    isBaseImageToolsOpen,
    isCharacterAddMenuOpen,
    isCharacterPositionAiChoiceEnabled,
    isProPromptSettingsOpen,
    noise,
    proPromptEditorPanelRef,
    proPromptFooterHint,
    proPromptFooterLabel,
    proPromptSettingsButtonRef,
    proPromptSettingsPosition,
    proPromptSettingsRef,
    proPromptTextareaRef,
    renderProInfillSection,
    segmentedButtonBaseClassName,
    segmentedControlClassName,
    setHighlightEmphasisEnabled,
    setIsBaseImageToolsOpen,
    setIsCharacterAddMenuOpen,
    setIsProPromptSettingsOpen,
    setNoise,
    setStrength,
    showCharacterPositionsGlobalSection,
    strength,
    subtleSelectClassName,
    tokenSnapshot,
  ]);

  return (
    <div
      ref={sidebarSurfaceRef}
      className={`${isDirectorToolsOpen ? "hidden" : "flex"} relative h-full min-h-0 w-full min-w-0 flex-col gap-0 overflow-hidden border-r border-base-300 bg-base-100 p-0 shadow-none after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:w-5 after:bg-linear-to-l after:from-[rgba(15,23,42,0.08)] after:via-[rgba(15,23,42,0.03)] after:to-transparent after:content-[''] dark:after:from-[rgba(0,0,0,0.2)] dark:after:via-[rgba(0,0,0,0.08)]`}
    >
      <div className="ai-image-fade-scrollbar min-h-0 flex-1 overflow-y-auto">
        {isModeSelectorMounted
          ? (
              <div
                aria-hidden="true"
                className={`fixed inset-0 z-30 bg-black/20 backdrop-blur-[1.5px] transition-opacity duration-200 ease-out dark:bg-black/35 ${
                  isModeSelectorOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
                }`}
                onClick={closeModeSelector}
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
                            onClick={closeModeSelector}
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
                  <SimpleEditorContent
                    sidebarProps={sidebarProps}
                    local={simpleEditorLocal}
                  />
                )
              : (
                  <ProEditorContent
                    sidebarProps={sidebarProps}
                    local={proEditorLocal}
                  />
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
                                  {RESOLUTION_OPTIONS.map(option => (
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
                                        closeSimpleResolutionSelector();
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
                          step={64}
                          value={widthInput}
                          onChange={e => handleSimpleWidthChange(e.target.value)}
                          onBlur={handleCommitSimpleDimensions}
                        />
                        <span className="text-center text-xs font-medium text-base-content/55">×</span>
                        <input
                          className={simpleResolutionValueInputClassName}
                          type="number"
                          min={1}
                          step={64}
                          value={heightInput}
                          onChange={e => handleSimpleHeightChange(e.target.value)}
                          onBlur={handleCommitSimpleDimensions}
                        />
                      </div>
                    </div>

                    <div className="text-[11px] leading-5 text-base-content/55">
                      自动按 64 舍入；总面积超过 1024×1024 时将禁用生成。
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
                                  {RESOLUTION_OPTIONS.map(option => (
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
                                        closeProResolutionSelector();
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
                          step={64}
                          value={widthInput}
                          onChange={e => handleProWidthChange(e.target.value)}
                          onBlur={handleCommitProDimensions}
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
                          step={64}
                          value={heightInput}
                          onChange={e => handleProHeightChange(e.target.value)}
                          onBlur={handleCommitProDimensions}
                        />
                      </div>
                    </div>

                    <div className="text-[11px] leading-5 text-base-content/55">
                      自动按 64 舍入；总面积超过 1024×1024 时将禁用生成。
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="grid h-11 w-full grid-cols-9 overflow-hidden border border-base-300 bg-base-100 shadow-none">
                        <div className="flex h-11 items-center justify-center border-r border-base-300 text-base-content/90" aria-hidden="true">
                          <ImagesSquareIcon className="size-4.5" weight="regular" />
                        </div>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((count) => {
                          const isActive = imageCount === count;
                          const isDisabled = count !== 1;
                          return (
                            <button
                              key={count}
                              type="button"
                              className={`flex h-11 w-11 items-center justify-center border-r border-base-300 text-[14px] font-semibold leading-none transition last:border-r-0 ${
                                isActive
                                  ? "bg-primary/10 text-primary"
                                  : "bg-transparent text-base-content/35"
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
            <div className="shrink-0 bg-base-100 p-4 backdrop-blur">
              <button
                type="button"
                className={`btn h-12 w-full justify-between border px-4 disabled:border-base-300 disabled:bg-base-200 disabled:text-base-content/35 ${
                  uiMode === "simple"
                    ? simplePrimaryActionToneClassName
                    : "btn-primary"
                }`}
                disabled={uiMode === "simple" ? !canTriggerSimplePrimaryAction : !canTriggerProGenerate}
                title={uiMode === "pro" && freeGenerationViolation ? freeGenerationViolation : undefined}
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
});
