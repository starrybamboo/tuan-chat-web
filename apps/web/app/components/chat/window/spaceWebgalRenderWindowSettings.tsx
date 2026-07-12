import type { ChangeEvent, Dispatch, RefObject, SetStateAction } from "react";

import { lazy, Suspense } from "react";

import type { VoiceboxQwenCustomVoiceId } from "@/tts/engines/voicebox/api";
import type { RealtimeGameConfig } from "@/webGAL/realtimeRenderer";

import { Button } from "@/components/common/Button";
import { SelectInput, Switch, TextInput } from "@/components/common/FormField";
import { StateView } from "@/components/common/StateView";
import { Tabs } from "@/components/common/Tabs";
import { VOICEBOX_QWEN_CUSTOM_VOICES } from "@/tts/engines/voicebox/api";

import type { CollapsibleSectionKey, SpaceWebgalSettingsTab } from "./spaceWebgalRenderWindowParts";

import { SpaceWebgalGameConfigSection } from "./spaceWebgalGameConfigSection";
import { SpaceWebgalRoomContentSettingsPanel } from "./spaceWebgalRenderWindowPanels";
import { SectionCollapseToggle } from "./spaceWebgalRenderWindowParts";

const LazyWorkflowWindow = lazy(() => import("@/components/chat/window/workflowWindow"));

function WorkflowLazyFallback() {
  return <StateView loading title="正在加载流程图..." className="h-40 py-0" />;
}

type SpaceWebgalRenderWindowSettingsProps = {
  settingsTab: SpaceWebgalSettingsTab;
  sectionExpandedMap: Record<CollapsibleSectionKey, boolean>;
  isAllSectionsExpanded: boolean;
  isAllSectionsCollapsed: boolean;
  isTtsConfigVisible: boolean;
  autoFigureEnabled: boolean;
  miniAvatarEnabled: boolean;
  ttsEnabled: boolean;
  ttsApiInput: string;
  ttsVoiceId: VoiceboxQwenCustomVoiceId;
  ttsInstructInput: string;
  gameConfig: RealtimeGameConfig;
  descriptionInput: string;
  packageNameInput: string;
  figureDefaultEnterDurationInput: string;
  figureDefaultExitDurationInput: string;
  typingSoundIntervalInput: string;
  typingSoundPunctuationPauseInput: string;
  typingSoundDetailExpanded: boolean;
  isTitleImageUploading: boolean;
  isStartupLogoUploading: boolean;
  isTypingSoundSeUploading: boolean;
  roomContentAlertThreshold: number;
  roomContentAlertThresholdInput: string;
  titleImageFileInputRef: RefObject<HTMLInputElement | null>;
  startupLogoFileInputRef: RefObject<HTMLInputElement | null>;
  typingSoundSeFileInputRef: RefObject<HTMLInputElement | null>;
  onSettingsTabChange: (tab: SpaceWebgalSettingsTab) => void;
  onExpandAllSections: () => void;
  onCollapseAllSections: () => void;
  onToggleSection: (key: CollapsibleSectionKey) => void;
  setAutoFigureEnabled: (value: boolean) => void;
  setMiniAvatarEnabled: (value: boolean) => void;
  setTtsEnabled: (value: boolean) => void;
  setTtsApiInput: (value: string) => void;
  setTtsVoiceId: (value: VoiceboxQwenCustomVoiceId) => void;
  setTtsInstructInput: (value: string) => void;
  setGameConfig: (config: Partial<RealtimeGameConfig>) => void;
  setDescriptionInput: (value: string) => void;
  setPackageNameInput: (value: string) => void;
  setFigureDefaultEnterDurationInput: (value: string) => void;
  setFigureDefaultExitDurationInput: (value: string) => void;
  setTypingSoundIntervalInput: (value: string) => void;
  setTypingSoundPunctuationPauseInput: (value: string) => void;
  setTypingSoundDetailExpanded: Dispatch<SetStateAction<boolean>>;
  setRoomContentAlertThreshold: (value: number) => void;
  setRoomContentAlertThresholdInput: (value: string) => void;
  handleSaveTtsApi: () => void;
  handleSaveDescription: () => void;
  handleSavePackageName: () => void;
  handleSaveFigureDefaultEnterDuration: () => void;
  handleSaveFigureDefaultExitDuration: () => void;
  handleSaveTypingSoundInterval: () => void;
  handleSaveTypingSoundPunctuationPause: () => void;
  handlePickTypingSoundSe: () => void;
  handleTypingSoundSeFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handleClearTypingSoundSe: () => void;
  handlePickTitleImage: () => void;
  handleTitleImageFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handleClearTitleImage: () => void;
  handlePickStartupLogo: () => void;
  handleStartupLogoFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handleClearStartupLogo: () => void;
  handleSaveRoomContentAlertThreshold: () => void;
}

