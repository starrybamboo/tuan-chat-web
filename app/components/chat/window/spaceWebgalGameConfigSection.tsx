import type { ChangeEvent, Dispatch, RefObject, SetStateAction } from "react";
import type { RealtimeGameConfig } from "@/webGAL/realtimeRenderer";

import {
  BASE_TEMPLATE_OPTIONS,
  ConfigHelpButton,
  ConfigItemLabel,
  DEFAULT_LANGUAGE_OPTIONS,
  SectionCollapseToggle,
} from "./spaceWebgalRenderWindowParts";
import { mediaFileUrl } from "@/utils/mediaUrl";

interface SpaceWebgalGameConfigSectionProps {
  expanded: boolean;
  gameConfig: RealtimeGameConfig;
  descriptionInput: string;
  packageNameInput: string;
  typingSoundIntervalInput: string;
  typingSoundPunctuationPauseInput: string;
  typingSoundDetailExpanded: boolean;
  isTitleImageUploading: boolean;
  isStartupLogoUploading: boolean;
  isTypingSoundSeUploading: boolean;
  titleImageFileInputRef: RefObject<HTMLInputElement | null>;
  startupLogoFileInputRef: RefObject<HTMLInputElement | null>;
  typingSoundSeFileInputRef: RefObject<HTMLInputElement | null>;
  onToggle: () => void;
  setGameConfig: (config: Partial<RealtimeGameConfig>) => void;
  setDescriptionInput: (value: string) => void;
  setPackageNameInput: (value: string) => void;
  setTypingSoundIntervalInput: (value: string) => void;
  setTypingSoundPunctuationPauseInput: (value: string) => void;
  setTypingSoundDetailExpanded: Dispatch<SetStateAction<boolean>>;
  handleSaveDescription: () => void;
  handleSavePackageName: () => void;
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
}

