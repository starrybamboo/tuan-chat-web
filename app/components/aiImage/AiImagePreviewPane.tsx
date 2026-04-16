import type {
  ActivePreviewAction,
  DirectorToolId,
  DirectorToolOption,
  GeneratedImageItem,
  NovelAiEmotion,
} from "@/components/aiImage/types";
import { DIRECTOR_EMOTION_OPTIONS, DIRECTOR_TOOL_OPTIONS } from "@/components/aiImage/constants";
import { ChevronDown, EditIcon, ExpandCornersIcon, PushPinIcon, SharpDownload, SlidersIcon } from "@/icons";

interface AiImagePreviewPaneProps {
  isDirectorToolsOpen: boolean;
  previewMeta: string;
  previewNotice: string;
  error: string;
  results: GeneratedImageItem[];
  selectedPreviewResult: GeneratedImageItem | null;
  selectedResultIndex: number;
  selectedHistoryPreviewKey: string | null;
  pinnedPreviewResult: GeneratedImageItem | null;
  isSelectedPreviewPinned: boolean;
  isBusy: boolean;
  pendingPreviewAction: ActivePreviewAction;
  activeDirectorTool: DirectorToolId;
  directorTool: DirectorToolOption;
  directorInputPreview: GeneratedImageItem | null;
  directorOutputPreview: GeneratedImageItem | null;
  directorColorizePrompt: string;
  directorColorizeDefry: number;
  directorEmotion: NovelAiEmotion;
  directorEmotionExtraPrompt: string;
  directorEmotionDefry: number;
  hasSelectedPreviewHistoryRow: boolean;
  onToggleDirectorTools: () => void;
  onRunUpscale: () => void | Promise<void>;
  onSyncDirectorSourceFromCurrentPreview: () => void;
  onUseSelectedResultAsBaseImage: () => void;
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
  onApplySelectedPreviewSettings: () => void;
  onDownloadCurrent: () => void;
  onApplySelectedPreviewSeed: () => void;
  onSelectPinnedPreview: () => void;
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
          fill="#22253F"
        />
      </svg>
    </div>
  );
}

