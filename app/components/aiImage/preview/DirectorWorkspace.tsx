import type { AiImagePreviewPaneProps } from "@/components/aiImage/preview/types";
import {
  ArrowLeftIcon,
  ClipboardTextIcon,
  FrameCornersIcon,
  UploadSimpleIcon,
  XIcon,
} from "@phosphor-icons/react";

import { useRef } from "react";
import { DIRECTOR_EMOTION_OPTIONS, DIRECTOR_TOOL_OPTIONS, isDirectorToolDisabled } from "@/components/aiImage/constants";
import { EmptyPreviewPlaceholder } from "@/components/aiImage/preview/EmptyPreviewPlaceholder";
import { ChevronDown, SharpDownload } from "@/icons";

export function DirectorWorkspace({
  isDirectorToolsOpen,
  selectedPreviewResult,
  isBusy,
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
  onToggleDirectorTools,
  onRunDirectorInputUpscale,
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
  onActiveDirectorToolChange,
  onRunDirectorTool,
  onCopyDirectorInputImage,
  onCopyDirectorOutputImage,
  onDownloadDirectorOutputImage,
  formatDirectorEmotionLabel,
}: AiImagePreviewPaneProps) {
  const directorUploadInputRef = useRef<HTMLInputElement | null>(null);

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
  const isActiveDirectorToolDisabled = isDirectorToolDisabled(activeDirectorTool);

  const handleDirectorSidebarDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer.files?.length)
      void onPickDirectorSourceImages(event.dataTransfer.files);
  };

  return (
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
                        title="Remove left rail image"
                        aria-label="Remove left rail image"
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
                          title="Copy left image"
                          aria-label="Copy left image"
                          onClick={() => void onCopyDirectorInputImage()}
                        >
                          <ClipboardTextIcon className="size-[18px]" weight="regular" />
                        </button>
                        <button
                          type="button"
                          className={directorCornerButtonClassName}
                          title="Upscale disabled"
                          aria-label="Upscale disabled"
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
                          title="Add to left rail"
                          aria-label="Add to left rail"
                          onClick={onAddDirectorDisplayedToSourceRail}
                        >
                          <ArrowLeftIcon className="size-[18px]" weight="bold" />
                        </button>
                        <button
                          type="button"
                          className={directorCornerButtonClassName}
                          title="Copy right image"
                          aria-label="Copy right image"
                          onClick={() => void onCopyDirectorOutputImage()}
                        >
                          <ClipboardTextIcon className="size-[18px]" weight="regular" />
                        </button>
                        <button
                          type="button"
                          className={directorCornerButtonClassName}
                          title="Download right image"
                          aria-label="Download right image"
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
                    onChange={event => onDirectorEmotionChange(event.target.value as typeof directorEmotion)}
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
          {DIRECTOR_TOOL_OPTIONS.map((tool) => {
            const isActive = activeDirectorTool === tool.id;
            const isDisabled = isDirectorToolDisabled(tool.id);
            return (
              <button
                key={tool.id}
                type="button"
                className={`${directorToolButtonClassName} ${
                  isDisabled
                    ? "cursor-not-allowed bg-base-300/55 text-base-content/35"
                    : isActive
                      ? "bg-[#f3efc6] text-[#111326]"
                      : "bg-transparent text-base-content/82 hover:bg-base-300 hover:text-base-content"
                }`}
                title={isDisabled ? "Remove BG disabled" : tool.description}
                disabled={isBusy || isDisabled}
                onClick={() => onActiveDirectorToolChange(tool.id)}
              >
                {tool.label}
              </button>
            );
          })}
          <button
            type="button"
            className="ml-auto inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#f3efc6] bg-[#f3efc6] px-4 text-[12px] font-semibold text-[#111326] shadow-[0_10px_20px_rgba(243,239,198,0.16)] transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#fff7c9] hover:border-[#fff7c9] hover:shadow-[0_14px_28px_rgba(243,239,198,0.24)] active:translate-y-0 active:scale-[0.985] active:shadow-[0_7px_16px_rgba(243,239,198,0.18)] focus:outline-none disabled:cursor-not-allowed disabled:border-[#f3efc6]/25 disabled:bg-[#f3efc6]/18 disabled:text-[#f3efc6]/40 disabled:shadow-none"
            disabled={!directorInputPreview || isBusy || isActiveDirectorToolDisabled}
            onClick={() => void onRunDirectorTool()}
          >
            <span>{pendingPreviewAction === activeDirectorTool ? "Transforming..." : "Transform"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
