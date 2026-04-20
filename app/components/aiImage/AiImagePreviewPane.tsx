import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ClipboardTextIcon,
  FrameCornersIcon,
  MagicWandIcon,
  PlantIcon,
  PushPinIcon as PhosphorPushPinIcon,
  SelectionPlusIcon,
  UploadSimpleIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useRef } from "react";

import type {
  ActivePreviewAction,
  DirectorToolId,
  DirectorToolOption,
  GeneratedImageItem,
  NovelAiEmotion,
} from "@/components/aiImage/types";

import { DIRECTOR_EMOTION_OPTIONS, DIRECTOR_TOOL_OPTIONS } from "@/components/aiImage/constants";
import { ChevronDown, ExpandCornersIcon, SharpDownload } from "@/icons";

interface AiImagePreviewPaneProps {
  isDirectorToolsOpen: boolean;
  previewMeta: string;
  results: GeneratedImageItem[];
  selectedPreviewResult: GeneratedImageItem | null;
  selectedResultIndex: number;
  selectedHistoryPreviewKey: string | null;
  isSelectedPreviewPinned: boolean;
  isBusy: boolean;
  isGeneratingImage: boolean;
  isDirectorImageDragOver: boolean;
  pendingPreviewAction: ActivePreviewAction;
  activeDirectorTool: DirectorToolId;
  directorTool: DirectorToolOption;
  directorSourceItems: GeneratedImageItem[];
  directorInputPreview: GeneratedImageItem | null;
  directorOutputPreview: GeneratedImageItem | null;
  directorColorizePrompt: string;
  directorColorizeDefry: number;
  directorEmotion: NovelAiEmotion;
  directorEmotionExtraPrompt: string;
  directorEmotionDefry: number;
  onToggleDirectorTools: () => void;
  onRunUpscale: () => void | Promise<void>;
  onRunDirectorInputUpscale: () => void | Promise<void>;
  onUseSelectedResultAsBaseImage: () => void;
  onPickDirectorSourceImages: (files: FileList | File[]) => void | Promise<void>;
  onSelectDirectorSourceItem: (item: GeneratedImageItem) => void;
  onRemoveDirectorSourceItem: (item: GeneratedImageItem) => void;
  onAddDirectorDisplayedToSourceRail: () => void;
  onDirectorImageDragEnter: (event: React.DragEvent<HTMLDivElement>) => void;
  onDirectorImageDragLeave: (event: React.DragEvent<HTMLDivElement>) => void;
  onDirectorImageDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  onDirectorImageDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  onDirectorColorizePromptChange: (value: string) => void;
  onDirectorColorizeDefryChange: (value: number) => void;
  onDirectorEmotionChange: (value: NovelAiEmotion) => void;
  onDirectorEmotionExtraPromptChange: (value: string) => void;
  onDirectorEmotionDefryChange: (value: number) => void;
  onActiveDirectorToolChange: (value: DirectorToolId) => void;
  onRunDirectorTool: () => void | Promise<void>;
  onSelectCurrentResult: (index: number) => void;
  onOpenPreviewImage: () => void;
  onTogglePinnedPreview: () => void;
  onOpenInpaint: () => void;
  onCopySelectedPreviewImage: () => void | Promise<void>;
  onCopyDirectorInputImage: () => void | Promise<void>;
  onCopyDirectorOutputImage: () => void | Promise<void>;
  onDownloadCurrent: () => void;
  onDownloadDirectorOutputImage: () => void;
  onApplySelectedPreviewSeed: () => void;
  formatDirectorEmotionLabel: (value: NovelAiEmotion) => string;
}