export function AiImagePreviewPane({
  isDirectorToolsOpen,
  previewMeta,
  previewNotice,
  error,
  results,
  selectedPreviewResult,
  selectedResultIndex,
  selectedHistoryPreviewKey,
  pinnedPreviewResult,
  isSelectedPreviewPinned,
  isBusy,
  pendingPreviewAction,
  activeDirectorTool,
  directorTool,
  directorInputPreview,
  directorOutputPreview,
  directorColorizePrompt,
  directorColorizeDefry,
  directorEmotion,
  directorEmotionExtraPrompt,
  directorEmotionDefry,
  hasSelectedPreviewHistoryRow,
  onToggleDirectorTools,
  onRunUpscale,
  onSyncDirectorSourceFromCurrentPreview,
  onUseSelectedResultAsBaseImage,
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
  onApplySelectedPreviewSettings,
  onDownloadCurrent,
  onApplySelectedPreviewSeed,
  onSelectPinnedPreview,
  formatDirectorEmotionLabel,
}: AiImagePreviewPaneProps) {
  const previewToolbarIconButtonClassName = "btn btn-sm btn-circle border-base-300 bg-base-100 text-base-content/70 hover:border-base-content/30 hover:text-base-content";
  const previewToolbarPillClassName = "inline-flex h-9 items-center rounded-full border border-base-300 bg-base-100 px-3 text-xs font-medium text-base-content shadow-sm";
  const directorCanvasContainerClassName = "overflow-hidden rounded-2xl border border-base-300 bg-base-100";
  const directorInsetPanelClassName = "rounded-2xl border border-base-300 bg-base-200/35 p-3";

  return (
    <div className={`flex min-h-0 flex-1 flex-col gap-3 overflow-auto ${isDirectorToolsOpen ? "bg-base-200 p-4" : "bg-base-200 px-1 py-3"}`}>
      {isDirectorToolsOpen
        ? (
            <div className="flex flex-wrap items-center gap-2 rounded-box border border-base-300 bg-base-100 p-3 shadow-sm">
              <div>
                <div className="text-sm font-medium">Director Workspace</div>
                <div className="text-xs text-base-content/60">{previewMeta || "选择输入图并执行 Transform"}</div>
              </div>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="btn btn-outline gap-2"
                  disabled
                  aria-expanded={isDirectorToolsOpen}
                  onClick={onToggleDirectorTools}
                >
                  Director Tools 已禁用
                  <ChevronDown className={`size-4 transition-transform ${isDirectorToolsOpen ? "rotate-180" : ""}`} />
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled
                  onClick={() => void onRunUpscale()}
                >
                  Upscale 已禁用
                </button>
              </div>
            </div>
          )
        : null}

      {isDirectorToolsOpen
        ? (
            <div className="rounded-2xl border border-base-300 bg-base-100 p-4 text-base-content shadow-sm">
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">Director Tools</div>
                  <div className="mt-1 text-xs leading-5 text-base-content/60">
                    对齐 NovelAI 当前 Director Tools：左侧保持输入图，右侧展示输出图，底部只保留官方当前可见工具和统一的 Transform 动作。
                  </div>
                </div>
                <div className="ml-auto flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    disabled={!selectedPreviewResult || isBusy}
                    onClick={onSyncDirectorSourceFromCurrentPreview}
                  >
                    使用当前预览作为输入
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    disabled={!selectedPreviewResult || isBusy}
                    onClick={onUseSelectedResultAsBaseImage}
                  >
                    用作 Base Img
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 xl:grid-cols-2">
                <div className={directorCanvasContainerClassName}>
                  <div className="flex items-center justify-between border-b border-base-300 px-3 py-2">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-base-content/45">Input</div>
                      <div className="text-xs text-base-content/60">
                        {directorInputPreview ? `${directorInputPreview.width}×${directorInputPreview.height}` : "先从当前预览或历史里选一张图"}
                      </div>
                    </div>
                    {directorInputPreview?.toolLabel
                      ? <span className="badge badge-sm badge-outline border-primary/30 text-base-content">{directorInputPreview.toolLabel}</span>
                      : null}
                  </div>
                  <div className="flex min-h-[360px] items-center justify-center bg-base-200/40 p-3">
                    {directorInputPreview
                      ? <img src={directorInputPreview.dataUrl} className="max-h-[320px] w-auto rounded-box object-contain" alt="director-input" />
                      : (
                          <div className="text-center text-sm text-base-content/60">
                            <div className="font-medium text-base-content/85">等待输入图</div>
                            <div className="mt-1">从本次绘画或历史绘画中选中一张图片，然后点击“使用当前预览作为输入”。</div>
                          </div>
                        )}
                  </div>
                </div>

                <div className={directorCanvasContainerClassName}>
                  <div className="flex items-center justify-between border-b border-base-300 px-3 py-2">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-base-content/45">Output</div>
                      <div className="text-xs text-base-content/60">
                        {directorOutputPreview ? `${directorOutputPreview.width}×${directorOutputPreview.height}` : "Transform 结果会显示在这里"}
                      </div>
                    </div>
                    {directorOutputPreview?.toolLabel
                      ? <span className="badge badge-sm badge-primary badge-outline">{directorOutputPreview.toolLabel}</span>
                      : null}
                  </div>
                  <div className="flex min-h-[360px] items-center justify-center bg-base-200/40 p-3">
                    {directorOutputPreview
                      ? <img src={directorOutputPreview.dataUrl} className="max-h-[320px] w-auto rounded-box object-contain" alt="director-output" />
                      : (
                          <div className="text-center text-sm text-base-content/60">
                            <div className="font-medium text-base-content/85">{pendingPreviewAction === activeDirectorTool ? "Transforming..." : "等待输出图"}</div>
                            <div className="mt-1">选择下方工具并执行 Transform 后，结果会保留在右侧，同时加入当前预览和历史。</div>
                          </div>
                        )}
                  </div>
                </div>
              </div>

              {directorTool.parameterMode === "colorize"
                ? (
                    <div className={`mt-4 grid gap-3 ${directorInsetPanelClassName} md:grid-cols-[minmax(0,1fr)_160px]`}>
                      <label className="block">
                        <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.18em] text-base-content/50">Prompt</div>
                        <input
                          type="text"
                          className="input input-sm input-bordered w-full"
                          value={directorColorizePrompt}
                          disabled={isBusy}
                          placeholder="例如：warm sunset palette"
                          onChange={event => onDirectorColorizePromptChange(event.target.value)}
                        />
                      </label>
                      <label className="block">
                        <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.18em] text-base-content/50">Defry</div>
                        <input
                          type="number"
                          className="input input-sm input-bordered w-full"
                          value={directorColorizeDefry}
                          disabled={isBusy}
                          min={0}
                          step="0.1"
                          onChange={event => onDirectorColorizeDefryChange(Number(event.target.value))}
                        />
                      </label>
                    </div>
                  )
                : null}

              {directorTool.parameterMode === "emotion"
                ? (
                    <div className={`mt-4 grid gap-3 ${directorInsetPanelClassName} md:grid-cols-[180px_minmax(0,1fr)_160px]`}>
                      <label className="block">
                        <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.18em] text-base-content/50">Emotion</div>
                        <select
                          className="select select-sm select-bordered w-full"
                          value={directorEmotion}
                          disabled={isBusy}
                          onChange={event => onDirectorEmotionChange(event.target.value as NovelAiEmotion)}
                        >
                          {DIRECTOR_EMOTION_OPTIONS.map(item => (
                            <option key={item} value={item}>{formatDirectorEmotionLabel(item)}</option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.18em] text-base-content/50">Extra Prompt</div>
                        <input
                          type="text"
                          className="input input-sm input-bordered w-full"
                          value={directorEmotionExtraPrompt}
                          disabled={isBusy}
                          placeholder="例如：blushing, watery eyes"
                          onChange={event => onDirectorEmotionExtraPromptChange(event.target.value)}
                        />
                      </label>
                      <label className="block">
                        <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.18em] text-base-content/50">Defry</div>
                        <input
                          type="number"
                          className="input input-sm input-bordered w-full"
                          value={directorEmotionDefry}
                          disabled={isBusy}
                          min={0}
                          step="0.1"
                          onChange={event => onDirectorEmotionDefryChange(Number(event.target.value))}
                        />
                      </label>
                    </div>
                  )
                : null}

              <div className={`mt-4 ${directorInsetPanelClassName}`}>
                <div className="flex flex-wrap items-center gap-2">
                  {DIRECTOR_TOOL_OPTIONS.map(tool => (
                    <button
                      key={tool.id}
                      type="button"
                      className={`btn btn-sm ${activeDirectorTool === tool.id ? "btn-primary" : "btn-ghost"}`}
                      disabled={isBusy}
                      onClick={() => onActiveDirectorToolChange(tool.id)}
                    >
                      {tool.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="btn btn-primary btn-sm ml-auto"
                    disabled={!directorInputPreview || isBusy}
                    onClick={() => void onRunDirectorTool()}
                  >
                    {pendingPreviewAction === activeDirectorTool ? "Transforming..." : "Transform"}
                  </button>
                </div>
                <div className="mt-2 text-[11px] leading-5 text-base-content/55">
                  {directorTool.parameterMode === "emotion"
                    ? "Emotion 会按官方规则把情绪值与额外提示词拼成 `emotion;;extra prompt` 后发送。"
                    : directorTool.parameterMode === "colorize"
                      ? "Colorize 会把 prompt 与 defry 直接扁平透传到 augment-image。"
                      : `${directorTool.label} 会直接使用当前输入图执行 ${directorTool.requestType}。`}
                </div>
              </div>
            </div>
          )
        : null}

      {previewNotice ? <div className="text-sm text-success">{previewNotice}</div> : null}
      {error ? <div className="text-sm text-error">{error}</div> : null}

      {!isDirectorToolsOpen && results.length > 1
        ? (
            <div className="flex gap-2 overflow-x-auto">
              {results.map((item, index) => (
                <button
                  key={`${item.batchId}-${item.batchIndex}`}
                  type="button"
                  className={`overflow-hidden rounded-box border ${!selectedHistoryPreviewKey && selectedResultIndex === index ? "border-primary" : "border-base-300"}`}
                  onClick={() => onSelectCurrentResult(index)}
                >
                  <img src={item.dataUrl} alt={`result-${index + 1}`} className="h-24 w-24 object-cover" />
                </button>
              ))}
            </div>
          )
        : null}

      {!isDirectorToolsOpen
        ? (
            <div className="relative flex min-h-[520px] flex-1 self-stretch items-center justify-center rounded-box border border-base-300 bg-base-100 p-3 shadow-sm">
              {selectedPreviewResult
                ? <img src={selectedPreviewResult.dataUrl} className="max-h-[720px] w-auto rounded-box" alt="result" />
                : <EmptyPreviewPlaceholder />}
              {pinnedPreviewResult && !isSelectedPreviewPinned
                ? (
                    <button
                      type="button"
                      className="absolute right-3 top-3 overflow-hidden rounded-2xl border border-base-300 bg-base-100/95 p-2 text-left shadow-xl backdrop-blur"
                      title="切回 pinned 预览"
                      onClick={onSelectPinnedPreview}
                    >
                      <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-base-content/60">
                        <PushPinIcon className="size-3" />
                        <span>Pinned</span>
                      </div>
                      <img src={pinnedPreviewResult.dataUrl} className="h-20 w-20 rounded-xl object-cover" alt="pinned-preview" />
                    </button>
                  )
                : null}
            </div>
          )
        : null}

      {!isDirectorToolsOpen && selectedPreviewResult
        ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-base-300 bg-base-100 px-3 py-2 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className={previewToolbarPillClassName}>{`${selectedPreviewResult.width} × ${selectedPreviewResult.height}`}</span>
                <button
                  type="button"
                  className={previewToolbarIconButtonClassName}
                  title="展开查看当前预览"
                  aria-label="展开查看当前预览"
                  onClick={onOpenPreviewImage}
                >
                  <ExpandCornersIcon className="size-4" />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={`${previewToolbarIconButtonClassName} ${isSelectedPreviewPinned ? "border-primary text-primary" : ""}`}
                  title={isSelectedPreviewPinned ? "取消固定当前预览" : "固定当前预览"}
                  aria-label={isSelectedPreviewPinned ? "取消固定当前预览" : "固定当前预览"}
                  onClick={onTogglePinnedPreview}
                >
                  <PushPinIcon className="size-4" />
                </button>
                <button
                  type="button"
                  className="inline-flex h-9 items-center gap-2 rounded-full border border-base-300 bg-base-100 px-3 text-xs text-base-content shadow-sm hover:border-base-content/30"
                  disabled={isBusy}
                  title="打开 Inpaint 蒙版编辑器"
                  aria-label="打开 Inpaint 蒙版编辑器"
                  onClick={onOpenInpaint}
                >
                  <EditIcon className="size-4" />
                  <span className="font-semibold">Inpaint</span>
                </button>
                <button
                  type="button"
                  className={previewToolbarIconButtonClassName}
                  disabled={!hasSelectedPreviewHistoryRow}
                  title="导入当前预览的生成设置"
                  aria-label="导入当前预览的生成设置"
                  onClick={onApplySelectedPreviewSettings}
                >
                  <SlidersIcon className="size-4" />
                </button>
                <button
                  type="button"
                  className={previewToolbarIconButtonClassName}
                  title="下载当前预览"
                  aria-label="下载当前预览"
                  onClick={onDownloadCurrent}
                >
                  <SharpDownload className="size-4" />
                </button>
                <button
                  type="button"
                  className="inline-flex h-9 items-center gap-2 rounded-full border border-base-300 bg-base-100 px-3 text-xs text-base-content shadow-sm hover:border-base-content/30"
                  title="将当前预览 seed 回填到设置"
                  aria-label="将当前预览 seed 回填到设置"
                  onClick={onApplySelectedPreviewSeed}
                >
                  <span className="font-semibold uppercase tracking-[0.16em] text-base-content/55">Seed</span>
                  <span className="font-mono">{selectedPreviewResult.seed}</span>
                </button>
              </div>
            </div>
          )
        : null}
    </div>
  );
}
