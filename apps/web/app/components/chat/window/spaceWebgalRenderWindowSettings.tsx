import type { ChangeEvent, Dispatch, RefObject, SetStateAction } from "react";

import { lazy, Suspense } from "react";

import type { RealtimeGameConfig } from "@/webGAL/realtimeRenderer";

import type { CollapsibleSectionKey, SpaceWebgalSettingsTab } from "./spaceWebgalRenderWindowParts";

import { SpaceWebgalGameConfigSection } from "./spaceWebgalGameConfigSection";
import { SpaceWebgalRoomContentSettingsPanel } from "./spaceWebgalRenderWindowPanels";
import { SectionCollapseToggle } from "./spaceWebgalRenderWindowParts";

const LazyWorkflowWindow = lazy(() => import("@/components/chat/window/workflowWindow"));

function WorkflowLazyFallback() {
  return (
    <div className="
      flex h-40 items-center justify-center text-sm text-base-content/60
    ">
      <span className="loading loading-spinner loading-sm" />
      <span className="ml-2">正在加载流程图...</span>
    </div>
  );
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
      <div role="tablist" className="tabs tabs-boxed w-fit">
        <button
          type="button"
          role="tab"
          aria-selected={settingsTab === "render"}
          aria-controls="space-webgal-render-settings-panel"
          className={`
            tab
            ${settingsTab === "render" ? "tab-active" : ""}
          `}
          onClick={() => onSettingsTabChange("render")}
        >
          渲染设置
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={settingsTab === "roomContent"}
          aria-controls="space-webgal-room-content-settings-panel"
          className={`
            tab
            ${settingsTab === "roomContent" ? "tab-active" : ""}
          `}
          onClick={() => onSettingsTabChange("roomContent")}
        >
          房间内容
        </button>
      </div>

      {settingsTab === "render"
        ? (
            <div id="space-webgal-render-settings-panel" role="tabpanel">
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  className="btn btn-xs btn-outline"
                  disabled={isAllSectionsExpanded}
                  title={isAllSectionsExpanded ? "所有段落已展开" : "展开所有段落"}
                  onClick={onExpandAllSections}
                >
                  一键展开
                </button>
                <button
                  type="button"
                  className="btn btn-xs btn-outline"
                  disabled={isAllSectionsCollapsed}
                  title={isAllSectionsCollapsed ? "所有段落已折叠" : "折叠所有段落"}
                  onClick={onCollapseAllSections}
                >
                  一键折叠
                </button>
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
                    rounded-md border border-base-300 p-2 overflow-x-auto
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
                      <input
                        type="checkbox"
                        className="toggle toggle-sm toggle-info"
                        checked={autoFigureEnabled}
                        onChange={event => setAutoFigureEnabled(event.target.checked)}
                      />
                    </label>
                    <label className="
                      flex items-center justify-between gap-2 rounded-md border
                      border-base-300 px-3 py-2
                    ">
                      <span className="text-sm">小头像</span>
                      <input
                        type="checkbox"
                        className="toggle toggle-sm toggle-info"
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
                      <input
                        type="checkbox"
                        className="toggle toggle-xs toggle-info"
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
                  <div className="rounded-md border border-base-300 px-3 py-2">
                    <div className="text-sm mb-2">TTS API 地址</div>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        inputMode="url"
                        autoComplete="off"
                        aria-label="TTS API 地址"
                        className="input input-bordered input-sm flex-1"
                        placeholder="http://localhost:9000"
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
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        onClick={handleSaveTtsApi}
                      >
                        保存
                      </button>
                    </div>
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
