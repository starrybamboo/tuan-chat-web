import type { AiImagePageController } from "@/components/aiImage/useAiImagePageController";
import {
  ArrowCounterClockwise,
  CheckCircleIcon,
  SparkleIcon,
  XCircleIcon,
} from "@phosphor-icons/react";

type SimpleEditorContentProps = {
  sidebarProps: AiImagePageController["sidebarProps"];
  local: Record<string, any>;
};

export function SimpleEditorContent({
  sidebarProps,
  local,
}: SimpleEditorContentProps) {
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
    promptTextareaClassName,
    simplePromptTextareaClassName,
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
                              onKeyDown={handleToggleLineCommentForSimpleTags}
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
    </>
  );
}
