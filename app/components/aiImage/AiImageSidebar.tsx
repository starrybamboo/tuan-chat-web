import type { AiImagePageController } from "@/components/aiImage/useAiImagePageController";
import { ArrowCounterClockwise, CheckCircleIcon, CircleNotch, DiceFiveIcon, FileArrowUpIcon, GearSixIcon, ImageSquareIcon, PlusIcon, SparkleIcon, XCircleIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CUSTOM_RESOLUTION_ID,
  DEFAULT_PRO_IMAGE_SETTINGS,
  NOVELAI_DIMENSION_MIN,
  NOVELAI_DIMENSION_STEP,
  NOVELAI_FREE_MAX_DIMENSION,
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
  clampToMultipleOf64,
  formatSliderValue,
  insertNovelAiRandomTags,
  modelLabel,
  resolveNovelAiRandomTagTarget,
} from "@/components/aiImage/helpers";
import { HighlightEmphasisTextarea } from "@/components/aiImage/HighlightEmphasisTextarea";
import { AiImageContextLimitMeter } from "@/components/aiImage/AiImageContextLimitMeter";
import { NOVELAI_V45_CONTEXT_LIMIT, useNovelAiV45TokenSnapshot } from "@/components/aiImage/novelaiV45TokenMeter";
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
    activeResolutionPreset,
    canConvertSimpleText,
    canGenerate,
    canGenerateFromSimpleTags,
    canTriggerProGenerate,
    cfgRescale,
    charPromptTabs,
    characterPromptDescription,
    dynamicThresholding,
    hasSimpleTagsDraft,
    isBusy,
    handleAddV4Char,
    handleClearSeed,
    handleClearCurrentDisplayedImage,
    handleClearSimpleDraft,
    handleCropToClosestValidSize,
    handleOpenSourceImagePicker,
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
    hasCurrentDisplayedImage,
    height,
    imageCount,
    imageCountLimit,
    isDirectorToolsOpen,
    isNAI3,
    isNAI4,
    mode,
    model,
    negativePrompt,
    noise,
    noiseSchedule,
    noiseScheduleOptions,
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
    steps,
    strength,
    toggleProFeatureSection,
    ucPreset,
    uiMode,
    v4Chars,
    v4UseCoords,
    v4UseOrder,
    width,
  } = sidebarProps;

  const sideCardClassName = "card border-x-0 border-b border-t-0 border-[#D6DCE3] bg-[#F3F5F7] shadow-none dark:border-[#2A3138] dark:bg-[#161A1F]";
  const editorPanelClassName = "rounded-2xl border border-[#D6DCE3] bg-[#F3F5F7] p-3 shadow-none dark:border-[#2A3138] dark:bg-[#161A1F]";
  const segmentedControlClassName = "join rounded-xl bg-transparent p-0";
  const segmentedButtonBaseClassName = "btn btn-xs join-item border-0";
  const featureUploadActionClassName = "inline-flex size-11 items-center justify-center rounded-md border border-[#2A3138] bg-[#1F2340] text-base-content/78 transition hover:border-primary/40 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/20";
  const featurePrimaryActionClassName = "inline-flex h-11 items-center gap-2 rounded-md border border-[#2A3138] bg-[#161A1F] px-4 text-[15px] font-semibold text-base-content transition hover:border-primary/40 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/20";
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
  const [isModeSelectorOpen, setIsModeSelectorOpen] = useState(false);
  const [isModeSelectorMounted, setIsModeSelectorMounted] = useState(false);
  const [isProPromptSettingsOpen, setIsProPromptSettingsOpen] = useState(false);
  const [highlightEmphasisEnabled, setHighlightEmphasisEnabled] = useState(true);
  const [proPromptSettingsPosition, setProPromptSettingsPosition] = useState({ top: 96, left: 96 });
  const [isSimpleResolutionSelectorOpen, setIsSimpleResolutionSelectorOpen] = useState(false);
  const modeSelectorContainerRef = useRef<HTMLDivElement | null>(null);
  const sidebarSurfaceRef = useRef<HTMLDivElement | null>(null);
  const proPromptSettingsRef = useRef<HTMLDivElement | null>(null);
  const proPromptSettingsButtonRef = useRef<HTMLButtonElement | null>(null);
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
  const activeModeOption = MODE_OPTIONS.find(option => option.value === uiMode) ?? MODE_OPTIONS[0];
  const isSimplePreviewingConverted = Boolean(simpleConverted);
  const isSimpleTextEditor = simpleEditorMode === "text" && !isSimplePreviewingConverted;
  const isSimpleTagsEditor = simpleEditorMode === "tags";
  const simpleResolutionOptions = [...RESOLUTION_PRESETS, { id: CUSTOM_RESOLUTION_ID, label: "自定义" }] as const;
  const activeSimpleResolutionOption = simpleResolutionOptions.find(option => option.id === simpleResolutionSelection) ?? simpleResolutionOptions[simpleResolutionOptions.length - 1];
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

  function renderSimpleResolutionGlyph(optionId: string) {
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
                <div className={`flex flex-col ${isSimpleTagsEditor ? "gap-1" : "gap-3"}`}>
                  <div className={`grid transition-all duration-300 ease-out ${isSimpleTextEditor ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                    <div className="min-h-0 overflow-hidden">
                      <div className="flex w-full min-w-0 flex-col items-stretch gap-2">
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
                        {selectedStylePresets.length
                          ? (
                              <div className="flex flex-wrap gap-2">
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
                          className={`${promptTextareaClassName} mt-3 min-h-28 text-sm`}
                          value={simplePromptTab === "prompt" ? simpleConverted?.prompt ?? "" : simpleConverted?.negativePrompt ?? ""}
                          readOnly
                        />

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
                              className={promptTextareaClassName}
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
                          {selectedStylePresets.length
                            ? (
                                <div className="mt-2 flex flex-wrap gap-2">
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
                      </div>
                    </div>
                  </div>

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
                    <div className="-mx-3 -mb-3 mt-3 flex items-center justify-between border-t border-[#2A3138] bg-[#161A1F] px-4 py-3">
                      <div className="text-[15px] font-semibold text-base-content/78">
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

                  <div>
                    <div className="flex items-start justify-between gap-4 px-1 py-1">
                      <div className="min-w-0">
                        <div className="text-[15px] font-semibold leading-6 text-base-content/86">Character Prompts</div>
                        <div className="mt-1 text-[13px] leading-5 text-base-content/58">{characterPromptDescription}</div>
                      </div>
                      <button type="button" className={featurePrimaryActionClassName} onClick={handleAddV4Char} disabled={!isNAI4}>
                        <PlusIcon className="size-5" weight="bold" />
                        <span>Add Character</span>
                      </button>
                    </div>
                    {proFeatureSections.characterPrompts
                      ? (isNAI4
                          ? (
                              <div className="mt-4 space-y-3">
                            <div className="rounded-2xl bg-base-200/60 p-3">
                              <div className="flex flex-wrap items-center gap-4">
                                <label className="label cursor-pointer gap-2 py-0">
                                  <span className="label-text text-xs">Use Order</span>
                                  <input type="checkbox" className="toggle toggle-sm" checked={v4UseOrder} onChange={e => setV4UseOrder(e.target.checked)} />
                                </label>
                                <label className="label cursor-pointer gap-2 py-0">
                                  <span className="label-text text-xs">Use Coords</span>
                                  <input type="checkbox" className="toggle toggle-sm" checked={v4UseCoords} onChange={e => setV4UseCoords(e.target.checked)} />
                                </label>
                              </div>
                              <div className="mt-3 text-xs leading-5 text-base-content/60">
                                {v4UseCoords
                                  ? "开启坐标后，每个角色都会显示中心点位置输入。"
                                  : "关闭坐标时，角色位置交由模型决定。"}
                              </div>
                            </div>

                            {v4Chars.map((row, idx) => {
                              const disabledUp = idx === 0 || !v4UseOrder;
                              const disabledDown = idx === v4Chars.length - 1 || !v4UseOrder;
                              const activeTab = charPromptTabs[row.id] || "prompt";
                              const activeCharChannelSnapshot = activeTab === "prompt" ? tokenSnapshot.prompt : tokenSnapshot.negative;
                              const activeCharMeter = activeCharChannelSnapshot.characters[row.id];
                              return (
                                <div key={row.id} className="rounded-2xl border border-base-300 bg-base-100 p-3 shadow-sm">
                                  <div className="mb-3 flex items-center gap-2">
                                    <div className="rounded-full bg-base-200 px-2 py-1 text-xs font-medium text-base-content/70">{`Character ${idx + 1}`}</div>
                                    <div className="ml-auto join">
                                      <button type="button" className="btn btn-xs join-item" onClick={() => handleMoveV4Char(row.id, -1)} disabled={disabledUp}>上移</button>
                                      <button type="button" className="btn btn-xs join-item" onClick={() => handleMoveV4Char(row.id, 1)} disabled={disabledDown}>下移</button>
                                    </div>
                                    <button type="button" className="btn btn-xs btn-ghost" onClick={() => handleRemoveV4Char(row.id)}>删除</button>
                                  </div>
                                  <div className="space-y-3">
                                    <div className={segmentedControlClassName}>
                                      <button
                                        type="button"
                                        className={`${segmentedButtonBaseClassName} ${activeTab === "prompt" ? "bg-base-100 text-base-content shadow-sm" : "bg-transparent text-base-content/60 hover:bg-base-100 hover:text-base-content"}`}
                                        onClick={() => setCharPromptTabs(prev => ({ ...prev, [row.id]: "prompt" }))}
                                      >
                                        Prompt
                                      </button>
                                      <button
                                        type="button"
                                        className={`${segmentedButtonBaseClassName} ${activeTab === "negative" ? "bg-base-100 text-base-content shadow-sm" : "bg-transparent text-base-content/60 hover:bg-base-100 hover:text-base-content"}`}
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
                                      placeholder={activeTab === "prompt" ? "Prompt" : "Undesired Content"}
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
                                    {v4UseCoords
                                      ? (
                                          <div className="grid grid-cols-2 gap-2">
                                            <label className="form-control gap-1">
                                              <span className="label-text text-xs">Center X</span>
                                              <input className="input input-bordered input-sm !rounded-none" type="number" min="0" max="1" step="0.01" value={row.centerX} onChange={e => handleUpdateV4Char(row.id, { centerX: clamp01(Number(e.target.value), 0.5) })} />
                                            </label>
                                            <label className="form-control gap-1">
                                              <span className="label-text text-xs">Center Y</span>
                                              <input className="input input-bordered input-sm !rounded-none" type="number" min="0" max="1" step="0.01" value={row.centerY} onChange={e => handleUpdateV4Char(row.id, { centerY: clamp01(Number(e.target.value), 0.5) })} />
                                            </label>
                                          </div>
                                        )
                                      : <div className="text-xs text-base-content/60">Position: AI&apos;s Choice</div>}
                                  </div>
                                </div>
                              );
                            })}

                            {!v4Chars.length
                              ? (
                                  <div className="rounded-2xl border border-dashed border-base-300 bg-base-200/30 px-4 py-4 text-sm leading-6 text-base-content/60">
                                    还没有角色提示词。点击右上角的
                                    {" "}
                                    <span className="font-medium text-base-content">Add Character</span>
                                    {" "}
                                    为每个角色单独填写 Prompt / UC。
                                  </div>
                                )
                              : null}
                          </div>
                            )
                          : <div className="mt-4 text-sm opacity-60">当前模型不支持 Character Prompts。</div>)
                      : null}
                  </div>

                  <div className="rounded-md border border-[#2A3138] bg-[#161A1F] shadow-none">
                    <div className="flex items-center gap-3 px-4 py-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[15px] font-semibold text-base-content">Vibe Transfer</span>
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
                    <div className="flex items-center gap-3 px-4 py-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[15px] font-semibold text-base-content">Precise Reference</span>
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
                          {renderSimpleResolutionGlyph(activeSimpleResolutionOption.id)}
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
                                    {renderSimpleResolutionGlyph(option.id)}
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
                        min={NOVELAI_DIMENSION_MIN}
                        max={simpleResolutionSelection === CUSTOM_RESOLUTION_ID ? SIMPLE_MODE_CUSTOM_MAX_DIMENSION : NOVELAI_FREE_MAX_DIMENSION}
                        step={NOVELAI_DIMENSION_STEP}
                        value={width}
                        onChange={e => handleSimpleWidthChange(Number(e.target.value))}
                      />
                      <span className="text-center text-xs font-medium text-base-content/55">×</span>
                      <input
                        className={simpleResolutionValueInputClassName}
                        type="number"
                        min={NOVELAI_DIMENSION_MIN}
                        max={simpleResolutionSelection === CUSTOM_RESOLUTION_ID ? SIMPLE_MODE_CUSTOM_MAX_DIMENSION : NOVELAI_FREE_MAX_DIMENSION}
                        step={NOVELAI_DIMENSION_STEP}
                        value={height}
                        onChange={e => handleSimpleHeightChange(Number(e.target.value))}
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
                  <div className="flex flex-col gap-2">
                    <div className="text-xs text-base-content/70">分辨率 (Resolution)</div>
                    <div className="grid grid-cols-3 gap-2">
                      {RESOLUTION_PRESETS.map(preset => (
                        <button
                          key={preset.id}
                          type="button"
                          className={`btn btn-sm h-auto py-2 flex flex-col items-center justify-center gap-1.5 ${activeResolutionPreset?.id === preset.id ? "btn-primary" : "btn-outline"}`}
                          onClick={() => {
                            setWidth(preset.width);
                            setHeight(preset.height);
                          }}
                        >
                          <div className={`border-2 border-current rounded-sm opacity-80 ${preset.id === "portrait" ? "w-4 h-6" : preset.id === "landscape" ? "w-6 h-4" : "w-5 h-5"}`}></div>
                          <span className="font-normal text-xs">{preset.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2">
                    <label className="form-control">
                      <span className="label-text text-xs">宽 (Width)</span>
                      <input
                        className="input input-bordered input-sm !rounded-none"
                        type="number"
                        min={NOVELAI_DIMENSION_MIN}
                        max={NOVELAI_FREE_MAX_DIMENSION}
                        step={NOVELAI_DIMENSION_STEP}
                        value={width}
                        onChange={e => setWidth(Math.min(NOVELAI_FREE_MAX_DIMENSION, clampToMultipleOf64(Number(e.target.value), DEFAULT_PRO_IMAGE_SETTINGS.width)))}
                      />
                    </label>
                    <button
                      type="button"
                      className="btn btn-square btn-sm btn-outline mb-0.5"
                      title="交换宽高"
                      aria-label="交换宽高"
                      onClick={handleSwapImageDimensions}
                    >
                      ×
                    </button>
                    <label className="form-control">
                      <span className="label-text text-xs">高 (Height)</span>
                      <input
                        className="input input-bordered input-sm !rounded-none"
                        type="number"
                        min={NOVELAI_DIMENSION_MIN}
                        max={NOVELAI_FREE_MAX_DIMENSION}
                        step={NOVELAI_DIMENSION_STEP}
                        value={height}
                        onChange={e => setHeight(Math.min(NOVELAI_FREE_MAX_DIMENSION, clampToMultipleOf64(Number(e.target.value), DEFAULT_PRO_IMAGE_SETTINGS.height)))}
                      />
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="btn btn-sm btn-outline" onClick={() => void handleCropToClosestValidSize()}>
                      Crop to Closest Valid Size
                    </button>
                    <button type="button" className="btn btn-sm btn-ghost" onClick={handleResetCurrentImageSettings}>
                      Reset Current Settings
                    </button>
                  </div>

                  <div className="rounded-box border border-base-300 bg-base-200/60 px-3 py-2 text-xs leading-5 text-base-content/65">
                    {`当前已切到免费模式：尺寸按 64px 步进对齐，宽高都不超过 ${NOVELAI_FREE_MAX_DIMENSION}，`}
                    <code>Number of Images</code>
                    固定为 1。
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs text-base-content/70">
                      <span>Number of Images</span>
                      <span>免费模式固定为 1</span>
                    </div>
                    <div className="join w-full">
                      {Array.from({ length: imageCountLimit }, (_, index) => index + 1).map(count => (
                        <button
                          key={count}
                          type="button"
                          className={`btn btn-sm join-item flex-1 ${imageCount === count ? "btn-primary" : "btn-outline"}`}
                          onClick={() => setImageCount(count)}
                        >
                          {count}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-box border border-base-300 bg-base-200 p-4">
                    <div className="space-y-4">
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-sm font-semibold">{`步数 (Steps): ${steps}`}</span>
                        </div>
                        <input
                          className="range range-xs w-full"
                          type="range"
                          min="1"
                          max={String(NOVELAI_FREE_MAX_STEPS)}
                          step="1"
                          value={steps}
                          onChange={e => setSteps(clampIntRange(Number(e.target.value), 1, NOVELAI_FREE_MAX_STEPS, NOVELAI_FREE_MAX_STEPS))}
                        />
                      </div>
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-sm font-semibold">{`提示词相关性 (Prompt Guidance): ${scale}`}</span>
                          <span className="badge badge-outline badge-sm">Variety+</span>
                        </div>
                        <input
                          className="range range-xs w-full"
                          type="range"
                          min="0"
                          max="20"
                          step="0.1"
                          value={scale}
                          onChange={e => setScale(clampRange(Number(e.target.value), 0, 20, 5))}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between text-xs text-base-content/70">
                            <span>种子 (Seed)</span>
                            <span>{seedIsRandom ? "随机" : "固定"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              className={`flex-1 w-full ${subtleInputClassName}`}
                              type="number"
                              value={seedIsRandom ? "" : seed}
                              placeholder="留空即随机"
                              onChange={(e) => {
                                const value = e.target.value.trim();
                                setSeed(value ? Number(value) : -1);
                              }}
                            />
                            <button
                              type="button"
                              className="btn btn-sm btn-outline border-base-content/20 shrink-0"
                              onClick={handleClearSeed}
                              disabled={seedIsRandom}
                              title="转为随机种子"
                            >
                              随机
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <div className="text-xs text-base-content/70">采样器 (Sampler)</div>
                          <select className={`w-full ${subtleSelectClassName}`} value={sampler} onChange={e => setSampler(e.target.value)}>
                            {samplerOptions.map(s => <option key={s} value={s}>{SAMPLER_LABELS[s] || s}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  <details className="collapse collapse-arrow border border-base-300 bg-base-100" open>
                    <summary className="collapse-title pr-12 text-sm font-medium">
                      Advanced Settings
                    </summary>
                    <div className="collapse-content space-y-3">
                      {noiseScheduleOptions.length
                        ? (
                            <div className="grid grid-cols-2 gap-2">
                              <label className="form-control">
                                <span className="label-text text-xs">Noise Schedule</span>
                                <select className={subtleSelectClassName} value={noiseSchedule} onChange={e => setNoiseSchedule(e.target.value)}>
                                  {noiseScheduleOptions.map(s => <option key={s} value={s}>{SCHEDULE_LABELS[s] || s}</option>)}
                                </select>
                              </label>
                              {isNAI4
                                ? (
                                    <label className="form-control">
                                      <span className="label-text text-xs">CFG Rescale</span>
                                      <input className={subtleInputClassName} type="number" value={cfgRescale} step="0.01" onChange={e => setCfgRescale(clampRange(Number(e.target.value), 0, 1, 0))} />
                                    </label>
                                  )
                                : <div />}
                            </div>
                          )
                        : null}

                      {mode === "img2img"
                        ? (
                            <div className="grid grid-cols-2 gap-2">
                              <label className="form-control">
                                <span className="label-text text-xs">Strength</span>
                                <input className={subtleInputClassName} type="number" value={strength} step="0.01" min="0" max="1" onChange={e => setStrength(clampRange(Number(e.target.value), 0, 1, 0.7))} />
                              </label>
                              <label className="form-control">
                                <span className="label-text text-xs">Noise</span>
                                <input className={subtleInputClassName} type="number" value={noise} step="0.01" min="0" max="1" onChange={e => setNoise(clampRange(Number(e.target.value), 0, 1, 0.2))} />
                              </label>
                            </div>
                          )
                        : null}

                      {isNAI4
                        ? (
                            <label className="label cursor-pointer justify-start gap-3">
                              <input type="checkbox" className="toggle toggle-sm" checked={dynamicThresholding} onChange={e => setDynamicThresholding(e.target.checked)} />
                              <span className="label-text">Dynamic Thresholding</span>
                            </label>
                          )
                        : null}

                      {isNAI3
                        ? (
                            <>
                              <label className="label cursor-pointer justify-start gap-3">
                                <input type="checkbox" className="toggle toggle-sm" checked={smea} onChange={e => setSmea(e.target.checked)} />
                                <span className="label-text">SMEA</span>
                              </label>
                              <label className="label cursor-pointer justify-start gap-3">
                                <input type="checkbox" className="toggle toggle-sm" checked={smeaDyn} onChange={e => setSmeaDyn(e.target.checked)} />
                                <span className="label-text">SMEA Dyn</span>
                              </label>
                            </>
                          )
                        : null}
                    </div>
                  </details>
                </>
              )}
        </div>
      </div>

      </div>

      {uiMode === "simple" || uiMode === "pro"
        ? (
            <div className="shrink-0 border-t border-[#D6DCE3] bg-[#F3F5F7] p-4 backdrop-blur dark:border-[#2A3138] dark:bg-[#161A1F]">
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
