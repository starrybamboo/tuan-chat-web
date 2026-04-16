import type { AiImagePageController } from "@/components/aiImage/useAiImagePageController";
import { useState } from "react";
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
  UC_PRESET_OPTIONS,
} from "@/components/aiImage/constants";
import {
  clamp01,
  clampIntRange,
  clampRange,
  clampToMultipleOf64,
  formatSliderValue,
  getNovelAiFreeOnlyMessage,
  modelLabel,
} from "@/components/aiImage/helpers";
import { ChevronDown } from "@/icons";
import { ProFeatureSection } from "@/components/aiImage/ProFeatureSection";

interface AiImageSidebarProps {
  sidebarProps: AiImagePageController["sidebarProps"];
}

const MODE_OPTIONS = [
  {
    value: "simple",
    label: "小白模式",
  },
  {
    value: "pro",
    label: "NovelAi模式",
  },
] as const;

export function AiImageSidebar({ sidebarProps }: AiImageSidebarProps) {
  const {
    activeResolutionPreset,
    baseImageDescription,
    canAddVibeReference,
    canGenerate,
    canTriggerProGenerate,
    cfgRescale,
    charPromptTabs,
    characterPromptDescription,
    dynamicThresholding,
    handleAddV4Char,
    handleClearSeed,
    handleClearSourceImage,
    handleClearStyles,
    handleCropToClosestValidSize,
    handleMoveV4Char,
    handleRemoveV4Char,
    handleRemoveVibeReference,
    handleResetCurrentImageSettings,
    handleSelectSimpleResolutionPreset,
    handleSimpleGenerateFromTags,
    handleSimpleGenerateFromText,
    handleSimpleHeightChange,
    handleSimpleWidthChange,
    handleSwapImageDimensions,
    handleUpdateV4Char,
    handleUpdateVibeReference,
    hasReferenceConflict,
    height,
    imageCount,
    imageCountLimit,
    importNotice,
    isDirectorToolsOpen,
    isNAI3,
    isNAI4,
    isPageImageDragOver,
    isSimpleTagEditorOpen,
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
    selectedStyleIds,
    selectedStyleNegativeTags,
    selectedStylePresets,
    selectedStyleTags,
    setCfgRescale,
    setCharPromptTabs,
    setDynamicThresholding,
    setHeight,
    setImageCount,
    setImportNotice,
    setIsSimpleTagEditorOpen,
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
    setSimpleConverted,
    setSimpleConvertedFromText,
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
    simpleConverted,
    simpleError,
    simpleGenerateLabel,
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
    ucPresetEnabled,
    uiMode,
    v4Chars,
    v4UseCoords,
    v4UseOrder,
    vibeReferenceInputRef,
    vibeTransferDescription,
    vibeTransferReferences,
    width,
  } = sidebarProps;

  const sideCardClassName = "card border-x-0 border-b border-t-0 border-[#2A3138] bg-[#161A1F] shadow-none";
  const editorPanelClassName = "rounded-2xl border border-[#2A3138] bg-[#161A1F] p-3 shadow-none";
  const segmentedControlClassName = "join rounded-xl bg-transparent p-0";
  const segmentedButtonBaseClassName = "btn btn-xs join-item border-0";
  const promptTextareaClassName = "textarea textarea-bordered min-h-36 w-full resize-none border-[#2A3138] bg-[#161A1F] text-base-content leading-7";
  const charTextareaClassName = "textarea textarea-bordered min-h-28 w-full resize-none border-[#2A3138] bg-[#161A1F] text-base-content leading-7";
  const subtleInputClassName = "input input-bordered input-sm border-[#2A3138] bg-[#161A1F] text-base-content";
  const subtleSelectClassName = "select select-bordered select-sm border-[#2A3138] bg-[#161A1F] text-base-content";
  const [isModeSelectorOpen, setIsModeSelectorOpen] = useState(false);
  const activeModeOption = MODE_OPTIONS.find(option => option.value === uiMode) ?? MODE_OPTIONS[0];

  function handleSelectMode(nextMode: typeof MODE_OPTIONS[number]["value"]) {
    setUiMode(nextMode);
    setIsModeSelectorOpen(false);
  }

  return (
    <div className={`${isDirectorToolsOpen ? "hidden" : "flex"} h-full min-h-0 w-full min-w-0 flex-col gap-0 overflow-auto bg-[#161A1F] p-0`}>
      <div className={sideCardClassName}>
        <div className="card-body p-4">
          <div className="w-full">
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-md border border-[#2A3138] bg-[#161A1F] px-3 py-3 text-left transition hover:border-primary/40 hover:bg-[#1B2026] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              aria-expanded={isModeSelectorOpen}
              onClick={() => setIsModeSelectorOpen(prev => !prev)}
            >
              <span className="font-medium text-base-content">{activeModeOption.label}</span>
              <ChevronDown className={`ml-3 size-4 shrink-0 text-base-content/60 transition-transform ${isModeSelectorOpen ? "rotate-180" : ""}`} />
            </button>

              {isModeSelectorOpen
                ? (
                    <div className="mt-2 w-full rounded-md border border-[#2A3138] bg-[#161A1F] p-2">
                      <div className="flex flex-col gap-2">
                        {MODE_OPTIONS.map(option => (
                          <button
                            key={option.value}
                            type="button"
                            className={`w-full rounded-md border px-3 py-3 text-left font-medium transition focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                              uiMode === option.value
                                ? "border-primary bg-primary/5 text-base-content"
                                : "border-transparent bg-[#161A1F] text-base-content/80 hover:border-[#2A3138] hover:bg-[#1B2026]"
                            }`}
                            onClick={() => handleSelectMode(option.value)}
                          >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              : null}
          </div>
        </div>
      </div>

      <div className={sideCardClassName}>
        <div className="card-body gap-3 p-4">
          {uiMode === "simple"
            ? (
                <div className="flex items-center gap-2">
                  <div className="font-medium">提示词 Prompt</div>
                </div>
              )
            : null}

          {uiMode === "simple"
            ? (
                <div className="flex flex-col gap-3">
                  <div className="join w-full">
                    <input
                      className="input input-bordered join-item flex-1"
                      value={simpleText}
                      onChange={(e) => {
                        const next = e.target.value;
                        setSimpleText(next);
                        if (simpleConverted) {
                          setSimpleConverted(null);
                          setSimpleConvertedFromText("");
                          setPrompt("");
                          setNegativePrompt("");
                          setV4Chars([]);
                          setIsSimpleTagEditorOpen(false);
                        }
                      }}
                      placeholder="例如：A girl with silver hair in a rainy cyberpunk street, cinematic lighting"
                    />
                    <button
                      type="button"
                      className={`btn btn-primary join-item ${canGenerate ? "" : "btn-disabled"}`}
                      disabled={!canGenerate}
                      onClick={() => void handleSimpleGenerateFromText()}
                    >
                      {simpleGenerateLabel}
                    </button>
                  </div>

                  {simpleError ? <div className="text-sm text-error">{simpleError}</div> : null}

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <div className="text-xs opacity-70">画风</div>
                      <div className="ml-auto flex items-center gap-2">
                        {selectedStyleIds.length
                          ? <div className="text-xs opacity-60">{`已选 ${selectedStyleIds.length} 个`}</div>
                          : <div className="text-xs opacity-60">未选择</div>}
                        <button type="button" className="btn btn-xs" onClick={() => setIsStylePickerOpen(true)}>
                          选择画风
                        </button>
                        {selectedStyleIds.length
                          ? <button type="button" className="btn btn-xs btn-ghost" onClick={handleClearStyles}>清空</button>
                          : null}
                      </div>
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
                                  title="点击继续选择画风"
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

                    {selectedStyleTags.length
                      ? (
                          <div className="text-xs opacity-70">
                            {`画风 tags：${selectedStyleTags.join(", ")}`}
                          </div>
                        )
                      : null}
                  </div>

                  {prompt.trim()
                    ? (
                        <details
                          className="collapse collapse-arrow border border-base-300 bg-base-100"
                          open={isSimpleTagEditorOpen}
                          onToggle={e => setIsSimpleTagEditorOpen((e.currentTarget as HTMLDetailsElement).open)}
                        >
                          <summary className="collapse-title pr-12 text-sm font-medium">
                            已转换 tags
                            <div className="mt-1 text-xs font-normal text-base-content/60">
                              默认折叠；需要微调时再展开编辑。
                            </div>
                          </summary>
                          <div className="collapse-content pt-0">
                            <div className={editorPanelClassName}>
                              <div className="mb-3 flex items-center gap-2">
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
                                <button
                                  type="button"
                                  className={`btn btn-xs btn-primary ml-auto ${canGenerate ? "" : "btn-disabled"}`}
                                  disabled={!canGenerate}
                                  onClick={() => void handleSimpleGenerateFromTags()}
                                >
                                  按 tag 出图
                                </button>
                              </div>
                              <textarea
                                className={promptTextareaClassName}
                                value={proPromptTab === "prompt" ? prompt : negativePrompt}
                                onChange={(e) => {
                                  if (proPromptTab === "prompt")
                                    setPrompt(e.target.value);
                                  else
                                    setNegativePrompt(e.target.value);
                                }}
                                placeholder={proPromptTab === "prompt" ? "自动转换后的 tags，可继续编辑" : "例如：lowres, bad anatomy"}
                              />
                              <div className="mt-4 h-1 rounded-full bg-base-200">
                                <div className="h-full w-8 rounded-full bg-primary" />
                              </div>
                              <div className="mt-3 flex items-center justify-between text-xs text-base-content/70">
                                <span>{proPromptTab === "prompt" ? "自动转换后的 tags，可继续编辑" : "负面 tags（可选）"}</span>
                                <span>
                                  {proPromptTab === "prompt"
                                    ? (selectedStyleTags.length ? `画风 tags ${selectedStyleTags.length} 个` : "可直接微调")
                                    : (selectedStyleNegativeTags.length ? `画风负面 tags ${selectedStyleNegativeTags.length} 个` : "未附加画风负面 tags")}
                                </span>
                              </div>
                              {proPromptTab === "negative" && selectedStyleNegativeTags.length
                                ? (
                                    <div className="mt-2 text-xs text-base-content/60">
                                      {`画风负面 tags：${selectedStyleNegativeTags.join(", ")}`}
                                    </div>
                                  )
                                : null}
                            </div>
                          </div>
                        </details>
                      )
                    : null}
                </div>
              )
            : (
                <div className="flex flex-col gap-3">
                  <div className={editorPanelClassName}>
                    <div className="mb-3 flex items-center gap-2">
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
                    </div>
                    <textarea
                      className={promptTextareaClassName}
                      value={proPromptTab === "prompt" ? prompt : negativePrompt}
                      onChange={(e) => {
                        if (proPromptTab === "prompt")
                          setPrompt(e.target.value);
                        else
                          setNegativePrompt(e.target.value);
                      }}
                      placeholder={proPromptTab === "prompt" ? "输入 Base Prompt" : "输入 Undesired Content"}
                    />
                    <div className="mt-4 h-1 rounded-full bg-base-200">
                      <div className="h-full w-8 rounded-full bg-primary" />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-base-content/70">
                      <span>{proPromptTab === "prompt" ? "Quality Tags Enabled" : "UC Preset Enabled"}</span>
                      {proPromptTab === "prompt"
                        ? <input type="checkbox" className="toggle toggle-sm" checked={qualityToggle} onChange={e => setQualityToggle(e.target.checked)} />
                        : (
                            <input
                              type="checkbox"
                              className="toggle toggle-sm"
                              checked={ucPresetEnabled}
                              onChange={(e) => {
                                if (e.target.checked)
                                  setUcPreset(prev => (prev === 2 ? 0 : prev));
                                else
                                  setUcPreset(2);
                              }}
                            />
                          )}
                    </div>
                    {proPromptTab === "negative" && ucPresetEnabled
                      ? (
                          <select className={`${subtleSelectClassName} mt-2 w-full`} value={ucPreset} onChange={e => setUcPreset(clampIntRange(Number(e.target.value), 0, 1, 0))}>
                            {UC_PRESET_OPTIONS.filter(option => option.value !== 2).map(option => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        )
                      : null}
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
                              className={`flex min-h-28 w-full items-center justify-center rounded-2xl border px-4 text-sm transition-colors ${isPageImageDragOver ? "border-primary bg-primary/10 text-primary" : "border-dashed border-base-300 bg-base-200/60 text-base-content/70 hover:border-primary hover:text-base-content"}`}
                              onClick={() => setImportNotice(getNovelAiFreeOnlyMessage("Base Img / img2img 已禁用；仍可拖入带 metadata 的 NovelAI 图片并只导入设置。"))}
                            >
                              {isPageImageDragOver ? "松开读取 metadata" : "拖入 / 粘贴 NovelAI 图片以导入设置"}
                            </button>
                          )}
                      {importNotice
                        ? <div className="rounded-2xl border border-info/25 bg-info/10 px-3 py-2 text-xs leading-5 text-info">{importNotice}</div>
                        : null}
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
                                    <textarea
                                      className={charTextareaClassName}
                                      value={activeTab === "prompt" ? row.prompt : row.negativePrompt}
                                      onChange={(e) => {
                                        if (activeTab === "prompt")
                                          handleUpdateV4Char(row.id, { prompt: e.target.value });
                                        else
                                          handleUpdateV4Char(row.id, { negativePrompt: e.target.value });
                                      }}
                                      placeholder={activeTab === "prompt" ? "Prompt" : "Undesired Content"}
                                    />
                                    <div className="h-1 rounded-full bg-base-200">
                                      <div className="h-full w-10 rounded-full bg-primary/80" />
                                    </div>
                                    {v4UseCoords
                                      ? (
                                          <div className="grid grid-cols-2 gap-2">
                                            <label className="form-control gap-1">
                                              <span className="label-text text-xs">Center X</span>
                                              <input className="input input-bordered input-sm" type="number" min="0" max="1" step="0.01" value={row.centerX} onChange={e => handleUpdateV4Char(row.id, { centerX: clamp01(Number(e.target.value), 0.5) })} />
                                            </label>
                                            <label className="form-control gap-1">
                                              <span className="label-text text-xs">Center Y</span>
                                              <input className="input input-bordered input-sm" type="number" min="0" max="1" step="0.01" value={row.centerY} onChange={e => handleUpdateV4Char(row.id, { centerY: clamp01(Number(e.target.value), 0.5) })} />
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
            <div className="font-medium">AI 绘图设置</div>
            <div className="ml-auto text-xs text-base-content/70">{modelLabel(model)}</div>
          </div>
          {uiMode === "simple"
            ? (
                <>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs text-base-content/70">
                      <span>画幅尺寸</span>
                      <span>{`${width} × ${height}`}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {RESOLUTION_PRESETS.map(preset => (
                        <button
                          key={preset.id}
                          type="button"
                          className={`btn btn-sm h-auto min-h-16 py-2 flex flex-col items-center justify-center gap-1.5 ${simpleResolutionSelection === preset.id ? "btn-primary" : "btn-outline"}`}
                          onClick={() => handleSelectSimpleResolutionPreset(preset.id)}
                        >
                          <div className={`border-2 border-current rounded-sm opacity-80 ${preset.id === "portrait" ? "w-4 h-6" : preset.id === "landscape" ? "w-6 h-4" : "w-5 h-5"}`}></div>
                          <span className="font-normal">{preset.label}</span>
                        </button>
                      ))}
                      <button
                        type="button"
                        className={`btn btn-sm h-auto min-h-16 py-2 flex flex-col items-center justify-center gap-1.5 ${simpleResolutionSelection === CUSTOM_RESOLUTION_ID ? "btn-primary" : "btn-outline"}`}
                        onClick={() => handleSelectSimpleResolutionPreset(CUSTOM_RESOLUTION_ID)}
                      >
                        <div className="w-5 h-5 border-2 border-current border-dashed rounded-sm opacity-80 relative flex items-center justify-center">
                          <span className="text-[10px] leading-none font-bold">+</span>
                        </div>
                        <span className="font-normal">自定义</span>
                      </button>
                    </div>
                  </div>

                  {simpleResolutionSelection === CUSTOM_RESOLUTION_ID
                    ? (
                        <div className="rounded-box border border-base-300 bg-base-200 p-4">
                          <div className="grid grid-cols-2 gap-3">
                            <label className="form-control">
                              <span className="label-text text-sm">宽 (Width)</span>
                              <input
                                className={subtleInputClassName}
                                type="number"
                                min={NOVELAI_DIMENSION_MIN}
                                step={NOVELAI_DIMENSION_STEP}
                                value={width}
                                onChange={e => handleSimpleWidthChange(Number(e.target.value))}
                              />
                            </label>
                            <label className="form-control">
                              <span className="label-text text-sm">高 (Height)</span>
                              <input
                                className={subtleInputClassName}
                                type="number"
                                min={NOVELAI_DIMENSION_MIN}
                                step={NOVELAI_DIMENSION_STEP}
                                value={height}
                                onChange={e => handleSimpleHeightChange(Number(e.target.value))}
                              />
                            </label>
                          </div>
                          <div className="mt-3 text-xs text-base-content/60">
                            自定义尺寸按 NovelAI 规则以 64px 为步进，且宽高都不能超过 1024。
                          </div>
                          <div className="mt-1 text-xs text-base-content/60">
                            {`当前面积：${simpleResolutionArea.toLocaleString()} px`}
                          </div>
                        </div>
                      )
                    : null}

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs text-base-content/70">
                      <span>种子 (Seed)</span>
                      <span>{seedIsRandom ? "随机模式" : "固定数值"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        className={`flex-1 ${subtleInputClassName}`}
                        type="number"
                        value={seedIsRandom ? "" : seed}
                        placeholder="留空自动使用随机种子"
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
                      >
                        转为随机
                      </button>
                    </div>
                    <div className="text-xs text-base-content/50">
                      填入具体种子数值后可复现生成结果。
                    </div>
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
                        className="input input-bordered input-sm"
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
                        className="input input-bordered input-sm"
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
                    当前已切到免费模式：尺寸按 64px 步进对齐，宽高都不超过 1024，`Number of Images` 固定为 1。
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

      {uiMode === "pro"
        ? (
            <div className="sticky bottom-0 z-10 border-t border-[#2A3138] bg-[#161A1F] p-4 backdrop-blur">
              <button
                type="button"
                className="btn btn-primary h-12 w-full justify-between px-4"
                disabled={!canTriggerProGenerate}
                onClick={() => void runGenerate()}
              >
                <span className="font-semibold">{proGenerateLabel}</span>
                <span className="badge badge-sm badge-outline px-2 py-1 text-xs font-semibold text-current">
                  {`${imageCount}x`}
                </span>
              </button>
            </div>
          )
        : null}

    </div>

  );
}
