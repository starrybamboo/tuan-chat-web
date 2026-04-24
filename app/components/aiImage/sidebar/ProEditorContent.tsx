import type { AiImagePageController } from "@/components/aiImage/useAiImagePageController";
import {
  ArrowClockwise,
  CaretDownIcon,
  CaretUpIcon,
  CircleIcon,
  FileArrowUpIcon,
  GenderFemaleIcon,
  GenderMaleIcon,
  GearSixIcon,
  PlusIcon,
  SelectionPlusIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import type { Dispatch, KeyboardEvent as ReactKeyboardEvent, ReactNode, RefObject, SetStateAction } from "react";
import { memo } from "react";
import preciseReferenceIconSrc from "@/components/aiImage/assets/precise-reference.png";
import vibeTransferIconSrc from "@/components/aiImage/assets/vibe-transfer.png";
import { UC_PRESET_OPTIONS } from "@/components/aiImage/constants";
import { AiImageContextLimitMeter } from "@/components/aiImage/AiImageContextLimitMeter";
import { clampIntRange, clampRange, formatSliderValue, getV4CharGridCellByCenter, V4_CHAR_GRID_CELLS } from "@/components/aiImage/helpers";
import { HighlightEmphasisTextarea } from "@/components/aiImage/HighlightEmphasisTextarea";
import { NOVELAI_V45_CONTEXT_LIMIT } from "@/components/aiImage/novelaiV45TokenMeter";
import type { NovelAiV45ChannelSnapshot, NovelAiV45TokenSnapshot } from "@/components/aiImage/tokenMeter/snapshot";
import { ReferenceActionIcon } from "@/components/aiImage/ReferenceActionIcon";
import { ChevronDown } from "@/icons";

export interface ProEditorContentLocalProps {
  editorPanelClassName: string;
  segmentedControlClassName: string;
  segmentedButtonBaseClassName: string;
  highlightPromptSurfaceClassName: string;
  highlightPromptContentClassName: string;
  proPromptEditorPanelRef: RefObject<HTMLDivElement | null>;
  proPromptSettingsRef: RefObject<HTMLDivElement | null>;
  proPromptSettingsButtonRef: RefObject<HTMLButtonElement | null>;
  isProPromptSettingsOpen: boolean;
  setIsProPromptSettingsOpen: Dispatch<SetStateAction<boolean>>;
  proPromptSettingsPosition: { top: number; left: number };
  subtleSelectClassName: string;
  highlightEmphasisEnabled: boolean;
  setHighlightEmphasisEnabled: Dispatch<SetStateAction<boolean>>;
  proPromptTextareaRef: RefObject<HTMLTextAreaElement | null>;
  activeBaseMeter: NovelAiV45ChannelSnapshot["base"];
  activeChannelSnapshot: NovelAiV45ChannelSnapshot;
  proPromptFooterLabel?: string;
  proPromptFooterHint?: string;
  featureUploadActionClassName: string;
  renderProInfillSection: () => ReactNode;
  baseImagePanelClassName: string;
  baseImageHeaderClassName: string;
  baseImageControlGroupClassName: string;
  baseImageToggleButtonClassName: string;
  baseImageRangeClassName: string;
  baseImageActionButtonClassName: string;
  strength: number;
  setStrength: (value: number) => void;
  noise: number;
  setNoise: (value: number) => void;
  characterAddMenuRef: RefObject<HTMLDivElement | null>;
  isCharacterAddMenuOpen: boolean;
  setIsCharacterAddMenuOpen: Dispatch<SetStateAction<boolean>>;
  characterAddTriggerClassName: string;
  characterAddMenuPanelClassName: string;
  characterAddMenuItemClassName: string;
  characterCardClassName: string;
  characterCardHeaderActionClassName: string;
  characterCardTitleIconClassName: string;
  handleToggleLineCommentForProPrompt: (event: ReactKeyboardEvent<HTMLTextAreaElement>) => void;
  handleToggleLineCommentForV4Char: (event: ReactKeyboardEvent<HTMLTextAreaElement>, characterId: string) => void;
  highlightCharSurfaceClassName: string;
  highlightCharContentClassName: string;
  showCharacterPositionsGlobalSection: boolean;
  isCharacterPositionAiChoiceEnabled: boolean;
  characterPositionPickerState: { characterId: string; code: string } | null;
  characterPositionAssignments: Map<string, { characterId: string; index: number }>;
  handleOpenCharacterPositionPicker: (characterId: string, code: string) => void;
  handleSelectCharacterPositionCode: (code: string) => void;
  handleSaveCharacterPosition: (characterId: string) => void;
  characterPositionsSectionClassName: string;
  characterPositionsToggleBaseClassName: string;
  handleToggleCharacterPositionAiChoice: () => void;
  tokenSnapshot: NovelAiV45TokenSnapshot;
  characterPromptDescription: string;
  isBaseImageToolsOpen: boolean;
  setIsBaseImageToolsOpen: Dispatch<SetStateAction<boolean>>;
}

type ProEditorContentProps = {
  sidebarProps: AiImagePageController["sidebarProps"];
  local: ProEditorContentLocalProps;
};

export const ProEditorContent = memo(function ProEditorContent({
  sidebarProps,
  local,
}: ProEditorContentProps) {
  const {
    proPromptTab,
    setProPromptTab,
    prompt,
    negativePrompt,
    setPrompt,
    setNegativePrompt,
    qualityToggle,
    setQualityToggle,
    ucPreset,
    setUcPreset,
    sourceImageDataUrl,
    mode,
    noise,
    setNoise,
    handleOpenSourceImagePicker,
    handleOpenBaseImageInpaint,
    handleClearSourceImage,
    isBusy,
    proFeatureSections,
    isNAI4,
    handleAddV4Char,
    handleMoveV4Char,
    v4UseOrder,
    charPromptTabs,
    setCharPromptTabs,
    handleRemoveV4Char,
    v4Chars,
    handleUpdateV4Char,
    vibeTransferDescription,
    preciseReferenceDescription,
  } = sidebarProps;

  const {
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
  } = local;

  return (
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
                          onClick={() => setIsProPromptSettingsOpen((prev: boolean) => !prev)}
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
                      onKeyDown={handleToggleLineCommentForProPrompt}
                      spellCheck={false}
                    />
                    <div className="mt-3">
                      <AiImageContextLimitMeter
                        className="min-w-0"
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
                     {!sourceImageDataUrl
                      ? (
                          <div className="-mx-3 -mb-3 mt-3 flex items-center justify-between border-t border-[#2A3138] bg-[#161A1F] px-4 py-3">
                            <div className="text-[15px] text-base-content/58">
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
                        )
                      : null}
                    {mode === "infill" && sourceImageDataUrl
                      ? renderProInfillSection()
                      : null}
                    {mode === "img2img" && sourceImageDataUrl
                      ? (
                          <div className="-mx-3 -mb-3 mt-3 overflow-hidden border-t border-[#2A3138] bg-[#161A1F]">
                            <div className={baseImagePanelClassName}>
                                <img
                                  src={sourceImageDataUrl}
                                  alt="Base Img"
                                  className="absolute inset-0 h-full w-full object-cover opacity-28"
                              />
                              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,13,27,0.66)_0%,rgba(11,13,27,0.74)_100%)]" />
                              <div className={baseImageHeaderClassName}>
                                <div className="min-w-0">
                                  <div className="text-[15px] font-semibold leading-6 text-white">Image2Image</div>
                                  <div className="mt-1 text-[13px] leading-5 text-white/72">Transform your image.</div>
                                </div>
                                <div className={baseImageControlGroupClassName}>
                                  <div className="flex overflow-hidden rounded-md border border-[#2A3138] bg-[#161A1F]">
                                    <button
                                      type="button"
                                      className="inline-flex size-11 items-center justify-center text-white/80 transition hover:bg-white/6 hover:text-white focus:outline-none"
                                      aria-label="更换 Base Img"
                                      title="更换 Base Img"
                                      onClick={handleOpenSourceImagePicker}
                                    >
                                      <ArrowClockwise className="size-5" weight="bold" />
                                    </button>
                                    <span className="h-11 w-px bg-[#2A3138]" aria-hidden="true" />
                                    <button
                                      type="button"
                                      className="inline-flex size-11 items-center justify-center text-white/80 transition hover:bg-white/6 hover:text-white focus:outline-none"
                                      aria-label="移除 Base Img"
                                      title="移除 Base Img"
                                      onClick={handleClearSourceImage}
                                    >
                                      <TrashIcon className="size-5" weight="bold" />
                                    </button>
                                  </div>
                                  <button
                                    type="button"
                                    className={baseImageToggleButtonClassName}
                                    aria-label={isBaseImageToolsOpen ? "收起 Base Img 工具" : "展开 Base Img 工具"}
                                    title={isBaseImageToolsOpen ? "收起 Base Img 工具" : "展开 Base Img 工具"}
                                    onClick={() => setIsBaseImageToolsOpen((prev: boolean) => !prev)}
                                  >
                                    <ChevronDown className={`size-5 shrink-0 transition-transform ${isBaseImageToolsOpen ? "rotate-180" : ""}`} />
                                  </button>
                                </div>
                              </div>
                              {isBaseImageToolsOpen
                                ? (
                                    <div className="relative z-10 mt-4 space-y-4">
                                      <label className="block">
                                        <div className="flex items-center justify-between text-[13px] font-semibold leading-5 text-white">
                                          <span>Strength</span>
                                          <span>{formatSliderValue(strength)}</span>
                                        </div>
                                        <input
                                          type="range"
                                          min={0.01}
                                          max={1}
                                          step={0.01}
                                          value={strength}
                                          className={baseImageRangeClassName}
                                          onChange={event => setStrength(clampRange(Number(event.target.value), 0.01, 1, 0.7))}
                                        />
                                      </label>

                                      <label className="block">
                                        <div className="flex items-center justify-between text-[13px] font-semibold leading-5 text-white">
                                          <span>Noise</span>
                                          <span>{formatSliderValue(noise)}</span>
                                        </div>
                                        <input
                                          type="range"
                                          min={0}
                                          max={0.99}
                                          step={0.01}
                                          value={noise}
                                          className={baseImageRangeClassName}
                                          onChange={event => setNoise(clampRange(Number(event.target.value), 0, 0.99, 0.2))}
                                        />
                                      </label>

                                      <button
                                        type="button"
                                        className={baseImageActionButtonClassName}
                                        disabled={isBusy}
                                        onClick={() => void handleOpenBaseImageInpaint()}
                                      >
                                        <SelectionPlusIcon className="size-5" weight="bold" />
                                        <span>Inpaint Image</span>
                                      </button>
                                    </div>
                                  )
                                : null}
                            </div>
                          </div>
                        )
                      : null}
                  </div>

                  <div>
                    <div className="flex items-start justify-between gap-4 px-1 py-1">
                      <div className="min-w-0">
                        <div className="text-[15px] leading-6 text-base-content/86">Character Prompts</div>
                        <div className="mt-1 text-[13px] leading-5 text-base-content/58">{characterPromptDescription}</div>
                      </div>
                      <div ref={characterAddMenuRef} className="relative shrink-0">
                        <button
                          type="button"
                          className={`${characterAddTriggerClassName} ${isCharacterAddMenuOpen ? "invisible pointer-events-none" : ""}`}
                          aria-haspopup="menu"
                          aria-expanded={isCharacterAddMenuOpen}
                          onClick={() => setIsCharacterAddMenuOpen((prev: boolean) => !prev)}
                          disabled={!isNAI4}
                        >
                          <PlusIcon className="size-5" weight="bold" />
                          <span>Add Character</span>
                        </button>
                        {isCharacterAddMenuOpen
                          ? (
                              <div className={characterAddMenuPanelClassName} role="menu" aria-label="Add Character presets">
                                <button
                                  type="button"
                                  className={characterAddMenuItemClassName}
                                  role="menuitem"
                                  onClick={() => {
                                    setIsCharacterAddMenuOpen(false);
                                    handleAddV4Char({ defaultPrompt: "girl,", gender: "female" });
                                  }}
                                >
                                  <GenderFemaleIcon className="size-3.5 shrink-0 text-white/90" weight="regular" />
                                  <span>Female</span>
                                </button>
                                <button
                                  type="button"
                                  className={characterAddMenuItemClassName}
                                  role="menuitem"
                                  onClick={() => {
                                    setIsCharacterAddMenuOpen(false);
                                    handleAddV4Char({ defaultPrompt: "boy,", gender: "male" });
                                  }}
                                >
                                  <GenderMaleIcon className="size-3.5 shrink-0 text-white/90" weight="regular" />
                                  <span>Male</span>
                                </button>
                                <button
                                  type="button"
                                  className={characterAddMenuItemClassName}
                                  role="menuitem"
                                  onClick={() => {
                                    setIsCharacterAddMenuOpen(false);
                                    handleAddV4Char({ gender: "other" });
                                  }}
                                >
                                  <CircleIcon className="size-3.5 shrink-0 text-white/85" weight="regular" />
                                  <span>Other</span>
                                </button>
                              </div>
                            )
                          : null}
                      </div>
                    </div>
                    {proFeatureSections.characterPrompts
                      ? (isNAI4
                          ? (
                              <div className="mt-4 space-y-3">
                                {v4Chars.map((row, idx) => {
                                  const disabledUp = idx === 0 || !v4UseOrder;
                                  const disabledDown = idx === v4Chars.length - 1 || !v4UseOrder;
                                  const activeTab = charPromptTabs[row.id] || "prompt";
                                  const activeCharChannelSnapshot = activeTab === "prompt" ? tokenSnapshot.prompt : tokenSnapshot.negative;
                                  const activeCharMeter = activeCharChannelSnapshot.characters[row.id];
                                  const rowGender = row.gender || "other";
                                  const RowGenderIcon = rowGender === "female"
                                    ? GenderFemaleIcon
                                    : rowGender === "male"
                                      ? GenderMaleIcon
                                      : CircleIcon;
                                  const currentPositionCode = getV4CharGridCellByCenter(row.centerX, row.centerY).code;
                                  const isCharacterPositionPickerOpen = characterPositionPickerState?.characterId === row.id;
                                  const selectedPositionCode = isCharacterPositionPickerOpen ? characterPositionPickerState.code : currentPositionCode;
                                  return (
                                    <div key={row.id} className={characterCardClassName}>
                                      <div className={isCharacterPositionPickerOpen ? "invisible pointer-events-none select-none" : ""}>
                                        <div className="mb-3 flex items-center gap-2">
                                          <div className="flex min-w-0 items-center gap-1.5 text-white/92">
                                            <RowGenderIcon className={characterCardTitleIconClassName} weight="regular" />
                                            <div className="truncate text-[14px] font-medium leading-6">{`Character ${idx + 1}`}</div>
                                          </div>
                                          <div className="ml-auto flex items-center gap-0.5">
                                            <button
                                              type="button"
                                              className={characterCardHeaderActionClassName}
                                              onClick={() => handleMoveV4Char(row.id, -1)}
                                              disabled={disabledUp}
                                              aria-label="上移角色"
                                              title="上移角色"
                                            >
                                              <CaretUpIcon className="size-4" weight="bold" />
                                            </button>
                                            <button
                                              type="button"
                                              className={characterCardHeaderActionClassName}
                                              onClick={() => handleMoveV4Char(row.id, 1)}
                                              disabled={disabledDown}
                                              aria-label="下移角色"
                                              title="下移角色"
                                            >
                                              <CaretDownIcon className="size-4" weight="bold" />
                                            </button>
                                            <button
                                              type="button"
                                              className={characterCardHeaderActionClassName}
                                              onClick={() => handleRemoveV4Char(row.id)}
                                              aria-label="删除角色"
                                              title="删除角色"
                                            >
                                              <TrashIcon className="size-4" weight="bold" />
                                            </button>
                                          </div>
                                        </div>
                                        <div className="space-y-3">
                                          <div className={segmentedControlClassName}>
                                            <button
                                              type="button"
                                              className={`${segmentedButtonBaseClassName} ${activeTab === "prompt" ? "bg-white/10 text-white shadow-none" : "bg-transparent text-white/55 hover:bg-white/6 hover:text-white"}`}
                                              onClick={() => setCharPromptTabs(prev => ({ ...prev, [row.id]: "prompt" }))}
                                            >
                                              Prompt
                                            </button>
                                            <button
                                              type="button"
                                              className={`${segmentedButtonBaseClassName} ${activeTab === "negative" ? "bg-white/10 text-white shadow-none" : "bg-transparent text-white/55 hover:bg-white/6 hover:text-white"}`}
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
                                            onKeyDown={event => handleToggleLineCommentForV4Char(event, row.id)}
                                            placeholder=""
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
                                          {showCharacterPositionsGlobalSection
                                            ? (
                                                <div className="relative space-y-3">
                                                  <div className={`flex flex-wrap items-center gap-2 text-[12px] font-medium leading-5 text-white/90 ${isCharacterPositionAiChoiceEnabled || isCharacterPositionPickerOpen ? "invisible" : ""}`}>
                                                    <span className="text-white/72">Position</span>
                                                    {isCharacterPositionAiChoiceEnabled
                                                      ? <span className="text-white/92">AI's Choice</span>
                                                      : (
                                                          <>
                                                            <button
                                                              type="button"
                                                              className="inline-flex h-8 items-center rounded-md bg-white/10 px-3 text-[12px] font-semibold text-white transition hover:bg-white/14 focus:outline-none focus:ring-2 focus:ring-white/15"
                                                              onClick={() => handleOpenCharacterPositionPicker(row.id, currentPositionCode)}
                                                            >
                                                              Adjust
                                                            </button>
                                                            <span className="text-[20px] font-semibold leading-none tracking-[0.08em] text-white/96">{selectedPositionCode}</span>
                                                          </>
                                                        )}
                                                  </div>
                                                </div>
                                              )
                                            : null}
                                        </div>
                                      </div>

                                      {showCharacterPositionsGlobalSection && !isCharacterPositionAiChoiceEnabled && isCharacterPositionPickerOpen
                                        ? (
                                            <div className="absolute inset-0 z-20 flex flex-col rounded-2xl border border-[#2A3138] bg-[#161A1F] p-2.5 shadow-2xl">
                                              <div className="flex items-center gap-1.5 text-[11px] font-medium leading-5 text-white/90">
                                                <span className="text-white/72">Position</span>
                                                <span className="text-[16px] font-semibold leading-none tracking-[0.08em] text-white/96">{selectedPositionCode}</span>
                                              </div>
                                              <div className="mt-2 grid grid-cols-5 gap-1 rounded-md border border-[#2A3138] bg-[#161A1F] p-1">
                                                {V4_CHAR_GRID_CELLS.map((cell) => {
                                                  const occupant = characterPositionAssignments.get(cell.code);
                                                  const occupiedByOther = Boolean(occupant && occupant.characterId !== row.id);
                                                  const isSelected = selectedPositionCode === cell.code;
                                                  return (
                                                    <button
                                                      key={cell.code}
                                                      type="button"
                                                      className={`flex h-8 items-center justify-center rounded-md border text-[16px] font-semibold leading-none transition focus:outline-none ${
                                                        occupiedByOther
                                                          ? "cursor-not-allowed border-white/8 bg-transparent text-white/42"
                                                          : isSelected
                                                            ? "border-white/60 bg-white/18 text-white"
                                                            : "border-white/8 bg-transparent text-white/72 hover:border-white/20 hover:bg-white/6"
                                                      }`}
                                                      disabled={occupiedByOther}
                                                      aria-label={`选择位置 ${cell.code}`}
                                                      title={cell.code}
                                                      onClick={() => handleSelectCharacterPositionCode(cell.code)}
                                                    >
                                                      {occupant ? `${occupant.index + 1}` : ""}
                                                    </button>
                                                  );
                                                })}
                                              </div>
                                              <div className="mt-2 flex justify-center">
                                                <button
                                                  type="button"
                                                  className="inline-flex h-9 items-center rounded-md bg-white/10 px-4 text-[14px] font-semibold text-white transition hover:bg-white/14 focus:outline-none focus:ring-2 focus:ring-white/15"
                                                  onClick={() => handleSaveCharacterPosition(row.id)}
                                                >
                                                  Done
                                                </button>
                                              </div>
                                            </div>
                                          )
                                        : null}
                                    </div>
                                  );
                                })}
                                {showCharacterPositionsGlobalSection
                                  ? (
                                      <div className={characterPositionsSectionClassName}>
                                        <div className="min-w-0 text-[15px] font-medium leading-6 text-white/92">
                                          Character Positions (Global)
                                        </div>
                                        <button
                                          type="button"
                                          className={`${characterPositionsToggleBaseClassName} ${
                                            isCharacterPositionAiChoiceEnabled
                                              ? "border-[#F2E8A5] bg-[#F2E8A5] text-[#201C0F] hover:bg-[#E7DB87]"
                                              : "border-[#2F3841] bg-[#1B2026] text-white/74 hover:border-primary/40 hover:text-white"
                                          }`}
                                          aria-pressed={isCharacterPositionAiChoiceEnabled}
                                          onClick={handleToggleCharacterPositionAiChoice}
                                        >
                                          <span>AI's Choice</span>
                                        </button>
                                      </div>
                                    )
                                  : null}
                              </div>
                            )
                          : <div className="mt-4 text-sm opacity-60">当前模型不支持 Character Prompts。</div>)
                      : null}
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="rounded-md border border-[#2A3138] bg-[#161A1F] shadow-none">
                      <div className="flex items-center justify-between gap-4 px-4 py-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex size-8 shrink-0 items-center justify-center text-white/90" aria-hidden="true">
                            <ReferenceActionIcon className="size-6 shrink-0" src={vibeTransferIconSrc} />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[15px] font-semibold leading-6 text-white">Vibe Transfer</div>
                            <div className="mt-0.5 text-[13px] leading-5 text-white/58">{vibeTransferDescription}</div>
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
                      <div className="flex items-center justify-between gap-4 px-4 py-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex size-8 shrink-0 items-center justify-center text-white/90" aria-hidden="true">
                            <ReferenceActionIcon className="size-6 shrink-0" src={preciseReferenceIconSrc} />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[15px] font-semibold leading-6 text-white">Precise Reference</div>
                            <div className="mt-0.5 text-[13px] leading-5 text-white/58">{preciseReferenceDescription}</div>
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
                </div>
  );
});
