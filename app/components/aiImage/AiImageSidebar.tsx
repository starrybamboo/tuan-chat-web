import type { AiImagePageController } from "@/components/aiImage/useAiImagePageController";
import { ArrowCounterClockwise, CheckCircleIcon, CircleNotch, FileArrowUpIcon, GearSixIcon, ImageSquareIcon, SparkleIcon, XCircleIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
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
  modelLabel,
} from "@/components/aiImage/helpers";
import { HighlightEmphasisTextarea } from "@/components/aiImage/HighlightEmphasisTextarea";
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
    hasSimpleTagsDraft,
    handleAddV4Char,
    handleClearSeed,
    handleClearCurrentDisplayedImage,
    handleClearSourceImage,
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
    handleUpdateVibeReference,
    hasReferenceConflict,
    hasCurrentDisplayedImage,
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
    uiMode,
    v4Chars,
    v4UseCoords,
    v4UseOrder,
    vibeReferenceInputRef,
    vibeTransferDescription,
    vibeTransferReferences,
    width,
  } = sidebarProps;

  const sideCardClassName = "card border-x-0 border-b border-t-0 border-[#D6DCE3] bg-[#F3F5F7] shadow-none dark:border-[#2A3138] dark:bg-[#161A1F]";
  const editorPanelClassName = "rounded-2xl border border-[#D6DCE3] bg-[#F3F5F7] p-3 shadow-none dark:border-[#2A3138] dark:bg-[#161A1F]";
  const segmentedControlClassName = "join rounded-xl bg-transparent p-0";
  const segmentedButtonBaseClassName = "btn btn-xs join-item border-0";
  const promptTextareaClassName = "textarea textarea-bordered rounded-none min-h-36 w-full resize-none border-[#D6DCE3] bg-[#F3F5F7] text-base-content leading-7 transition-colors hover:border-primary active:border-primary focus:border-primary focus:bg-primary/[0.03] focus:outline-none dark:border-[#2A3138] dark:bg-[#161A1F] dark:hover:border-primary";
  const simplePromptTextareaClassName = promptTextareaClassName;
  const subtleInputClassName = "input input-bordered input-sm rounded-none border-[#D6DCE3] bg-[#F3F5F7] text-base-content dark:border-[#2A3138] dark:bg-[#161A1F]";
  const subtleSelectClassName = "select select-bordered select-sm rounded-none border-[#D6DCE3] bg-[#F3F5F7] text-base-content dark:border-[#2A3138] dark:bg-[#161A1F]";
  const simpleResolutionValueInputClassName = "min-w-0 appearance-none bg-transparent text-center text-xs font-semibold leading-none tabular-nums text-base-content focus:outline-none [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";
  const highlightPromptSurfaceClassName = "relative min-h-36 w-full overflow-hidden rounded-none border border-[#D6DCE3] bg-[#F3F5F7] shadow-none transition-colors hover:border-primary active:border-primary focus-within:border-primary focus-within:bg-primary/[0.03] dark:border-[#2A3138] dark:bg-[#161A1F] dark:hover:border-primary";
  const highlightPromptContentClassName = "min-h-36 px-3 py-2 text-sm leading-6";
  const highlightCharSurfaceClassName = "relative min-h-28 w-full overflow-hidden rounded-none border border-[#D6DCE3] bg-[#F3F5F7] shadow-none transition-colors hover:border-primary active:border-primary focus-within:border-primary focus-within:bg-primary/[0.03] dark:border-[#2A3138] dark:bg-[#161A1F] dark:hover:border-primary";
  const highlightCharContentClassName = "min-h-28 px-3 py-2 text-sm leading-6";
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
      ? "border-[#D6DCE3] bg-[#F3F5F7] text-base-content/60 hover:border-error/30 hover:bg-error/5 hover:text-error dark:border-[#2A3138] dark:bg-[#161A1F] dark:hover:border-error/35 dark:hover:bg-error/10"
      : "border-[#D6DCE3] bg-[#F3F5F7] text-base-content/35 dark:border-[#2A3138] dark:bg-[#161A1F] dark:text-base-content/30"
  }`;
  const floatingInputActionClassName = "btn btn-xs btn-ghost absolute right-3 top-3 z-10 border-0 bg-transparent px-2 text-base-content/35 shadow-none transition-colors backdrop-blur-0 hover:bg-black/28 hover:text-white focus-visible:text-white dark:text-base-content/40 dark:hover:bg-white/12";

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
    <div ref={sidebarSurfaceRef} className={`${isDirectorToolsOpen ? "hidden" : "flex"} h-full min-h-0 w-full min-w-0 flex-col gap-0 overflow-hidden bg-[#F3F5F7] p-0 dark:bg-[#161A1F]`}>
      <div className="min-h-0 flex-1 overflow-y-auto">
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
                <XCircleIcon className="absolute -right-1 -top-1 size-4 text-error" weight="fill" aria-hidden="true" />
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
                      className={`absolute left-0 right-0 top-[calc(100%+0.5rem)] z-40 max-h-[calc(100vh-12rem)] overflow-y-auto rounded-xl border border-[#D6DCE3] bg-[#F3F5F7] p-3 shadow-2xl ring-1 ring-black/5 transform-gpu transition-all duration-200 ease-out dark:border-[#2A3138] dark:bg-[#161A1F] dark:ring-white/5 ${
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
                <div className="flex items-center gap-2">
                  <div className="font-medium">{isSimpleTagsEditor || isSimplePreviewingConverted ? "NovelAi Tags" : "提示词 Prompt"}</div>
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
                          <button
                            type="button"
                            className={floatingInputActionClassName}
                            onClick={() => setIsStylePickerOpen(true)}
                          >
                            添加画风
                          </button>
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
                                className={`${subtleSelectClassName} w-full rounded-none bg-base-100 dark:bg-[#1B2026]`}
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
                      value={proPromptTab === "prompt" ? prompt : negativePrompt}
                      onChange={(e) => {
                        if (proPromptTab === "prompt")
                          setPrompt(e.target.value);
                        else
                          setNegativePrompt(e.target.value);
                      }}
                      spellCheck={false}
                    />
                  </div>

                  <ProFeatureSection
                    title="Add a Base Img (Optional)"
                    description={baseImageDescription}
                    badge={sourceImageDataUrl ? "img2img" : null}
                    open={proFeatureSections.baseImage}
                    onToggle={() => toggleProFeatureSection("baseImage")}
                  >
                    <div
                      className={`space-y-3 rounded-2xl border border-dashed p-3 transition-colors ${isPageImageDragOver ? "border-primary bg-primary/5" : "border-base-300/70 bg-base-200/20"}`}
                    >
                      {sourceImageDataUrl
                        ? (
                            <>
                              <img
                                src={sourceImageDataUrl}
                                alt="base"
                                className="max-h-52 w-full rounded-2xl border border-base-300 bg-base-200 object-contain"
                              />
                              <div className="grid grid-cols-2 gap-2">
                                <button type="button" className="btn btn-sm" disabled>
                                  Base Img 已禁用
                                </button>
                                <button type="button" className="btn btn-sm btn-ghost" onClick={handleClearSourceImage}>
                                  Clear
                                </button>
                              </div>
                            </>
                          )
                        : (
                            <button
                              type="button"
                              className={`flex min-h-28 w-full items-center justify-center rounded-2xl border px-4 transition-colors ${isPageImageDragOver ? "border-primary bg-primary/10 text-primary" : "border-dashed border-base-300 bg-base-200/60 text-base-content/70 hover:border-primary hover:text-base-content"}`}
                              aria-label="上传或拖拽导入图片"
                              title="上传或拖拽导入图片"
                              onClick={handleOpenSourceImagePicker}
                            >
                              <span className={`flex size-[72px] items-center justify-center rounded-[22px] border border-white/10 bg-[#2B2336]/88 shadow-[0_18px_36px_rgba(23,18,33,0.28)] transition-transform ${isPageImageDragOver ? "scale-[1.04]" : ""}`}>
                                <FileArrowUpIcon className="size-10 text-white" weight="fill" />
                              </span>
                            </button>
                          )}
                      {isPageImageDragOver
                        ? <div className="text-xs text-primary">整页任意位置松开都会读取图片并尝试解析 NovelAI metadata。</div>
                        : null}
                      <div className="text-xs leading-5 text-base-content/60">
                        支持整页拖拽、上传，或直接按 Ctrl+V 粘贴 NovelAI 图片；若检测到 metadata，可导入 Prompt / 设置 / Seed。Base Img、Vibe Transfer、Precise Reference 当前全部禁用。
                      </div>
                    </div>
                  </ProFeatureSection>

                  <ProFeatureSection
                    title="Character Prompts"
                    description={characterPromptDescription}
                    badge={v4Chars.length ? `${v4Chars.length}` : null}
                    open={proFeatureSections.characterPrompts}
                    onToggle={() => toggleProFeatureSection("characterPrompts")}
                    action={(
                      <button type="button" className="btn btn-xs" onClick={handleAddV4Char} disabled={!isNAI4}>
                        Add Character
                      </button>
                    )}
                  >
                    {isNAI4
                      ? (
                          <div className="space-y-3">
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
                                    <div className="h-1 rounded-full bg-base-200">
                                      <div className="h-full w-10 rounded-full bg-primary/80" />
                                    </div>
                                    {v4UseCoords
                                      ? (
                                          <div className="grid grid-cols-2 gap-2">
                                            <label className="form-control gap-1">
                                              <span className="label-text text-xs">Center X</span>
                                              <input className="input input-bordered input-sm rounded-none" type="number" min="0" max="1" step="0.01" value={row.centerX} onChange={e => handleUpdateV4Char(row.id, { centerX: clamp01(Number(e.target.value), 0.5) })} />
                                            </label>
                                            <label className="form-control gap-1">
                                              <span className="label-text text-xs">Center Y</span>
                                              <input className="input input-bordered input-sm rounded-none" type="number" min="0" max="1" step="0.01" value={row.centerY} onChange={e => handleUpdateV4Char(row.id, { centerY: clamp01(Number(e.target.value), 0.5) })} />
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
                      : <div className="text-sm opacity-60">当前模型不支持 Character Prompts。</div>}
                  </ProFeatureSection>

                  <ProFeatureSection
                    title="Vibe Transfer"
                    description={vibeTransferDescription}
                    badge={vibeTransferReferences.length ? `${vibeTransferReferences.length}` : null}
                    open={proFeatureSections.vibeTransfer}
                    onToggle={() => toggleProFeatureSection("vibeTransfer")}
                    action={(
                      <button
                        type="button"
                        className="btn btn-xs"
                        onClick={() => {
                          setProFeatureSectionOpen("vibeTransfer", true);
                          vibeReferenceInputRef.current?.click();
                        }}
                        disabled={!canAddVibeReference}
                      >
                        已禁用
                      </button>
                    )}
                  >
                    {isNAI4
                      ? (
                          <div className="space-y-3">
                            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-base-300 bg-base-100 px-4 py-3">
                              <input
                                type="checkbox"
                                className="toggle toggle-sm mt-0.5"
                                checked={normalizeReferenceStrengths}
                                onChange={event => setNormalizeReferenceStrengths(event.target.checked)}
                              />
                              <div>
                                <div className="text-sm font-medium">Normalize Reference Strengths</div>
                                <div className="mt-1 text-xs leading-5 text-base-content/60">
                                  发送请求前会按比例归一化各张参考图的强度，总和保持为 1，更接近 NovelAI 的同名开关行为。
                                </div>
                              </div>
                            </label>
                            {hasReferenceConflict
                              ? (
                                  <div className="rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm leading-6 text-warning-content">
                                    当前同时存在 Vibe Transfer 与 Precise Reference 的旧数据。为对齐 NovelAI 的当前交互，建议保留其中一侧后再生成。
                                  </div>
                                )
                              : null}
                            {preciseReference && !vibeTransferReferences.length
                              ? (
                                  <div className="rounded-2xl border border-base-300 bg-base-200/40 px-4 py-4 text-sm leading-6 text-base-content/60">
                                    NovelAI 当前交互里 Vibe Transfer 与 Precise Reference 互斥。清除 Precise Reference 后即可添加 Vibe 参考图。
                                  </div>
                                )
                              : null}
                            {vibeTransferReferences.map((row, idx) => (
                              <div key={row.id} className="rounded-2xl border border-base-300 bg-base-200/50 p-3">
                                <div className="mb-3 flex items-center gap-3">
                                  <img src={row.dataUrl} alt={row.name} className="h-16 w-16 rounded-2xl object-cover" />
                                  <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-medium">{row.name || `Reference ${idx + 1}`}</div>
                                    <div className="text-xs text-base-content/60">{`Reference ${idx + 1}`}</div>
                                  </div>
                                  <button type="button" className="btn btn-xs btn-ghost" onClick={() => handleRemoveVibeReference(row.id)}>删除</button>
                                </div>
                                <div className="space-y-4">
                                  <label className="form-control gap-2">
                                    <div className="flex items-center justify-between text-xs text-base-content/70">
                                      <span>Reference Strength</span>
                                      <span>{formatSliderValue(row.strength)}</span>
                                    </div>
                                    <input className="range range-xs" type="range" min="0" max="1" step="0.01" value={row.strength} onChange={e => handleUpdateVibeReference(row.id, { strength: clampRange(Number(e.target.value), 0, 1, 0.6) })} />
                                  </label>
                                  <label className="form-control gap-2">
                                    <div className="flex items-center justify-between text-xs text-base-content/70">
                                      <span>Information Extracted</span>
                                      <span>{formatSliderValue(row.informationExtracted)}</span>
                                    </div>
                                    <input
                                      className="range range-xs"
                                      type="range"
                                      min="0"
                                      max="1"
                                      step="0.01"
                                      value={row.informationExtracted}
                                      disabled={Boolean(row.lockInformationExtracted)}
                                      onChange={e => handleUpdateVibeReference(row.id, { informationExtracted: clampRange(Number(e.target.value), 0, 1, 1) })}
                                    />
                                    {row.lockInformationExtracted
                                      ? <div className="text-[11px] leading-5 text-base-content/50">该值来自图片 metadata，按 NovelAI 行为保持只读。</div>
                                      : null}
                                  </label>
                                </div>
                              </div>
                            ))}
                            {!vibeTransferReferences.length && !preciseReference
                              ? (
                                  <div className="rounded-2xl border border-dashed border-base-300 bg-base-200/30 px-4 py-4 text-sm leading-6 text-base-content/60">
                                    还没有 Vibe 参考图。添加参考图后可以保留构图和气质，再重新解释细节。
                                  </div>
                                )
                              : null}
                          </div>
                        )
                      : <div className="text-sm opacity-60">当前模型不支持 Vibe Transfer。</div>}
                  </ProFeatureSection>

                  <ProFeatureSection
                    title="Precise Reference"
                    description={preciseReferenceDescription}
                    badge={preciseReference ? "1" : null}
                    open={proFeatureSections.preciseReference}
                    onToggle={() => toggleProFeatureSection("preciseReference")}
                    action={(
                      <button
                        type="button"
                        className="btn btn-xs"
                        onClick={() => {
                          setProFeatureSectionOpen("preciseReference", true);
                          preciseReferenceInputRef.current?.click();
                        }}
                        disabled
                      >
                        已禁用
                      </button>
                    )}
                  >
                    {isNAI4
                      ? (
                          <div className="space-y-3">
                            {hasReferenceConflict
                              ? (
                                  <div className="rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm leading-6 text-warning-content">
                                    当前同时存在 Precise Reference 与 Vibe Transfer 的旧数据。为对齐 NovelAI 的当前交互，建议保留其中一侧后再生成。
                                  </div>
                                )
                              : null}
                            {!preciseReference && vibeTransferReferences.length
                              ? (
                                  <div className="rounded-2xl border border-base-300 bg-base-200/40 px-4 py-4 text-sm leading-6 text-base-content/60">
                                    NovelAI 当前交互里 Precise Reference 与 Vibe Transfer 互斥。清除 Vibe 参考图后即可上传单张精确参考图。
                                  </div>
                                )
                              : null}
                            {preciseReference
                              ? (
                                  <div className="rounded-2xl border border-base-300 bg-base-200/50 p-3">
                                    <div className="mb-3 flex items-center gap-3">
                                      <img src={preciseReference.dataUrl} alt={preciseReference.name} className="h-16 w-16 rounded-2xl object-cover" />
                                      <div className="min-w-0 flex-1">
                                        <div className="truncate text-sm font-medium">{preciseReference.name}</div>
                                        <div className="text-xs text-base-content/60">Single reference image</div>
                                      </div>
                                      <button type="button" className="btn btn-xs btn-ghost" onClick={() => setPreciseReference(null)}>清除</button>
                                    </div>
                                    <div className="space-y-4">
                                      <label className="form-control gap-2">
                                        <div className="flex items-center justify-between text-xs text-base-content/70">
                                          <span>Reference Strength</span>
                                          <span>{formatSliderValue(preciseReference.strength)}</span>
                                        </div>
                                        <input className="range range-xs" type="range" min="0" max="1" step="0.01" value={preciseReference.strength} onChange={e => setPreciseReference(prev => (prev ? { ...prev, strength: clampRange(Number(e.target.value), 0, 1, 1) } : prev))} />
                                      </label>
                                      <label className="form-control gap-2">
                                        <div className="flex items-center justify-between text-xs text-base-content/70">
                                          <span>Fidelity</span>
                                          <span>{formatSliderValue(preciseReference.informationExtracted)}</span>
                                        </div>
                                        <input className="range range-xs" type="range" min="0" max="1" step="0.01" value={preciseReference.informationExtracted} onChange={e => setPreciseReference(prev => (prev ? { ...prev, informationExtracted: clampRange(Number(e.target.value), 0, 1, 1) } : prev))} />
                                      </label>
                                    </div>
                                  </div>
                                )
                              : !vibeTransferReferences.length
                                  ? (
                                      <div className="rounded-2xl border border-dashed border-base-300 bg-base-200/30 px-4 py-4 text-sm leading-6 text-base-content/60">
                                        还没有 Precise Reference。上传单张角色或风格参考图后，会更贴近参考图的具体特征。
                                      </div>
                                    )
                                  : null}
                          </div>
                        )
                      : <div className="text-sm opacity-60">当前模型不支持 Precise Reference。</div>}
                  </ProFeatureSection>
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
                        className={`flex h-11 w-full items-center justify-between rounded-none border border-[#D6DCE3] bg-[#F3F5F7] px-3 py-2 text-left transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 hover:border-primary/40 hover:bg-[#EAEFF4] dark:border-[#2A3138] dark:bg-[#161A1F] dark:hover:bg-[#1B2026] ${isSimpleResolutionSelectorOpen ? "border-primary bg-primary/5 shadow-sm dark:bg-primary/10" : ""}`}
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
                            <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 overflow-hidden rounded-none border border-[#D6DCE3] bg-[#F3F5F7] p-2 shadow-2xl dark:border-[#2A3138] dark:bg-[#161A1F]">
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

                    <div className="grid h-11 w-[135px] grid-cols-[minmax(0,1fr)_10px_minmax(0,1fr)] items-center gap-1 rounded-none border border-[#D6DCE3] bg-[#F3F5F7] px-3 py-2 shadow-sm dark:border-[#2A3138] dark:bg-[#161A1F]">
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
                        className="input input-bordered input-sm rounded-none"
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
                        className="input input-bordered input-sm rounded-none"
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
                className={`btn h-12 w-full justify-between border px-4 disabled:border-0 disabled:bg-base-300 disabled:text-base-content/40 ${
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