export function SpaceWebgalGameConfigSection({
  expanded,
  gameConfig,
  descriptionInput,
  packageNameInput,
  typingSoundIntervalInput,
  typingSoundPunctuationPauseInput,
  typingSoundDetailExpanded,
  isTitleImageUploading,
  isStartupLogoUploading,
  isTypingSoundSeUploading,
  titleImageFileInputRef,
  startupLogoFileInputRef,
  typingSoundSeFileInputRef,
  onToggle,
  setGameConfig,
  setDescriptionInput,
  setPackageNameInput,
  setTypingSoundIntervalInput,
  setTypingSoundPunctuationPauseInput,
  setTypingSoundDetailExpanded,
  handleSaveDescription,
  handleSavePackageName,
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
}: SpaceWebgalGameConfigSectionProps) {
  const typingSoundSeSrc = mediaFileUrl(gameConfig.typingSoundSeFileId, gameConfig.typingSoundSeMediaType || "audio", "original")
    || gameConfig.typingSoundSeUrl;
  const titleImagePreviewSrc = mediaFileUrl(gameConfig.titleImageFileId, "image", "medium")
    || gameConfig.titleImageUrl;
  const startupLogoPreviewSrc = mediaFileUrl(gameConfig.startupLogoFileId, "image", "medium")
    || gameConfig.startupLogoUrl;
  const hasTypingSoundSe = Boolean(typingSoundSeSrc);
  const hasTitleImage = Boolean(titleImagePreviewSrc);
  const hasStartupLogo = Boolean(startupLogoPreviewSrc);

  return (
    <div className={`rounded-lg border border-base-300 bg-base-100 ${expanded ? "p-4" : "px-4 py-2"}`}>
      <div className={`flex items-center justify-between gap-2${expanded ? " mb-3" : ""}`}>
        <div className="text-sm font-semibold">WebGAL 游戏层（config.txt）</div>
        <SectionCollapseToggle
          expanded={expanded}
          label="WebGAL 游戏层"
          onClick={onToggle}
        />
      </div>
      {expanded && (
        <div className="space-y-3">
          <div className="grid gap-2 md:grid-cols-2">
            <label className="flex items-center justify-between gap-2 rounded-md border border-base-300 px-3 py-2">
              <ConfigItemLabel
                label="未设置标题背景图时使用群聊头像"
                description="如果你没有上传标题背景图，就自动用群聊头像当首页背景。"
              />
              <input
                type="checkbox"
                className="toggle toggle-sm toggle-primary"
                checked={gameConfig.coverFromRoomAvatarEnabled}
                onChange={event => setGameConfig({ coverFromRoomAvatarEnabled: event.target.checked })}
              />
            </label>
            <label className="flex items-center justify-between gap-2 rounded-md border border-base-300 px-3 py-2">
              <ConfigItemLabel
                label="未设置启动图时使用群聊头像"
                description="如果你没有上传启动图，就自动用群聊头像当启动图。"
              />
              <input
                type="checkbox"
                className="toggle toggle-sm toggle-primary"
                checked={gameConfig.startupLogoFromRoomAvatarEnabled}
                onChange={event => setGameConfig({ startupLogoFromRoomAvatarEnabled: event.target.checked })}
              />
            </label>
            <label className="flex items-center justify-between gap-2 rounded-md border border-base-300 px-3 py-2">
              <ConfigItemLabel
                label="游戏图标使用群聊头像"
                description="让游戏图标和群聊头像保持一致。"
              />
              <input
                type="checkbox"
                className="toggle toggle-sm toggle-primary"
                checked={gameConfig.gameIconFromRoomAvatarEnabled}
                onChange={event => setGameConfig({ gameIconFromRoomAvatarEnabled: event.target.checked })}
              />
            </label>
            <label className="flex items-center justify-between gap-2 rounded-md border border-base-300 px-3 py-2">
              <ConfigItemLabel
                label="游戏名使用空间名+ID"
                description="自动用“空间名 + 编号”当游戏名，避免重名。"
              />
              <input
                type="checkbox"
                className="toggle toggle-sm toggle-primary"
                checked={gameConfig.gameNameFromRoomNameEnabled}
                onChange={event => setGameConfig({ gameNameFromRoomNameEnabled: event.target.checked })}
              />
            </label>
            <label className="flex items-center justify-between gap-2 rounded-md border border-base-300 px-3 py-2">
              <ConfigItemLabel
                label="启用紧急回避"
                description="需要快速遮住画面时可以一键隐藏当前内容。"
              />
              <input
                type="checkbox"
                className="toggle toggle-sm toggle-primary"
                checked={gameConfig.showPanicEnabled}
                onChange={event => setGameConfig({ showPanicEnabled: event.target.checked })}
              />
            </label>
            <label className="flex items-center justify-between gap-2 rounded-md border border-base-300 px-3 py-2">
              <ConfigItemLabel
                label="启用鉴赏模式"
                description="开启后可在菜单里查看已看过的内容，方便回顾。"
              />
              <input
                type="checkbox"
                className="toggle toggle-sm toggle-primary"
                checked={gameConfig.enableAppreciation}
                onChange={event => setGameConfig({ enableAppreciation: event.target.checked })}
              />
            </label>
            <label className="flex items-center justify-between gap-2 rounded-md border border-base-300 px-3 py-2">
              <ConfigItemLabel
                label="允许打开完整设置"
                description="允许玩家在 WebGAL 里打开完整设置页；关闭后会隐藏设置入口。"
              />
              <input
                type="checkbox"
                className="toggle toggle-sm toggle-primary"
                checked={gameConfig.allowOpenFullSettings}
                onChange={event => setGameConfig({ allowOpenFullSettings: event.target.checked })}
              />
            </label>
            <label className="flex items-center justify-between gap-2 rounded-md border border-base-300 px-3 py-2">
              <ConfigItemLabel
                label="角色发言聚焦"
                description="命中发言目标时，其他立绘会自动压暗；当前角色保持原亮度。这是开发期配置，不会在游戏内提供给玩家切换。"
              />
              <input
                type="checkbox"
                className="toggle toggle-sm toggle-primary"
                checked={gameConfig.speakerFocusEnabled}
                onChange={event => setGameConfig({ speakerFocusEnabled: event.target.checked })}
              />
            </label>
            <div className={`rounded-md border border-base-300 md:col-span-2 ${typingSoundDetailExpanded ? "p-3" : "px-3 py-2"}`}>
              <div className={`flex flex-wrap items-center justify-between gap-2${typingSoundDetailExpanded ? " mb-3" : ""}`}>
                <ConfigItemLabel
                  label="启用打字音"
                  description="文字一个个出现时会播放轻微按键音，展开后可以细调频率和音效。"
                />
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 rounded-md border border-base-300 px-2 py-1 text-xs">
                    <span>打字音</span>
                    <input
                      type="checkbox"
                      className="toggle toggle-xs toggle-primary"
                      checked={gameConfig.typingSoundEnabled}
                      onChange={event => setGameConfig({ typingSoundEnabled: event.target.checked })}
                    />
                  </label>
                  <SectionCollapseToggle
                    expanded={typingSoundDetailExpanded}
                    label="打字音细化设置"
                    onClick={() => setTypingSoundDetailExpanded(prev => !prev)}
                  />
                </div>
              </div>
              {typingSoundDetailExpanded && (
                <div className="rounded-md border border-base-300 px-3 py-2">
                  <div className="grid gap-2 md:grid-cols-2">
                    <div>
                      <div className="mb-1 text-xs text-base-content/70">每隔多少个字播放一次</div>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min={0.1}
                          max={20}
                          step={0.1}
                          className="input input-bordered input-sm flex-1"
                          value={typingSoundIntervalInput}
                          onChange={event => setTypingSoundIntervalInput(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              handleSaveTypingSoundInterval();
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          onClick={handleSaveTypingSoundInterval}
                        >
                          保存
                        </button>
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 text-xs text-base-content/70">标点额外停顿（毫秒）</div>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min={0}
                          max={5000}
                          step={10}
                          className="input input-bordered input-sm flex-1"
                          value={typingSoundPunctuationPauseInput}
                          onChange={event => setTypingSoundPunctuationPauseInput(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              handleSaveTypingSoundPunctuationPause();
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          onClick={handleSaveTypingSoundPunctuationPause}
                        >
                          保存
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="mb-1 text-xs text-base-content/70">打字音效文件</div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        onClick={handlePickTypingSoundSe}
                        disabled={isTypingSoundSeUploading}
                      >
                        {isTypingSoundSeUploading ? "上传中..." : "上传音频"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        onClick={handleClearTypingSoundSe}
                        disabled={isTypingSoundSeUploading || !hasTypingSoundSe}
                      >
                        恢复默认
                      </button>
                      <span className="text-xs text-base-content/70">
                        {hasTypingSoundSe ? "已设置自定义打字音" : "使用默认打字音"}
                      </span>
                    </div>
                    {hasTypingSoundSe && (
                      <audio className="mt-2 h-8 w-full max-w-sm" controls preload="none" src={typingSoundSeSrc} />
                    )}
                    <input
                      ref={typingSoundSeFileInputRef}
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={handleTypingSoundSeFileChange}
                    />
                  </div>
                </div>
              )}
            </div>
            <label className="flex items-center justify-between gap-2 rounded-md border border-base-300 px-3 py-2">
              <ConfigItemLabel
                label="默认语言"
                description="玩家第一次打开游戏时默认显示的语言。"
              />
              <select
                className="select select-bordered select-sm w-40"
                value={gameConfig.defaultLanguage}
                onChange={event => setGameConfig({ defaultLanguage: event.target.value as typeof gameConfig.defaultLanguage })}
              >
                {DEFAULT_LANGUAGE_OPTIONS.map(option => (
                  <option key={option.value || "empty"} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center justify-between gap-2 rounded-md border border-base-300 px-3 py-2">
              <ConfigItemLabel
                label="WebGAL模板"
                description="none 为内置默认模板；black 会覆盖为 WebGAL Black。"
              />
              <select
                className="select select-bordered select-sm w-40"
                value={gameConfig.baseTemplate}
                onChange={event => setGameConfig({ baseTemplate: event.target.value as typeof gameConfig.baseTemplate })}
              >
                {BASE_TEMPLATE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <div className="rounded-md border border-base-300 px-3 py-2">
              <div className="mb-2 flex items-center gap-1 text-sm">
                <span>游戏简介（Description）</span>
                <ConfigHelpButton label="游戏简介（Description）" description="给玩家看的简介文字，会显示在游戏信息里。" />
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input input-bordered input-sm flex-1"
                  placeholder="留空则不设定"
                  value={descriptionInput}
                  onChange={event => setDescriptionInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      handleSaveDescription();
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={handleSaveDescription}
                >
                  保存
                </button>
              </div>
            </div>

            <div className="rounded-md border border-base-300 px-3 py-2">
              <div className="mb-2 flex items-center gap-1 text-sm">
                <span>游戏包名（Package_name）</span>
                <ConfigHelpButton label="游戏包名（Package_name）" description="打包发布时使用的应用标识；不确定可先保持当前值。" />
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input input-bordered input-sm flex-1"
                  placeholder="如 com.openwebgal.demo"
                  value={packageNameInput}
                  onChange={event => setPackageNameInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      handleSavePackageName();
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={handleSavePackageName}
                >
                  保存
                </button>
              </div>
            </div>

            <div className="rounded-md border border-base-300 px-3 py-2 md:col-span-2">
              <div className="mb-2 flex items-center gap-1 text-sm">
                <span>标题背景图（Title_img）</span>
                <ConfigHelpButton
                  label="标题背景图（Title_img）"
                  description="进入游戏首页时看到的大背景图。"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={handlePickTitleImage}
                  disabled={isTitleImageUploading}
                >
                  {isTitleImageUploading ? "上传中..." : "上传图片"}
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={handleClearTitleImage}
                  disabled={isTitleImageUploading || !hasTitleImage}
                >
                  清空
                </button>
                <span className="text-xs text-base-content/70">
                  {hasTitleImage ? "已设置标题背景图" : "未设置标题背景图（可用上方头像兜底）"}
                </span>
              </div>
              {hasTitleImage && (
                <div className="mt-2 h-20 w-36 overflow-hidden rounded-md border border-base-300">
                  <img
                    src={titleImagePreviewSrc}
                    alt="标题背景图预览"
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
              )}
              <input
                ref={titleImageFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleTitleImageFileChange}
              />
            </div>

            <div className="rounded-md border border-base-300 px-3 py-2 md:col-span-2">
              <div className="mb-2 flex items-center gap-1 text-sm">
                <span>启动图（Game_Logo）</span>
                <ConfigHelpButton
                  label="启动图（Game_Logo）"
                  description="游戏刚启动时显示的图片。"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={handlePickStartupLogo}
                  disabled={isStartupLogoUploading}
                >
                  {isStartupLogoUploading ? "上传中..." : "上传图片"}
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={handleClearStartupLogo}
                  disabled={isStartupLogoUploading || !hasStartupLogo}
                >
                  清空
                </button>
                <span className="text-xs text-base-content/70">
                  {hasStartupLogo ? "已设置启动图" : "未设置启动图（可用上方头像兜底）"}
                </span>
              </div>
              {hasStartupLogo && (
                <div className="mt-2 h-20 w-36 overflow-hidden rounded-md border border-base-300">
                  <img
                    src={startupLogoPreviewSrc}
                    alt="启动图预览"
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
              )}
              <input
                ref={startupLogoFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleStartupLogoFileChange}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
