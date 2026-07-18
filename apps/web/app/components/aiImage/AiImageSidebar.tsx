import type { KeyboardEvent as ReactKeyboardEvent } from "react";

import { CircleNotch, SparkleIcon } from "@phosphor-icons/react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ProEditorContentLocalProps } from "@/components/aiImage/sidebar/ProEditorContent";
import type { SimpleEditorContentLocalProps } from "@/components/aiImage/sidebar/SimpleEditorContent";
import type { AiImagePageController } from "@/components/aiImage/useAiImagePageController";

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
import { renderProInfillSectionContent, renderSimpleInfillSectionContent } from "@/components/aiImage/sidebar/inpaintSections";
import { renderProBottomSettingsDrawerContent } from "@/components/aiImage/sidebar/ProBottomSettingsDrawer";
import { ProEditorContent } from "@/components/aiImage/sidebar/ProEditorContent";
import { renderResolutionGlyph } from "@/components/aiImage/sidebar/renderResolutionGlyph";
import { SimpleEditorContent } from "@/components/aiImage/sidebar/SimpleEditorContent";
import { useDismissibleLayer } from "@/components/aiImage/sidebar/useDismissibleLayer";
import { useFloatingPanelPosition } from "@/components/aiImage/sidebar/useFloatingPanelPosition";
import { Button, buttonClassName } from "@/components/common/Button";
import { controlGroupClassName } from "@/components/common/ControlGroup";
import { surfaceClassName } from "@/components/common/DesignLanguage";
import { formControlClassName, TextInput } from "@/components/common/FormField";
import { Badge } from "@/components/common/StatusPrimitives";
import { ChevronDown } from "@/icons";

