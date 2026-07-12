import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";

import {
  ArrowCounterClockwise,
  CheckCircleIcon,
  SparkleIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { memo } from "react";

import type { AiImagePageController } from "@/components/aiImage/useAiImagePageController";

import { HighlightEmphasisTextarea } from "@/components/aiImage/HighlightEmphasisTextarea";
import { Button } from "@/components/common/Button";
import { TextArea } from "@/components/common/FormField";
import { MediaImage } from "@/components/common/mediaImage";

export type SimpleEditorContentLocalProps = {
  isSimpleTagsEditor: boolean;
  isSimplePreviewingConverted: boolean;
  isSimpleTextEditor: boolean;
  floatingInputActionBaseClassName: string;
  editorPanelClassName: string;
  segmentedControlClassName: string;
  segmentedButtonBaseClassName: string;
  floatingInputActionClassName: string;
  simplePromptTextareaClassName: string;
  highlightPromptSurfaceClassName: string;
  highlightPromptContentClassName: string;
  highlightEmphasisEnabled: boolean;
  renderSimpleBaseImageSection: () => ReactNode;
  handleToggleLineCommentForSimpleTags: (event: ReactKeyboardEvent<HTMLTextAreaElement>) => void;
}

type SimpleEditorContentProps = {
  sidebarProps: AiImagePageController["sidebarProps"];
  local: SimpleEditorContentLocalProps;
}

export const SimpleEditorContent = memo(({
  sidebarProps,
  local,
}: SimpleEditorContentProps) => {
  const {
    isBusy,
    setIsStylePickerOpen,
    handleClearSimpleDraft,
    simpleText,
    setSimpleText,
    simpleConverted,
    setSimpleConverted,
    setSimpleConvertedFromText,
    setSimpleEditorMode,
    setSimplePromptTab,
    hasSimpleTagsDraft,
    handleReturnToSimpleTags,
    simplePromptTab,
    handleRejectSimpleConverted,
    handleAcceptSimpleConverted,
    simplePrompt,
    simpleNegativePrompt,
    setSimplePrompt,
    setSimpleNegativePrompt,
    handleReturnToSimpleText,
    selectedStylePresets,
  } = sidebarProps;

  const {
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
    renderSimpleBaseImageSection,
    handleToggleLineCommentForSimpleTags,
  } = local;

  return (
    <>
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

      <div className="flex flex-col gap-0">
        <div className={`
          grid transition-all duration-300 ease-out
          ${isSimpleTextEditor ? `grid-rows-[1fr] opacity-100` : `
            grid-rows-[0fr] opacity-0
          `}
        `}>
          <div className="min-h-0 overflow-hidden">
            <div className="flex w-full min-w-0 flex-col items-stretch">
              <div className={editorPanelClassName}>
                <div className="relative">
                  <TextArea
                    appearance="bare"
                    density="compact"
                    className={simplePromptTextareaClassName}
                    autoComplete="off"
                    aria-label="提示词"
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
                          className={`
                            ${floatingInputActionClassName}
                            top-auto bottom-3
                          `}
                          onClick={handleReturnToSimpleTags}
                          aria-label="返回 Tags 编辑"
                        >
                          <ArrowCounterClockwise className="size-3.5" weight="regular" />
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
        <div className={`
          grid transition-all duration-300 ease-out
          ${simpleConverted ? `grid-rows-[1fr] opacity-100` : `
            grid-rows-[0fr] opacity-0
          `}
        `}>
          <div className="min-h-0 overflow-hidden">
            <div className={`
              rounded-2xl border border-base-300 bg-base-100 p-3 shadow-sm
              transition-all duration-300 ease-out
                             ${simpleConverted ? `translate-y-0 scale-100` : `
                translate-y-2 scale-[0.98]
              `}
            `}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="
                    flex size-9 shrink-0 items-center justify-center rounded-xl
                    border border-info/20 bg-info/10 text-info
                  ">
                    <SparkleIcon className="size-4" weight="fill" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-base-content">候选 tags</div>
                    <div className="text-xs text-base-content/55">待确认</div>
                  </div>
                </div>
                <div className="
                  rounded-full border border-info/20 bg-info/[0.08] px-2
                  py-1 text-[11px] font-medium text-info
                ">
                  预览
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <div className={segmentedControlClassName}>
                  <button
                    type="button"
                    aria-pressed={simplePromptTab === "prompt"}
                    className={`
                      ${segmentedButtonBaseClassName}
                      ${simplePromptTab === "prompt" ? `
                        bg-base-100 text-base-content shadow-sm
                      ` : `
                        bg-transparent text-base-content/60
                        hover:bg-base-100 hover:text-base-content
                      `}
                    `}
                    onClick={() => setSimplePromptTab("prompt")}
                  >
                    Base Prompt
                  </button>
                  <button
                    type="button"
                    aria-pressed={simplePromptTab === "negative"}
                    className={`
                      ${segmentedButtonBaseClassName}
                      ${simplePromptTab === "negative" ? `
                        bg-base-100 text-base-content shadow-sm
                      ` : `
                        bg-transparent text-base-content/60
                        hover:bg-base-100 hover:text-base-content
                      `}
                    `}
                    onClick={() => setSimplePromptTab("negative")}
                  >
                    Undesired Content
                  </button>
                </div>
              </div>

              <HighlightEmphasisTextarea
                highlightEnabled={highlightEmphasisEnabled}
                surfaceClassName={`${highlightPromptSurfaceClassName} mt-3 min-h-28`}
                contentClassName={`${highlightPromptContentClassName} min-h-28`}
                value={simplePromptTab === "prompt" ? simpleConverted?.prompt ?? "" : simpleConverted?.negativePrompt ?? ""}
                readOnly
                spellCheck={false}
              />

              {renderSimpleBaseImageSection()}

              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleRejectSimpleConverted}
                  icon={<XCircleIcon className="size-4" weight="fill" />}
                >
                  拒绝
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleAcceptSimpleConverted}
                  icon={<CheckCircleIcon className="size-4" weight="fill" />}
                >
                  接受
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className={`
          grid transition-all duration-300 ease-out
          ${isSimpleTagsEditor ? `grid-rows-[1fr] opacity-100` : `
            grid-rows-[0fr] opacity-0
          `}
        `}>
          <div className="min-h-0 overflow-hidden">
            <div className="flex flex-col gap-2">
              <div className={editorPanelClassName}>
                <div className="mb-3 flex items-center gap-2">
                  <div className={segmentedControlClassName}>
                    <button
                      type="button"
                      aria-pressed={simplePromptTab === "prompt"}
                      className={`
                        ${segmentedButtonBaseClassName}
                        ${simplePromptTab === "prompt" ? `
                          bg-base-100 text-base-content shadow-sm
                        ` : `
                          bg-transparent text-base-content/60
                          hover:bg-base-100 hover:text-base-content
                        `}
                      `}
                      onClick={() => setSimplePromptTab("prompt")}
                    >
                      Base Prompt
                    </button>
                    <button
                      type="button"
                      aria-pressed={simplePromptTab === "negative"}
                      className={`
                        ${segmentedButtonBaseClassName}
                        ${simplePromptTab === "negative" ? `
                          bg-base-100 text-base-content shadow-sm
                        ` : `
                          bg-transparent text-base-content/60
                          hover:bg-base-100 hover:text-base-content
                        `}
                      `}
                      onClick={() => setSimplePromptTab("negative")}
                    >
                      Undesired Content
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <HighlightEmphasisTextarea
                    highlightEnabled={highlightEmphasisEnabled}
                    surfaceClassName={highlightPromptSurfaceClassName}
                    contentClassName={highlightPromptContentClassName}
                    value={simplePromptTab === "prompt" ? simplePrompt : simpleNegativePrompt}
                    onChange={(e) => {
                      if (simplePromptTab === "prompt")
                        setSimplePrompt(e.target.value);
                      else
                        setSimpleNegativePrompt(e.target.value);
                    }}
                    onKeyDown={handleToggleLineCommentForSimpleTags}
                    spellCheck={false}
                  />
                  {hasSimpleTagsDraft
                    ? (
                        <button
                          type="button"
                          className={`
                            ${floatingInputActionClassName}
                            top-auto bottom-3
                          `}
                          onClick={handleReturnToSimpleText}
                        >
                          <ArrowCounterClockwise className="size-3.5" weight="regular" />
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
                      className="
                        flex items-center gap-2 rounded-md border
                        border-base-300 bg-base-100 pr-2
                        hover:border-info
                      "
                      onClick={() => setIsStylePickerOpen(true)}
                      title={`${preset.title}，点击继续添加画风`}
                      aria-label={`已选画风 ${preset.title}，点击继续添加画风`}
                    >
                      <div className="
                        w-10 aspect-square rounded-md bg-base-200
                        overflow-hidden flex items-center justify-center
                      ">
                        {preset.imageUrl
                          ? <MediaImage src={preset.imageUrl} alt={preset.title} className="
                            w-full h-full object-cover
                          " />
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
    </>
  );
});