function EmptyPreviewPlaceholder() {
  return (
    <div className="pointer-events-none select-none">
      <svg
        className="h-auto w-[106px] max-w-[20vw]"
        viewBox="0 0 106 74"
        aria-hidden="true"
      >
        <path
          d="M95.4 0C98.2113 0 100.907 1.11377 102.895 3.0963C104.883 5.07883 106 7.76771 106 10.5714V63.4286C106 66.2323 104.883 68.9212 102.895 70.9037C100.907 72.8862 98.2113 74 95.4 74H10.6C7.78871 74 5.09255 72.8862 3.10467 70.9037C1.11678 68.9212 0 66.2323 0 63.4286V10.5714C0 4.70429 4.717 0 10.6 0H95.4ZM15.9 58.1429H90.1L66.25 26.4286L47.7 50.2143L34.45 34.3571L15.9 58.1429Z"
          fill="#5F6471"
        />
      </svg>
    </div>
  );
}

export function AiImagePreviewPane({
  isDirectorToolsOpen,
  previewMeta,
  results,
  selectedPreviewResult,
  selectedResultIndex,
  selectedHistoryPreviewKey,
  isSelectedPreviewPinned,
  isBusy,
  isGeneratingImage,
  isDirectorImageDragOver,
  pendingPreviewAction,
  activeDirectorTool,
  directorTool,
  directorSourceItems,
  directorInputPreview,
  directorOutputPreview,
  directorColorizePrompt,
  directorColorizeDefry,
  directorEmotion,
  directorEmotionExtraPrompt,
  directorEmotionDefry,
  onToggleDirectorTools,
  onRunUpscale,
  onRunDirectorInputUpscale,
  onUseSelectedResultAsBaseImage,
  onPickDirectorSourceImages,
  onSelectDirectorSourceItem,
  onRemoveDirectorSourceItem,
  onAddDirectorDisplayedToSourceRail,
  onDirectorImageDragEnter,
  onDirectorImageDragLeave,
  onDirectorImageDragOver,
  onDirectorImageDrop,
  onDirectorColorizePromptChange,
  onDirectorColorizeDefryChange,
  onDirectorEmotionChange,
  onDirectorEmotionExtraPromptChange,
  onDirectorEmotionDefryChange,
  onActiveDirectorToolChange,
  onRunDirectorTool,
  onSelectCurrentResult,
  onOpenPreviewImage,
  onTogglePinnedPreview,
  onOpenInpaint,
  onCopySelectedPreviewImage,
  onCopyDirectorInputImage,
  onCopyDirectorOutputImage,
  onDownloadCurrent,
  onDownloadDirectorOutputImage,
  onApplySelectedPreviewSeed,
  formatDirectorEmotionLabel,
}: AiImagePreviewPaneProps) {
  const directorUploadInputRef = useRef<HTMLInputElement | null>(null);

  const previewToolbarControlSurfaceClassName = "!rounded-none border-0 bg-base-300/70 shadow-none";
  const previewToolbarIconButtonClassName = `inline-flex size-9 shrink-0 items-center justify-center ${previewToolbarControlSurfaceClassName} text-base-content/70 transition-colors hover:bg-base-300/85 hover:text-base-content disabled:cursor-not-allowed disabled:opacity-50`;
  const previewToolbarPillClassName = `inline-flex h-9 items-center ${previewToolbarControlSurfaceClassName} px-3 text-xs font-medium text-base-content`;
  const previewToolbarActionButtonClassName = `inline-flex h-9 items-center gap-2 ${previewToolbarControlSurfaceClassName} px-3 text-xs text-base-content transition-colors hover:bg-base-300/85`;
  const previewToolbarSectionClassName = "inline-flex w-fit max-w-full min-w-0 flex-wrap items-center gap-0 rounded-none bg-white/22 p-px shadow-sm";
  const previewThumbnailImageClassName = "block h-24 w-24 object-contain";

  const directorShellClassName = "flex min-h-0 flex-1 flex-col overflow-hidden bg-base-200 text-base-content";
  const directorFrameClassName = "bg-transparent";
  const directorCanvasClassName = "relative flex min-h-[360px] flex-1 items-center justify-center overflow-hidden bg-base-100 p-4";
  const directorControlButtonClassName = "inline-flex h-9 items-center justify-center rounded-md bg-transparent px-3 text-[12px] font-medium text-base-content transition hover:bg-black/5 hover:text-base-content focus:outline-none disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-white/8";
  const directorThumbButtonClassName = "group relative block overflow-hidden bg-base-100 transition focus:outline-none";
  const directorToolButtonClassName = "inline-flex h-10 items-center justify-center rounded-md px-3 text-[12px] font-medium transition focus:outline-none";
  const directorFieldClassName = "h-10 w-full rounded-md border border-base-300 bg-base-100 px-3 text-sm text-base-content placeholder:text-base-content/45 transition focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";
  const directorSelectClassName = "h-10 w-full rounded-md border border-base-300 bg-base-100 px-3 text-sm text-base-content transition focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";
  const directorCornerActionsClassName = "absolute bottom-3 flex items-center gap-2";
  const directorCornerButtonClassName = "inline-flex size-9 items-center justify-center rounded-md border border-base-300 bg-base-100/96 text-base-content/72 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/45 hover:text-base-content active:translate-y-0 active:scale-[0.98] focus:outline-none disabled:cursor-not-allowed disabled:opacity-35";
  const directorCornerPillClassName = "inline-flex items-center rounded-md border border-base-300 bg-base-100/96 px-3 py-2 text-[11px] font-medium text-base-content/72 shadow-sm";
  const directorDefryOptions = [0, 1, 2, 3, 4, 5] as const;
  const directorDisplayedOutput = directorOutputPreview ?? selectedPreviewResult;

  const handleDirectorSidebarDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer.files?.length)
      void onPickDirectorSourceImages(event.dataTransfer.files);
  };

  return (
    <div className={`flex min-h-0 flex-1 flex-col gap-3 overflow-auto ${isDirectorToolsOpen ? "bg-base-200 p-4" : "bg-base-200 py-3"}`}>
      {isDirectorToolsOpen
        ? (
            <div
              className={`relative ${directorShellClassName}`}
              onDragEnter={onDirectorImageDragEnter}
              onDragLeave={onDirectorImageDragLeave}
              onDragOver={onDirectorImageDragOver}
              onDrop={onDirectorImageDrop}
            >
              <input
                ref={directorUploadInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(event) => {
                  const files = event.target.files;
                  if (files?.length)
                    void onPickDirectorSourceImages(files);
                  event.target.value = "";
                }}
              />

              <div className="flex items-center justify-start px-4 py-3">
                <div className="flex items-center">
                  <button
                    type="button"
                    className={directorControlButtonClassName}
                    aria-expanded={isDirectorToolsOpen}
                    onClick={onToggleDirectorTools}
                  >
                    <ChevronDown className="size-4 rotate-90" />
                  </button>
                </div>
              </div>

              <div className="flex min-h-0 flex-1 gap-4 overflow-hidden p-4">
                <div className={`flex w-[128px] shrink-0 flex-col gap-2 ${directorFrameClassName}`}>
                  <button
                    type="button"
                    className="inline-flex h-9 w-[100px] items-center justify-center rounded-md bg-[#f3efc6] text-[#111326] shadow-[0_8px_18px_rgba(243,239,198,0.18)] transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#fff7c9] hover:text-[#111326] hover:shadow-[0_12px_24px_rgba(243,239,198,0.28)] active:translate-y-0 active:scale-[0.98] active:shadow-[0_6px_14px_rgba(243,239,198,0.2)] focus:outline-none disabled:cursor-not-allowed disabled:bg-[#f3efc6]/30 disabled:text-[#111326]/45 disabled:shadow-none"
                    disabled={isBusy}
                    onClick={() => directorUploadInputRef.current?.click()}
                  >
                    <UploadSimpleIcon className="size-4" weight="bold" />
                  </button>

                  <div
                    className="flex-1 space-y-2 overflow-y-auto overflow-x-hidden pr-5 [scrollbar-gutter:stable]"
                    onDragEnter={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      event.dataTransfer.dropEffect = "copy";
                    }}
                    onDrop={handleDirectorSidebarDrop}
                  >
                    {directorSourceItems.length
                      ? directorSourceItems.map((item, index) => {
                          const isActive = directorInputPreview?.batchId === item.batchId && directorInputPreview.batchIndex === item.batchIndex;
                          return (
                            <div
                              key={`${item.batchId}-${item.batchIndex}`}
                              className={`${directorThumbButtonClassName} relative h-[100px] w-[100px] rounded-xl border bg-base-100 shadow-sm transition-colors ${isActive ? "border-primary shadow-[0_0_0_1px_rgba(99,102,241,0.35)]" : "border-base-300 hover:border-primary/45"}`}
                            >
                              <button
                                type="button"
                                className="absolute right-2 top-2 z-10 inline-flex size-6 items-center justify-center rounded-md bg-transparent text-base-content/62 opacity-0 transition hover:bg-transparent hover:text-error group-hover:opacity-100"
                                title="删除左侧栏图片"
                                aria-label="删除左侧栏图片"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onRemoveDirectorSourceItem(item);
                                }}
                              >
                                <XIcon className="size-3.5" weight="bold" />
                              </button>
                              <button
                                type="button"
                                className="block h-[100px] w-[100px]"
                                onClick={() => onSelectDirectorSourceItem(item)}
                              >
                                <span className="flex h-[100px] w-[100px] items-center justify-center bg-base-100">
                                  <img src={item.dataUrl} alt={`director-result-${index + 1}`} className="block h-full w-full object-contain transition duration-200 group-hover:scale-[1.02]" />
                                </span>
                              </button>
                            </div>
                          );
                        })
                      : null}
                  </div>
                </div>

                <div className="grid min-h-0 min-w-0 flex-1 gap-4 xl:grid-cols-2">
                  <div className={`flex min-h-0 flex-col gap-3 ${directorFrameClassName}`}>
                    <div className={directorCanvasClassName}>
                      {directorInputPreview
                        ? <img src={directorInputPreview.dataUrl} className="max-h-full max-w-full object-contain" alt="director-input" />
                        : <EmptyPreviewPlaceholder />}
                      {directorInputPreview
                        ? (
                            <>
                              <div className={`${directorCornerActionsClassName} left-3`}>
                                <button
                                  type="button"
                                  className={directorCornerButtonClassName}
                                  title="复制当前左图"
                                  aria-label="复制当前左图"
                                  onClick={() => void onCopyDirectorInputImage()}
                                >
                                  <ClipboardTextIcon className="size-[18px]" weight="regular" />
                                </button>
                                <button
                                  type="button"
                                  className={directorCornerButtonClassName}
                                  title="Upscale 已禁用"
                                  aria-label="Upscale 已禁用"
                                  disabled                                
                                  onClick={() => void onRunDirectorInputUpscale()}
                                >
                                  <FrameCornersIcon className="size-[18px]" weight="bold" />
                                </button>
                              </div>
                              <div className={`${directorCornerActionsClassName} right-3`}>
                                <span className={directorCornerPillClassName}>{`${directorInputPreview.width} × ${directorInputPreview.height}`}</span>
                              </div>
                            </>
                          )
                        : null}
                    </div>
                  </div>

                  <div className={`flex min-h-0 flex-col gap-3 ${directorFrameClassName}`}>
                    <div className={directorCanvasClassName}>
                      {directorDisplayedOutput
                        ? <img src={directorDisplayedOutput.dataUrl} className="max-h-full max-w-full object-contain" alt="director-output" />
                        : <EmptyPreviewPlaceholder />}
                      {directorDisplayedOutput
                        ? (
                            <>
                              <div className={`${directorCornerActionsClassName} left-3`}>
                                <span className={directorCornerPillClassName}>{`${directorDisplayedOutput.width} × ${directorDisplayedOutput.height}`}</span>
                              </div>
                              <div className={`${directorCornerActionsClassName} right-3`}>
                                <button
                                  type="button"
                                  className={directorCornerButtonClassName}
                                  title="添加到左侧栏"
                                  aria-label="添加到左侧栏"
                                  onClick={onAddDirectorDisplayedToSourceRail}
                                >
                                  <ArrowLeftIcon className="size-[18px]" weight="bold" />
                                </button>
                                <button
                                  type="button"
                                  className={directorCornerButtonClassName}
                                  title="复制当前右图"
                                  aria-label="复制当前右图"
                                  onClick={() => void onCopyDirectorOutputImage()}
                                >
                                  <ClipboardTextIcon className="size-[18px]" weight="regular" />
                                </button>
                                <button
                                  type="button"
                                  className={directorCornerButtonClassName}
                                  title="下载当前右图"
                                  aria-label="下载当前右图"
                                  onClick={onDownloadDirectorOutputImage}
                                >
                                  <SharpDownload className="size-[18px]" />
                                </button>
                              </div>
                            </>
                          )
                        : null}
                      {!directorDisplayedOutput && pendingPreviewAction === activeDirectorTool
                        ? (
                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
                              <span className={directorCornerPillClassName}>Transforming...</span>
                            </div>
                          )
                        : null}
                    </div>
                  </div>
                </div>
              </div>

              {isDirectorImageDragOver
                ? (
                    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-base-100/52 backdrop-blur-[2px]">
                      <div className="flex size-[88px] items-center justify-center rounded-[24px] bg-[#242636]/78 shadow-[0_16px_34px_rgba(0,0,0,0.24)] backdrop-blur-sm">
                        <UploadSimpleIcon className="size-11 text-white/90 drop-shadow-[0_1px_1px_rgba(0,0,0,0.28)]" weight="bold" aria-hidden="true" />
                      </div>
                    </div>
                  )
                : null}

              <div className="bg-base-200 p-4">
                {directorTool.parameterMode === "colorize"
                  ? (
                      <div className={`mb-3 grid gap-3 ${directorFrameClassName} xl:grid-cols-[220px_minmax(0,1fr)]`}>
                        <div className="min-w-0">
                          <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-base-content/55">Defry</div>
                          <div className="flex items-center gap-1 rounded-md border border-base-300 bg-base-100 p-1">
                            {directorDefryOptions.map((value) => {
                              const isActive = Number(directorColorizeDefry) === value;
                              return (
                                <button
                                  key={value}
                                  type="button"
                                  className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-[12px] font-medium transition focus:outline-none ${
                                    isActive
                                      ? "bg-[#f3efc6] text-[#111326]"
                                      : "text-base-content/75 hover:bg-base-300 hover:text-base-content"
                                  }`}
                                  onClick={() => onDirectorColorizeDefryChange(value)}
                                >
                                  {value}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <label className="min-w-0">
                          <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-base-content/55">Prompt (Optional)</div>
                          <input
                            type="text"
                            className={directorFieldClassName}
                            value={directorColorizePrompt}
                            disabled={isBusy}
                            onChange={event => onDirectorColorizePromptChange(event.target.value)}
                          />
                        </label>
                      </div>
                    )
                  : null}

                {directorTool.parameterMode === "emotion"
                  ? (
                      <div className={`mb-3 grid gap-3 ${directorFrameClassName} xl:grid-cols-[180px_minmax(0,1fr)]`}>
                        <label className="min-w-0">
                          <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-base-content/55">Emotion</div>
                          <select
                            className={directorSelectClassName}
                            value={directorEmotion}
                            disabled={isBusy}
                            onChange={event => onDirectorEmotionChange(event.target.value as NovelAiEmotion)}
                          >
                            {DIRECTOR_EMOTION_OPTIONS.map(item => (
                              <option key={item} value={item}>{formatDirectorEmotionLabel(item)}</option>
                            ))}
                          </select>
                        </label>
                        <label className="min-w-0">
                          <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-base-content/55">Prompt</div>
                          <input
                            type="text"
                            className={directorFieldClassName}
                            value={directorEmotionExtraPrompt}
                            disabled={isBusy}
                            onChange={event => onDirectorEmotionExtraPromptChange(event.target.value)}
                          />
                        </label>
                      </div>
                    )
                  : null}

                <div className={`flex flex-wrap items-center gap-2 ${directorFrameClassName}`}>
                  {DIRECTOR_TOOL_OPTIONS.map(tool => {
                    const isActive = activeDirectorTool === tool.id;
                    return (
                      <button
                        key={tool.id}
                        type="button"
                        className={`${directorToolButtonClassName} ${
                          isActive
                            ? "bg-[#f3efc6] text-[#111326]"
                            : "bg-transparent text-base-content/82 hover:bg-base-300 hover:text-base-content"
                        }`}
                        disabled={isBusy}
                        onClick={() => onActiveDirectorToolChange(tool.id)}
                      >
                        {tool.label}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    className="ml-auto inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#f3efc6] bg-[#f3efc6] px-4 text-[12px] font-semibold text-[#111326] shadow-[0_10px_20px_rgba(243,239,198,0.16)] transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#fff7c9] hover:border-[#fff7c9] hover:shadow-[0_14px_28px_rgba(243,239,198,0.24)] active:translate-y-0 active:scale-[0.985] active:shadow-[0_7px_16px_rgba(243,239,198,0.18)] focus:outline-none disabled:cursor-not-allowed disabled:border-[#f3efc6]/25 disabled:bg-[#f3efc6]/18 disabled:text-[#f3efc6]/40 disabled:shadow-none"
                    disabled={!directorInputPreview || isBusy}
                    onClick={() => void onRunDirectorTool()}
                  >
                    <span>{pendingPreviewAction === activeDirectorTool ? "Transforming..." : "Transform"}</span>
                    <span className="inline-flex items-center rounded-md bg-[#111326]/12 px-2 py-0.5 text-[11px] font-semibold">
                      0
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )
        : null}

      {!isDirectorToolsOpen && results.length > 1
        ? (
            <div className="flex gap-2 overflow-x-auto">
              {results.map((item, index) => (
                <button
                  key={`${item.batchId}-${item.batchIndex}`}
                  type="button"
                  className={`overflow-hidden rounded-box border bg-base-100 ${!selectedHistoryPreviewKey && selectedResultIndex === index ? "border-primary" : "border-base-300"}`}
                  onClick={() => onSelectCurrentResult(index)}
                >
                  <img src={item.dataUrl} alt={`result-${index + 1}`} className={previewThumbnailImageClassName} />
                </button>
              ))}
            </div>
          )
        : null}

      {!isDirectorToolsOpen
        ? (
            <div className="flex min-h-[520px] flex-1 self-stretch flex-col overflow-hidden rounded-none border-y border-base-300 bg-base-100">
              {selectedPreviewResult
                ? (
                    <div className="flex justify-center px-3 py-2.5">
                      <div className={previewToolbarSectionClassName}>
                        <button
                          type="button"
                          className={previewToolbarIconButtonClassName}
                          title="Upscale 已禁用"
                          aria-label="Upscale 已禁用"
                          disabled
                          onClick={() => void onRunUpscale()}
                        >
                          <FrameCornersIcon className="size-[18px]" weight="bold" />
                        </button>
                        <button
                          type="button"
                          className={previewToolbarIconButtonClassName}
                          title="Use as Base Image"
                          aria-label="Use as Base Image"
                          disabled={isBusy}
                          onClick={onUseSelectedResultAsBaseImage}
                        >
                          <MagicWandIcon className="size-[18px]" weight="bold" />
                        </button>
                        <button
                          type="button"
                          className={previewToolbarIconButtonClassName}
                          title="打开 Inpaint"
                          aria-label="打开 Inpaint"
                          disabled={isBusy}
                          onClick={onOpenInpaint}
                        >
                          <SelectionPlusIcon className="size-[18px]" weight="bold" />
                        </button>
                        <button
                          type="button"
                          className={previewToolbarIconButtonClassName}
                          title="打开 Director Tools"
                          aria-label="打开 Director Tools"
                          disabled={isBusy}
                          onClick={onToggleDirectorTools}
                        >
                          <ArrowRightIcon className="size-[18px]" weight="bold" />
                        </button>
                      </div>
                    </div>
                  )
                : null}
              <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-3">
                {isGeneratingImage
                  ? (
                      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px animate-pulse bg-primary/65" />
                    )
                  : null}
                <div
                  className="relative z-[1] flex items-center justify-center"
                  style={selectedPreviewResult
                    ? {
                        width: `${selectedPreviewResult.width}px`,
                        height: `${selectedPreviewResult.height}px`,
                        maxWidth: "100%",
                        maxHeight: "100%",
                      }
                    : undefined}
                >
                  {selectedPreviewResult
                    ? (
                        <img
                          src={selectedPreviewResult.dataUrl}
                          className="max-h-full max-w-full rounded-box object-contain"
                          alt="result"
                        />
                      )
                    : <EmptyPreviewPlaceholder />}
                </div>
              </div>

              {selectedPreviewResult
                ? (
                    <div className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                      <div className={previewToolbarSectionClassName}>
                        <span className={previewToolbarPillClassName}>{`${selectedPreviewResult.width} × ${selectedPreviewResult.height}`}</span>
                        <button
                          type="button"
                          className={previewToolbarIconButtonClassName}
                          title="查看当前预览"
                          aria-label="查看当前预览"
                          onClick={onOpenPreviewImage}
                        >
                          <ExpandCornersIcon className="size-[18px]" />
                        </button>
                      </div>
                      <div className={`${previewToolbarSectionClassName} justify-start sm:ml-auto sm:justify-end`}>
                        <button
                          type="button"
                          className={previewToolbarIconButtonClassName}
                          title={isSelectedPreviewPinned ? "取消固定当前预览" : "固定当前预览"}
                          aria-label={isSelectedPreviewPinned ? "取消固定当前预览" : "固定当前预览"}
                          onClick={onTogglePinnedPreview}
                        >
                          <PhosphorPushPinIcon className="size-[18px]" weight="regular" />
                        </button>
                        <button
                          type="button"
                          className={previewToolbarIconButtonClassName}
                          title="复制当前图片"
                          aria-label="复制当前图片"
                          onClick={() => void onCopySelectedPreviewImage()}
                        >
                          <ClipboardTextIcon className="size-[18px]" weight="regular" />
                        </button>
                        <button
                          type="button"
                          className={previewToolbarIconButtonClassName}
                          title="下载当前预览"
                          aria-label="下载当前预览"
                          onClick={onDownloadCurrent}
                        >
                          <SharpDownload className="size-[18px]" />
                        </button>
                        <button
                          type="button"
                          className={previewToolbarActionButtonClassName}
                          title="将当前预览 seed 回填到设置"
                          aria-label="将当前预览 seed 回填到设置"
                          onClick={onApplySelectedPreviewSeed}
                        >
                          <PlantIcon className="size-[18px]" weight="regular" />
                          <span className="font-mono text-[11px]">{selectedPreviewResult.seed}</span>
                        </button>
                      </div>
                    </div>
                  )
                : null}
            </div>
          )
        : null}
    </div>
  );
}