type AiImageSidebarProps = {
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

const RESOLUTION_OPTIONS = [...RESOLUTION_PRESETS, { id: CUSTOM_RESOLUTION_ID, label: "自定义" }] as const;
type ModeOptionValue = (typeof MODE_OPTIONS)[number]["value"];

export const AiImageSidebar = memo(({ sidebarProps }: AiImageSidebarProps) => {
  const {
    canConvertSimpleText,
    canGenerateFromSimpleTags,
    canTriggerProGenerate,
    cfgRescale,
    cfgDelay,
    charPromptTabs,
    characterPromptDescription,
    hasSimpleTagsDraft,
    isBusy,
    handleClearSourceImage,
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
    handleEditInpaintMask,
    handleReturnFromInfillSettings,
    infillAppendPrompt,
    infillMaskDataUrl,
    isDirectorToolsOpen,
    mode,
    negativePrompt,
    noiseSchedule,
    noiseScheduleOptions,
    proFeatureSections,
    proGenerateLabel,
    proPromptTab,
    proResolutionSelection,
    prompt,
    qualityToggle,
    dynamicThresholding,
    runGenerate,
    sampler,
    samplerOptions,
    scale,
    seed,
    seedIsRandom,
    setCfgRescale,
    setCfgDelay,
    setDynamicThresholding,
    setInfillAppendPrompt,
    setNegativePrompt,
    setNoiseSchedule,
    setPrompt,
    setSampler,
    setScale,
    setSeed,
    setSimpleNegativePrompt,
    setSimplePrompt,
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

  const sideCardClassName = surfaceClassName({ level: "content", className: "border-x-0 border-t-0 border-base-300 bg-transparent shadow-none first:border-b-0" });
  const editorPanelClassName = "min-w-0";
  const segmentedControlClassName = controlGroupClassName({ className: "bg-transparent p-0" });
  const segmentedButtonBaseClassName = buttonClassName({
    size: "xs",
    className: "border-0",
  });
  const characterAddTriggerClassName = "inline-flex h-8 items-center gap-1 rounded-md border border-base-300 bg-base-100 px-2.5 text-xs font-semibold text-base-content transition hover:border-info/40 hover:bg-base-200 hover:text-info focus:outline-none focus:ring-2 focus:ring-info/20";
  const characterAddMenuPanelClassName = "absolute right-0 top-0 z-30 w-36 overflow-hidden rounded-md border border-base-300 bg-base-100 shadow-2xl";
  const characterAddMenuItemClassName = "flex h-8 w-full items-center gap-1.5 px-3 text-left text-xs font-medium leading-none text-base-content/90 transition hover:bg-base-200 focus:outline-none focus:ring-2 focus:ring-info/30";
  const characterCardClassName = "relative overflow-hidden rounded-2xl border border-base-300 bg-base-100 p-3 shadow-none";
  const characterCardHeaderActionClassName = "inline-flex size-7 items-center justify-center rounded-md text-base-content/60 transition hover:bg-base-200 hover:text-base-content focus:outline-none focus:ring-2 focus:ring-info/30 disabled:cursor-not-allowed disabled:opacity-35";
  const characterCardTitleIconClassName = "size-4 shrink-0 text-base-content/80";
  const characterPositionsSectionClassName = "flex items-center justify-between gap-3 bg-base-100 py-3 pr-4";
  const characterPositionsToggleBaseClassName = "inline-flex h-9 min-w-28 items-center justify-center rounded-md border px-3 text-sm font-semibold transition whitespace-nowrap focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-info/30";
  const promptTextareaClassName = formControlClassName({
    surface: "muted",
    className: "min-h-36 resize-none leading-7 hover:border-info active:border-info focus:bg-info/[0.03] dark:hover:border-info",
  });
  const simplePromptTextareaClassName = promptTextareaClassName;
  const subtleSelectClassName = formControlClassName({ density: "compact", surface: "muted" });
  const simpleResolutionValueInputClassName = "min-w-0 appearance-none bg-transparent text-center text-xs font-semibold leading-none tabular-nums text-base-content focus:outline-none focus:ring-2 focus:ring-info/30 [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";
  const highlightPromptSurfaceClassName = "relative min-h-36 w-full overflow-hidden border border-base-300 bg-base-200 shadow-none transition-colors hover:border-info active:border-info focus-within:border-info focus-within:bg-info/[0.03]   dark:hover:border-info";
  const highlightPromptContentClassName = "min-h-36 px-3 py-2 text-sm leading-6";
  const highlightCharSurfaceClassName = "relative min-h-28 w-full overflow-hidden border border-base-300 bg-base-200 shadow-none transition-colors hover:border-info active:border-info focus-within:border-info focus-within:bg-info/[0.03]   dark:hover:border-info";
  const highlightCharContentClassName = "min-h-28 px-3 py-2 text-sm leading-6";
  const infillAppendInputClassName = "block w-full resize-none overflow-hidden rounded-md border border-base-300 bg-base-200 px-3 py-2 text-sm leading-6 text-base-content transition focus:border-info focus:outline-none focus:ring-2 focus:ring-info/20  ";
  const floatingInputActionBaseClassName = buttonClassName({
    variant: "ghost",
    size: "xs",
    className: "border-0 bg-transparent px-2 text-base-content/50 shadow-none transition-colors backdrop-blur-0 hover:bg-black/28 hover:text-white focus-visible:text-white disabled:cursor-not-allowed disabled:opacity-40 dark:text-base-content/50 dark:hover:bg-white/12",
  });
  const floatingInputActionClassName = `${floatingInputActionBaseClassName} absolute right-3 top-3 z-10`;
  const baseImageToggleButtonClassName = "inline-flex size-11 items-center justify-center bg-transparent text-base-content/60 transition hover:text-base-content focus:outline-none focus:ring-2 focus:ring-info/30 focus-visible:text-base-content dark:text-white/58 dark:hover:text-white dark:focus-visible:text-white";
  const baseImageRangeClassName = "mt-2 w-full cursor-pointer appearance-none bg-transparent focus:outline-none [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-white/10 [&::-webkit-slider-thumb]:mt-[-4px] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:shadow-black/30 [&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-white/10 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-sm [&::-moz-range-thumb]:shadow-black/30 focus:ring-2 focus:ring-info/30";
  const simpleInfillAttachmentClassName = "mt-[2px] overflow-hidden border-x border-b border-base-300 bg-base-100 shadow-none";
  const [isModeSelectorOpen, setIsModeSelectorOpen] = useState<boolean>(false);
  const [isProPromptSettingsOpen, setIsProPromptSettingsOpen] = useState<boolean>(false);
  const [isBaseImageToolsOpen, setIsBaseImageToolsOpen] = useState<boolean>(() => mode === "infill");
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
    ? "border-info bg-info text-info-content hover:bg-info/90"
    : hasGeneratedSimpleTags
      ? "border-warning bg-warning text-warning-content hover:bg-warning/90"
      : "border-info bg-info text-info-content hover:bg-info/90";
  const simplePrimaryActionBadgeClassName = hasReadySimpleTags
    ? "border-white/20 bg-white/10 text-white"
    : hasGeneratedSimpleTags
      ? "border-white/20 bg-white/10 text-white"
      : "border-white/20 bg-white/10 text-white";
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
  const activeCharacterPositionPickerCharacterId = characterPositionPickerState?.characterId;
  const activeCharacterPositionPickerCode = characterPositionPickerState?.code;
  const characterPositionAssignments = useMemo(() => {
    const assignments = new Map<string, { characterId: string; index: number }>();
    v4Chars.forEach((row, idx) => {
      const fallbackCode = getV4CharGridCellByCenter(row.centerX, row.centerY).code;
      const code = activeCharacterPositionPickerCharacterId === row.id
        ? (activeCharacterPositionPickerCode ?? fallbackCode)
        : fallbackCode;
      assignments.set(code, { characterId: row.id, index: idx });
    });
    return assignments;
  }, [activeCharacterPositionPickerCharacterId, activeCharacterPositionPickerCode, v4Chars]);
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
    if (mode === "infill")
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
      infillAppendInputClassName,
      onEditInpaintMask: handleEditInpaintMask,
      onClearSourceImage: handleClearSourceImage,
      onReturnFromInfillSettings: handleReturnFromInfillSettings,
      onToggleBaseImageTools: () => setIsBaseImageToolsOpen(prev => !prev),
      infillAppendPrompt,
      onInfillAppendPromptChange: setInfillAppendPrompt,
      setStrength,
    });
  }, [
    baseImageControlGroupClassName,
    baseImageHeaderClassName,
    infillAppendInputClassName,
    infillAppendPrompt,
    baseImageRangeClassName,
    baseImageToggleButtonClassName,
    handleClearSourceImage,
    handleEditInpaintMask,
    handleReturnFromInfillSettings,
    infillMaskDataUrl,
    isBaseImageToolsOpen,
    isBusy,
    setInfillAppendPrompt,
    setStrength,
    sourceImageDataUrl,
    strength,
  ]);

  const renderSimpleInfillSection = useCallback(() => {
    if (mode !== "infill")
      return null;
    return renderSimpleInfillSectionContent({
      sourceImageDataUrl,
      infillMaskDataUrl,
      isBusy,
      isBaseImageToolsOpen,
      strength,
      simpleInfillAttachmentClassName,
      baseImageHeaderClassName,
      baseImageControlGroupClassName,
      baseImageToggleButtonClassName,
      baseImageRangeClassName,
      infillAppendInputClassName,
      onEditInpaintMask: handleEditInpaintMask,
      onClearSourceImage: handleClearSourceImage,
      onReturnFromInfillSettings: handleReturnFromInfillSettings,
      onToggleBaseImageTools: () => setIsBaseImageToolsOpen(prev => !prev),
      infillAppendPrompt,
      onInfillAppendPromptChange: setInfillAppendPrompt,
      setStrength,
    });
  }, [
    baseImageControlGroupClassName,
    baseImageHeaderClassName,
    infillAppendInputClassName,
    infillAppendPrompt,
    baseImageRangeClassName,
    baseImageToggleButtonClassName,
    handleClearSourceImage,
    handleEditInpaintMask,
    handleReturnFromInfillSettings,
    infillMaskDataUrl,
    isBaseImageToolsOpen,
    isBusy,
    mode,
    setInfillAppendPrompt,
    setStrength,
    simpleInfillAttachmentClassName,
    sourceImageDataUrl,
    strength,
  ]);

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
      noiseScheduleOptions,
      noiseSchedule,
      cfgRescale,
      cfgDelay,
      dynamicThresholding,
      onResetCurrentImageSettings: handleResetCurrentImageSettings,
      onOpenDrawer: () => setIsProBottomSettingsOpen(true),
      onCloseDrawer: () => setIsProBottomSettingsOpen(false),
      setSteps,
      setCfgDelay,
      setDynamicThresholding,
      setScale,
      setSeed,
      setSampler,
      setCfgRescale,
      setNoiseSchedule,
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
    simplePromptTextareaClassName,
    highlightPromptSurfaceClassName,
    highlightPromptContentClassName,
    highlightEmphasisEnabled,
    renderSimpleInfillSection,
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
    renderSimpleInfillSection,
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
    renderProInfillSection,
    baseImageHeaderClassName,
    baseImageControlGroupClassName,
    baseImageToggleButtonClassName,
    baseImageRangeClassName,
    strength,
    setStrength,
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
    baseImageControlGroupClassName,
    baseImageHeaderClassName,
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
    setStrength,
    showCharacterPositionsGlobalSection,
    strength,
    subtleSelectClassName,
    tokenSnapshot,
  ]);

  return (
    <div
      ref={sidebarSurfaceRef}
      className={`
        ${isDirectorToolsOpen ? "hidden" : "flex"}
        relative h-full min-h-0 w-full min-w-0 flex-col gap-0 overflow-hidden
        rounded-md border border-base-300 bg-base-100 p-0 shadow-sm
      `}
    >
      <div className="ai-image-fade-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className={sideCardClassName}>
          <div className="px-4 pb-2 pt-4">
            <div className="flex items-stretch">
              <div className="relative min-w-0 flex-1" ref={modeSelectorContainerRef}>
                <button
                  type="button"
                  className={`
                    flex w-full items-center justify-between rounded-md border
                    px-3.5 py-3 text-left transition
                    focus:border-info focus:outline-none focus:ring-2
                    focus:ring-info/20
                    ${
                    isModeSelectorOpen
                      ? `
                        border-info/55 bg-info/10 shadow-sm
                      `
                      : `
                        border-base-300 bg-base-200/70
                        hover:border-info/40 hover:bg-info/5
                                                                       `
                  }
                  `}
                  aria-expanded={isModeSelectorOpen}
                  aria-controls="ai-image-mode-selector-panel"
                  onClick={() => setIsModeSelectorOpen(prev => !prev)}
                >
                  <span className="font-semibold leading-none text-base-content">{activeModeOption.label}</span>
                  <ChevronDown className={`
                    ml-3 size-4 shrink-0 text-base-content/60
                    transition-transform
                    ${isModeSelectorOpen ? `rotate-180` : ""}
                  `} />
                </button>

                {isModeSelectorOpen
                  ? (
                      <div
                        id="ai-image-mode-selector-panel"
                        className="
                          ai-image-fade-scrollbar absolute left-0 right-0
                          top-[calc(100%+0.375rem)] z-40
                          overflow-y-auto rounded-md border border-base-300
                          bg-base-100 p-1 shadow-lg
                        "
                      >
                        <div className="flex flex-col gap-0.5">
                          {MODE_OPTIONS.map(option => (
                            <button
                              key={option.value}
                              type="button"
                              className={`
                                w-full rounded-md px-3 py-2.5 text-left transition
                                focus:outline-none focus:ring-2
                                focus:ring-info/20
                                ${
                                uiMode === option.value
                                  ? `
                                    bg-info/10 text-info
                                  `
                                  : `
                                    text-base-content/80 hover:bg-base-200
                                  `
                              }
                              `}
                              onClick={() => handleSelectMode(option.value)}
                            >
                              <div className="text-sm font-medium leading-none">{option.label}</div>
                              <div className="mt-1 text-xs text-base-content/55">
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
          <div className={`
            px-4 pb-4 pt-2
            ${uiMode === "simple" && isSimpleTagsEditor ? `gap-2` : `gap-3`}
          `}>
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
          <div className="flex flex-col gap-3 p-4">
            <div className="flex items-center gap-2">
              <div className="font-medium">绘图设置</div>
            </div>
            {uiMode === "simple"
              ? (
                  <>
                    <div className="
                      grid w-full max-w-full grid-cols-[minmax(0,1fr)_135px]
                      items-start gap-3
                    ">
                      <div className="relative" ref={simpleResolutionSelectorRef}>
                        <button
                          type="button"
                          className={`
                            flex h-11 w-full items-center justify-between
                            border border-base-300 bg-base-200
                            px-3 py-2 text-left transition
                            focus:border-info focus:outline-none focus:ring-2
                            focus:ring-info/20
                            hover:border-info/40 hover:bg-base-300
                                                                                     ${isSimpleResolutionSelectorOpen ? `
                              border-info bg-info/5 shadow-sm
                              dark:bg-info/10
                            ` : ""}
                          `}
                          aria-expanded={isSimpleResolutionSelectorOpen}
                          onClick={() => setIsSimpleResolutionSelectorOpen(prev => !prev)}
                        >
                          <div className="
                            flex min-w-0 items-center gap-2.5
                            text-base-content/80
                          ">
                            {renderResolutionGlyph(activeSimpleResolutionOption.id)}
                            <span className="
                              truncate text-xs font-medium tracking-tight
                            ">{activeSimpleResolutionOption.label}</span>
                          </div>
                          <ChevronDown className={`
                            size-4 shrink-0 text-base-content/60
                            transition-transform
                            ${isSimpleResolutionSelectorOpen ? `rotate-180` : ""}
                          `} />
                        </button>

                        {isSimpleResolutionSelectorOpen
                          ? (
                              <div className="
                                absolute left-0 right-0 top-[calc(100%+0.5rem)]
                                z-20 overflow-hidden border
                                border-base-300 bg-base-200 p-2 shadow-2xl
                                                               ">
                                <div className="flex flex-col gap-1">
                                  {RESOLUTION_OPTIONS.map(option => (
                                    <button
                                      key={option.id}
                                      type="button"
                                      className={`
                                        flex items-center gap-3 rounded-lg px-4
                                        py-3 text-left transition
                                        focus:outline-none focus:ring-2
                                        focus:ring-info/20
                                        ${
                                        simpleResolutionSelection === option.id
                                          ? "bg-info/10 text-base-content"
                                          : `
                                            text-base-content/78
                                            hover:bg-base-100
                                                                                      `
                                      }
                                      `}
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

                      <div className="
                        grid h-11 w-[135px]
                        grid-cols-[minmax(0,1fr)_10px_minmax(0,1fr)]
                        items-center gap-1 border border-base-300
                        bg-base-200 px-3 py-2 shadow-sm
                                               ">
                        <TextInput
                          aria-label="图片宽度"
                          appearance="bare"
                          density="compact"
                          className={`!min-h-0 !p-0 ${simpleResolutionValueInputClassName}`}
                          type="number"
                          min={1}
                          step={64}
                          value={widthInput}
                          onChange={e => handleSimpleWidthChange(e.target.value)}
                          onBlur={handleCommitSimpleDimensions}
                        />
                        <span className="
                          text-center text-xs font-medium text-base-content/55
                        ">×</span>
                        <TextInput
                          aria-label="图片高度"
                          appearance="bare"
                          density="compact"
                          className={`!min-h-0 !p-0 ${simpleResolutionValueInputClassName}`}
                          type="number"
                          min={1}
                          step={64}
                          value={heightInput}
                          onChange={e => handleSimpleHeightChange(e.target.value)}
                          onBlur={handleCommitSimpleDimensions}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="
                        flex items-center text-xs text-base-content/70
                      ">
                        <span>种子 (Seed)</span>
                      </div>
                      <TextInput
                        aria-label="种子"
                        density="compact"
                        surface="muted"
                        className="
                          h-8 appearance-none
                          [&::-webkit-inner-spin-button]:appearance-none
                          [&::-webkit-outer-spin-button]:appearance-none
                        "
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
                    <div className="
                      grid w-full max-w-full grid-cols-[minmax(0,1fr)_135px]
                      items-start gap-3
                    ">
                      <div className="relative" ref={proResolutionSelectorRef}>
                        <button
                          type="button"
                          className={`
                            flex h-11 w-full items-center justify-between
                            border border-base-300 bg-base-200
                            px-3 py-2 text-left transition
                            focus:border-info focus:outline-none focus:ring-2
                            focus:ring-info/20
                            hover:border-info/40 hover:bg-base-300
                                                                                     ${isProResolutionSelectorOpen ? `
                              border-info bg-info/5 shadow-sm
                              dark:bg-info/10
                            ` : ""}
                          `}
                          aria-expanded={isProResolutionSelectorOpen}
                          onClick={() => setIsProResolutionSelectorOpen(prev => !prev)}
                        >
                          <div className="
                            flex min-w-0 items-center gap-2.5
                            text-base-content/80
                          ">
                            {renderResolutionGlyph(activeProResolutionOption.id)}
                            <span className="
                              truncate text-xs font-medium tracking-tight
                            ">{activeProResolutionOption.label}</span>
                          </div>
                          <ChevronDown className={`
                            size-4 shrink-0 text-base-content/60
                            transition-transform
                            ${isProResolutionSelectorOpen ? `rotate-180` : ""}
                          `} />
                        </button>

                        {isProResolutionSelectorOpen
                          ? (
                              <div className="
                                absolute left-0 right-0 top-[calc(100%+0.5rem)]
                                z-20 overflow-hidden border
                                border-base-300 bg-base-200 p-2 shadow-2xl
                                                               ">
                                <div className="flex flex-col gap-1">
                                  {RESOLUTION_OPTIONS.map(option => (
                                    <button
                                      key={option.id}
                                      type="button"
                                      className={`
                                        flex items-center gap-3 rounded-lg px-4
                                        py-3 text-left transition
                                        focus:outline-none focus:ring-2
                                        focus:ring-info/20
                                        ${
                                        activeProResolutionOption.id === option.id
                                          ? "bg-info/10 text-base-content"
                                          : `
                                            text-base-content/78
                                            hover:bg-base-100
                                                                                      `
                                      }
                                      `}
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

                      <div className="
                        grid h-11 w-[135px]
                        grid-cols-[minmax(0,1fr)_10px_minmax(0,1fr)]
                        items-center gap-1 border border-base-300
                        bg-base-200 px-3 py-2 shadow-sm
                                               ">
                        <TextInput
                          aria-label="图片宽度"
                          appearance="bare"
                          density="compact"
                          className={`!min-h-0 !p-0 ${simpleResolutionValueInputClassName}`}
                          type="number"
                          min={1}
                          step={64}
                          value={widthInput}
                          onChange={e => handleProWidthChange(e.target.value)}
                          onBlur={handleCommitProDimensions}
                        />
                        <button
                          type="button"
                          className="
                            flex items-center justify-center text-center text-xs
                            font-medium text-base-content/55
                            focus:outline-none focus:ring-2 focus:ring-info/30
                          "
                          title="交换宽高"
                          aria-label="交换宽高"
                          onClick={handleSwapImageDimensions}
                        >
                          ×
                        </button>
                        <TextInput
                          aria-label="图片高度"
                          appearance="bare"
                          density="compact"
                          className={`!min-h-0 !p-0 ${simpleResolutionValueInputClassName}`}
                          type="number"
                          min={1}
                          step={64}
                          value={heightInput}
                          onChange={e => handleProHeightChange(e.target.value)}
                          onBlur={handleCommitProDimensions}
                        />
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
            <div className="shrink-0 border-t border-base-300 bg-base-100/95 p-4 backdrop-blur">
              <Button
                variant={uiMode === "simple" ? "ghost" : "primary"}
                className={`
                  h-12 w-full justify-between border px-4
                  disabled:border-base-300 disabled:bg-base-200
                  disabled:text-base-content/50
                  ${uiMode === "simple" ? simplePrimaryActionToneClassName : ""}
                `}
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
                            <Badge appearance="outline" className={`
                              px-2 py-1 font-semibold
                              ${simplePrimaryActionBadgeClassName}
                            `}>
                              1x
                            </Badge>
                          )
                        : (
                            simpleConverting
                              ? <CircleNotch className="size-4 animate-spin" weight="regular" />
                              : <SparkleIcon className="size-4" weight="fill" />
                          )
                    )
                  : (
                      <Badge appearance="outline" className="px-2 py-1 font-semibold text-current">
                        1x
                      </Badge>
                    )}
              </Button>
            </div>
          )
        : null}

    </div>

  );
});