export function SpaceWebgalRenderWindowSettings({
  settingsTab,
  sectionExpandedMap,
  isAllSectionsExpanded,
  isAllSectionsCollapsed,
  isTtsConfigVisible,
  autoFigureEnabled,
  miniAvatarEnabled,
  ttsEnabled,
  ttsApiInput,
  ttsVoiceId,
  ttsInstructInput,
  gameConfig,
  descriptionInput,
  packageNameInput,
  figureDefaultEnterDurationInput,
  figureDefaultExitDurationInput,
  typingSoundIntervalInput,
  typingSoundPunctuationPauseInput,
  typingSoundDetailExpanded,
  isTitleImageUploading,
  isStartupLogoUploading,
  isTypingSoundSeUploading,
  roomContentAlertThreshold,
  roomContentAlertThresholdInput,
  titleImageFileInputRef,
  startupLogoFileInputRef,
  typingSoundSeFileInputRef,
  onSettingsTabChange,
  onExpandAllSections,
  onCollapseAllSections,
  onToggleSection,
  setAutoFigureEnabled,
  setMiniAvatarEnabled,
  setTtsEnabled,
  setTtsApiInput,
  setTtsVoiceId,
  setTtsInstructInput,
  setGameConfig,
  setDescriptionInput,
  setPackageNameInput,
  setFigureDefaultEnterDurationInput,
  setFigureDefaultExitDurationInput,
  setTypingSoundIntervalInput,
  setTypingSoundPunctuationPauseInput,
  setTypingSoundDetailExpanded,
  setRoomContentAlertThreshold,
  setRoomContentAlertThresholdInput,
  handleSaveTtsApi,
  handleSaveDescription,
  handleSavePackageName,
  handleSaveFigureDefaultEnterDuration,
  handleSaveFigureDefaultExitDuration,
  handleSaveTypingSoundInterval,
  handleSaveTypingSoundPunctuationPause,
  handlePickTypingSoundSe,
  handleTypingSoundSeFileChange,
  handleClearTypingSoundSe,
  handlePickTitleImage,
  handleTitleImageFileChange,
  handleClearTitleImage,
  handlePickStartupLogo,
  handleStartupLogoFileChange,
  handleClearStartupLogo,
  handleSaveRoomContentAlertThreshold,
}: SpaceWebgalRenderWindowSettingsProps) {
  return (
    <>
      <Tabs
        value={settingsTab}
        options={[
          { value: "render", label: "渲染设置", controls: "space-webgal-render-settings-panel" },
          { value: "roomContent", label: "房间内容", controls: "space-webgal-room-content-settings-panel" },
        ]}
        onValueChange={onSettingsTabChange}
        ariaLabel="WebGAL 设置"
        className="w-fit"
      />

      {settingsTab === "render"
        ? (
            <div id="space-webgal-render-settings-panel" role="tabpanel">
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="xs"
                  disabled={isAllSectionsExpanded}
                  title={isAllSectionsExpanded ? "所有段落已展开" : "展开所有段落"}
                  onClick={onExpandAllSections}
                >
                  一键展开
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  disabled={isAllSectionsCollapsed}
                  title={isAllSectionsCollapsed ? "所有段落已折叠" : "折叠所有段落"}
                  onClick={onCollapseAllSections}
                >
                  一键折叠
                </Button>
              </div>

              <div className={`
                rounded-lg border border-base-300 bg-base-100
                ${sectionExpandedMap.workflowLayer ? `p-4` : `px-4 py-2`}
              `}>
                <div className={`flex items-center justify-between gap-2${sectionExpandedMap.workflowLayer ? " mb-3" : ""}`.trim()}>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="text-sm font-semibold shrink-0">流程图</div>
                    <span
                      className="text-xs text-base-content/60 truncate"
                      title="修改流程图请打开全屏修改"
                    >
                      （修改流程图请打开全屏修改）
                    </span>
                  </div>
                  <SectionCollapseToggle
                    expanded={sectionExpandedMap.workflowLayer}
                    label="流程图"
                    onClick={() => onToggleSection("workflowLayer")}
                  />
                </div>
                {sectionExpandedMap.workflowLayer && (
                  <div className="
                    rounded-md border border-base-300 p-2 overflow-x-auto overscroll-x-none
                  ">
                    <Suspense fallback={<WorkflowLazyFallback />}>
                      <LazyWorkflowWindow />
                    </Suspense>
                  </div>
                )}
              </div>

              <div className={`
                rounded-lg border border-base-300 bg-base-100
                ${sectionExpandedMap.renderLayer ? `p-4` : `px-4 py-2`}
              `}>
                <div className={`flex items-center justify-between gap-2${sectionExpandedMap.renderLayer ? " mb-3" : ""}`.trim()}>
                  <div className="text-sm font-semibold">渲染表现层</div>
                  <SectionCollapseToggle
                    expanded={sectionExpandedMap.renderLayer}
                    label="渲染表现层"
                    onClick={() => onToggleSection("renderLayer")}
                  />
                </div>
                {sectionExpandedMap.renderLayer && (
                  <div className="
                    grid gap-2
                    md:grid-cols-2
                  ">
                    <label className="
                      flex items-center justify-between gap-2 rounded-md border
                      border-base-300 px-3 py-2
                    ">
                      <span className="text-sm">自动填充立绘</span>
                      <Switch
                        density="compact"
                        checked={autoFigureEnabled}
                        onChange={event => setAutoFigureEnabled(event.target.checked)}
                      />
                    </label>
                    <label className="
                      flex items-center justify-between gap-2 rounded-md border
                      border-base-300 px-3 py-2
                    ">
                      <span className="text-sm">小头像</span>
                      <Switch
                        density="compact"
                        checked={miniAvatarEnabled}
                        onChange={event => setMiniAvatarEnabled(event.target.checked)}
                      />
                    </label>
                  </div>
                )}
              </div>

              <div className={`
                rounded-lg border border-base-300 bg-base-100
                ${isTtsConfigVisible ? `p-4` : `px-4 py-2`}
              `}>
                <div className={`flex flex-wrap items-center justify-between gap-2${isTtsConfigVisible ? " mb-3" : ""}`.trim()}>
                  <div className="text-sm font-semibold">TTS 配音层</div>
                  <div className="flex items-center gap-2">
                    <label className="
                      flex items-center gap-2 rounded-md border border-base-300
                      px-2 py-1 text-xs
                    ">
                      <span>AI 配音</span>
                      <Switch
                        density="compact"
                        checked={ttsEnabled}
                        onChange={event => setTtsEnabled(event.target.checked)}
                      />
                    </label>
                    <SectionCollapseToggle
                      expanded={sectionExpandedMap.ttsLayer}
                      label="TTS 配音层"
                      onClick={() => onToggleSection("ttsLayer")}
                    />
                  </div>
                </div>
                {isTtsConfigVisible && (
                  <div className="space-y-3 rounded-md border border-base-300 px-3 py-3">
                    <div>
                      <div className="mb-2 text-sm">VoiceBox API 地址</div>
                      <div className="flex gap-2">
                        <TextInput
                          density="compact"
                          type="url"
                          inputMode="url"
                          autoComplete="off"
                          aria-label="VoiceBox API 地址"
                          className="
                            h-8 min-w-0 flex-1 rounded-md border border-base-300 bg-base-100 px-2 text-sm
                            transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20
                          "
                          placeholder="http://127.0.0.1:17493"
                          value={ttsApiInput}
                          onChange={event => setTtsApiInput(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.nativeEvent.isComposing)
                              return;
                            if (event.key === "Enter") {
                              handleSaveTtsApi();
                            }
                          }}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSaveTtsApi}
                        >
                          保存
                        </Button>
                      </div>
                    </div>
                    <label className="block">
                      <span className="mb-2 block text-sm">Qwen CustomVoice 0.6B 音色</span>
                      <SelectInput
                        density="compact"
                        aria-label="Qwen CustomVoice 0.6B 音色"
                        className="
                          h-8 w-full rounded-md border border-base-300 bg-base-100 px-2 text-sm
                          transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20
                        "
                        value={ttsVoiceId}
                        onChange={event => setTtsVoiceId(event.target.value as VoiceboxQwenCustomVoiceId)}
                      >
                        {VOICEBOX_QWEN_CUSTOM_VOICES.map(voice => (
                          <option key={voice.id} value={voice.id}>{voice.label}</option>
                        ))}
                      </SelectInput>
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm">风格指令</span>
                      <TextInput
                        density="compact"
                        type="text"
                        autoComplete="off"
                        maxLength={500}
                        aria-label="VoiceBox 风格指令"
                        className="
                          h-8 w-full rounded-md border border-base-300 bg-base-100 px-2 text-sm
                          transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20
                        "
                        placeholder="例如：温柔、自然地讲述"
                        value={ttsInstructInput}
                        onChange={event => setTtsInstructInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.nativeEvent.isComposing)
                            return;
                          if (event.key === "Enter") {
                            handleSaveTtsApi();
                          }
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>

              <SpaceWebgalGameConfigSection
                expanded={sectionExpandedMap.gameLayer}
                gameConfig={gameConfig}
                descriptionInput={descriptionInput}
                packageNameInput={packageNameInput}
                figureDefaultEnterDurationInput={figureDefaultEnterDurationInput}
                figureDefaultExitDurationInput={figureDefaultExitDurationInput}
                typingSoundIntervalInput={typingSoundIntervalInput}
                typingSoundPunctuationPauseInput={typingSoundPunctuationPauseInput}
                typingSoundDetailExpanded={typingSoundDetailExpanded}
                isTitleImageUploading={isTitleImageUploading}
                isStartupLogoUploading={isStartupLogoUploading}
                isTypingSoundSeUploading={isTypingSoundSeUploading}
                titleImageFileInputRef={titleImageFileInputRef}
                startupLogoFileInputRef={startupLogoFileInputRef}
                typingSoundSeFileInputRef={typingSoundSeFileInputRef}
                onToggle={() => onToggleSection("gameLayer")}
                setGameConfig={setGameConfig}
                setDescriptionInput={setDescriptionInput}
                setPackageNameInput={setPackageNameInput}
                setFigureDefaultEnterDurationInput={setFigureDefaultEnterDurationInput}
                setFigureDefaultExitDurationInput={setFigureDefaultExitDurationInput}
                setTypingSoundIntervalInput={setTypingSoundIntervalInput}
                setTypingSoundPunctuationPauseInput={setTypingSoundPunctuationPauseInput}
                setTypingSoundDetailExpanded={setTypingSoundDetailExpanded}
                handleSaveDescription={handleSaveDescription}
                handleSavePackageName={handleSavePackageName}
                handleSaveFigureDefaultEnterDuration={handleSaveFigureDefaultEnterDuration}
                handleSaveFigureDefaultExitDuration={handleSaveFigureDefaultExitDuration}
                handleSaveTypingSoundInterval={handleSaveTypingSoundInterval}
                handleSaveTypingSoundPunctuationPause={handleSaveTypingSoundPunctuationPause}
                handlePickTypingSoundSe={handlePickTypingSoundSe}
                handleTypingSoundSeFileChange={handleTypingSoundSeFileChange}
                handleClearTypingSoundSe={handleClearTypingSoundSe}
                handlePickTitleImage={handlePickTitleImage}
                handleTitleImageFileChange={handleTitleImageFileChange}
                handleClearTitleImage={handleClearTitleImage}
                handlePickStartupLogo={handlePickStartupLogo}
                handleStartupLogoFileChange={handleStartupLogoFileChange}
                handleClearStartupLogo={handleClearStartupLogo}
              />
            </div>
          )
        : (
            <div id="space-webgal-room-content-settings-panel" role="tabpanel">
              <SpaceWebgalRoomContentSettingsPanel
                roomContentAlertThreshold={roomContentAlertThreshold}
                roomContentAlertThresholdInput={roomContentAlertThresholdInput}
                setRoomContentAlertThreshold={setRoomContentAlertThreshold}
                setRoomContentAlertThresholdInput={setRoomContentAlertThresholdInput}
                handleSaveRoomContentAlertThreshold={handleSaveRoomContentAlertThreshold}
              />
            </div>
          )}
    </>
  );
}
