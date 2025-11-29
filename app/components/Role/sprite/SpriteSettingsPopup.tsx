import type { RoleAvatar } from "api";

import { PopWindow } from "@/components/common/popWindow";
import { isMobileScreen } from "@/utils/getScreenSize";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MoodSettingsTab } from "./Tabs/MoodSettingsTab";
import { SpriteCropper } from "./Tabs/SpriteCropper";
import { SpriteListTab } from "./Tabs/SpriteListTab";

export type SettingsTab = "cropper" | "avatarCropper" | "spriteList" | "mood";

interface SpriteSettingsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: SettingsTab;

  // 立绘相关
  spritesAvatars: RoleAvatar[];
  roleAvatars: RoleAvatar[];
  currentSpriteIndex: number;
  characterName: string;

  // 外部同步回调（仅在特定操作时调用）
  onAvatarChange?: (avatarUrl: string, avatarId: number) => void;
  // 同步外部立绘索引
  onSpriteIndexChange?: (index: number) => void;
}

/**
 * 立绘设置弹窗组件
 * 包含四个 tab：立绘校正、头像校正、立绘列表、情感设定
 * 内部维护共享的立绘索引状态
 */
export function SpriteSettingsPopup({
  isOpen,
  onClose,
  defaultTab = "cropper",
  spritesAvatars,
  roleAvatars,
  currentSpriteIndex,
  characterName,
  onAvatarChange,
  onSpriteIndexChange,
}: SpriteSettingsPopupProps) {
  // 内部维护 tab 状态
  const [activeTab, setActiveTab] = useState<SettingsTab>(defaultTab);

  // ========== 内部共享的立绘索引 ==========
  // 使用外部传入的 currentSpriteIndex 作为初始值
  const [internalIndex, setInternalIndex] = useState(() => {
    // 确保初始索引在有效范围内
    if (spritesAvatars.length > 0) {
      return Math.max(0, Math.min(currentSpriteIndex, spritesAvatars.length - 1));
    }
    return 0;
  });

  // 记录上次的 isOpen 状态，用于检测弹窗打开
  const [wasOpen, setWasOpen] = useState(false);

  // 当前选中的立绘 URL
  const currentSpriteUrl = useMemo(() => {
    if (spritesAvatars.length > 0 && internalIndex < spritesAvatars.length) {
      return spritesAvatars[internalIndex]?.spriteUrl || null;
    }
    return null;
  }, [spritesAvatars, internalIndex]);

  // 内部索引变更处理
  const handleInternalIndexChange = useCallback((index: number) => {
    setInternalIndex(index);
  }, []);

  // 应用头像到外部（同步外部状态）
  const handleAvatarChange = useCallback((avatarUrl: string, avatarId: number) => {
    onAvatarChange?.(avatarUrl, avatarId);
    // 同步外部立绘索引
    onSpriteIndexChange?.(internalIndex);
  }, [onAvatarChange, onSpriteIndexChange, internalIndex]);

  // 展示预览（仅同步外部索引，不关闭弹窗）
  const handlePreview = useCallback(() => {
    onSpriteIndexChange?.(internalIndex);
  }, [onSpriteIndexChange, internalIndex]);

  // 应用完成后关闭弹窗
  const handleApply = useCallback(() => {
    onClose();
  }, [onClose]);

  // 当弹窗从关闭变为打开时，重置为 defaultTab 并同步外部索引
  useEffect(() => {
    if (isOpen && !wasOpen) {
      // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
      setActiveTab(defaultTab);
      // 同步外部索引到内部
      const validIndex = Math.max(0, Math.min(currentSpriteIndex, spritesAvatars.length - 1));
      // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
      setInternalIndex(validIndex);
    }
    // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
    setWasOpen(isOpen);
  }, [isOpen, wasOpen, defaultTab, currentSpriteIndex, spritesAvatars.length]);

  if (!isOpen)
    return null;

  return (
    <PopWindow
      isOpen={isOpen}
      onClose={onClose}
      fullScreen={isMobileScreen()}
    >
      <div className="flex flex-col md:flex-row w-full h-full md:w-[80vw] md:max-w-6xl md:h-[80vh]">
        {/* 左侧 Tab 列表 */}
        <div className="md:w-48 flex-shrink-0 border-b md:border-b-0 md:border-r border-base-300 bg-base-200/50">
          <nav className="flex md:flex-col p-3 gap-2">
            {/* 立绘校正 Tab */}
            <button
              type="button"
              onClick={() => setActiveTab("cropper")}
              className={`flex items-center justify-center md:justify-start gap-3 px-4 py-3 rounded-lg text-left transition-colors flex-1 md:flex-none ${
                activeTab === "cropper"
                  ? "bg-primary text-primary-content"
                  : "hover:bg-base-300"
              }`}
            >
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                <path d="M11 4H4v14a2 2 0 002 2h12a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" />
                <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z" stroke="currentColor" strokeWidth="2" />
              </svg>
              <span className="hidden md:inline">立绘校正</span>
            </button>

            {/* 头像校正 Tab */}
            <button
              type="button"
              onClick={() => setActiveTab("avatarCropper")}
              className={`flex items-center justify-center md:justify-start gap-3 px-4 py-3 rounded-lg text-left transition-colors flex-1 md:flex-none ${
                activeTab === "avatarCropper"
                  ? "bg-primary text-primary-content"
                  : "hover:bg-base-300"
              }`}
            >
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2" />
                <path d="M6 21v-1a6 6 0 0112 0v1" stroke="currentColor" strokeWidth="2" />
              </svg>
              <span className="hidden md:inline">头像校正</span>
            </button>

            {/* 立绘列表 Tab */}
            <button
              type="button"
              onClick={() => setActiveTab("spriteList")}
              className={`flex items-center justify-center md:justify-start gap-3 px-4 py-3 rounded-lg text-left transition-colors flex-1 md:flex-none ${
                activeTab === "spriteList"
                  ? "bg-primary text-primary-content"
                  : "hover:bg-base-300"
              }`}
            >
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
                <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
                <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
                <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
              </svg>
              <span className="hidden md:inline">立绘列表</span>
            </button>

            {/* 情感设定 Tab */}
            <button
              type="button"
              onClick={() => setActiveTab("mood")}
              className={`flex items-center justify-center md:justify-start gap-3 px-4 py-3 rounded-lg text-left transition-colors flex-1 md:flex-none ${
                activeTab === "mood"
                  ? "bg-primary text-primary-content"
                  : "hover:bg-base-300"
              }`}
            >
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" stroke="currentColor" strokeWidth="2" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 19v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M8 23h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="hidden md:inline">情感设定</span>
            </button>
          </nav>
        </div>

        {/* 右侧内容区域 - 固定尺寸 */}
        <div className="flex-1 overflow-auto p-4 min-h-0">
          {/* 立绘校正内容 */}
          {activeTab === "cropper" && (
            <div className="h-full">
              {currentSpriteUrl
                ? (
                    <SpriteCropper
                      spriteUrl={currentSpriteUrl}
                      roleAvatars={roleAvatars}
                      initialSpriteIndex={internalIndex}
                      characterName={characterName}
                      onClose={onClose}
                      cropMode="sprite"
                      onSpriteIndexChange={handleInternalIndexChange}
                    />
                  )
                : (
                    <div className="flex flex-col items-center justify-center h-full text-base-content/70">
                      <svg className="w-12 h-12 mb-2" viewBox="0 0 24 24" fill="none">
                        <path d="M11 4H4v14a2 2 0 002 2h12a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" />
                        <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z" stroke="currentColor" strokeWidth="2" />
                      </svg>
                      <p>当前没有可用的立绘进行校正</p>
                    </div>
                  )}
            </div>
          )}

          {/* 头像校正内容 */}
          {activeTab === "avatarCropper" && (
            <div className="h-full">
              {currentSpriteUrl
                ? (
                    <SpriteCropper
                      spriteUrl={currentSpriteUrl}
                      roleAvatars={roleAvatars}
                      initialSpriteIndex={internalIndex}
                      characterName={characterName}
                      onClose={onClose}
                      cropMode="avatar"
                      onSpriteIndexChange={handleInternalIndexChange}
                    />
                  )
                : (
                    <div className="flex flex-col items-center justify-center h-full text-base-content/70">
                      <svg className="w-12 h-12 mb-2" viewBox="0 0 24 24" fill="none">
                        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                        <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2" />
                        <path d="M6 21v-1a6 6 0 0112 0v1" stroke="currentColor" strokeWidth="2" />
                      </svg>
                      <p>当前没有可用的立绘进行头像裁剪</p>
                    </div>
                  )}
            </div>
          )}

          {/* 立绘列表内容 */}
          {activeTab === "spriteList" && (
            <SpriteListTab
              spritesAvatars={spritesAvatars}
              selectedIndex={internalIndex}
              onIndexChange={handleInternalIndexChange}
              characterName={characterName}
              onAvatarChange={handleAvatarChange}
              onPreview={handlePreview}
              onApply={handleApply}
            />
          )}

          {/* 情感设定内容 */}
          {activeTab === "mood" && (
            <MoodSettingsTab
              spritesAvatars={spritesAvatars}
              roleAvatars={roleAvatars}
              selectedIndex={internalIndex}
              onIndexChange={handleInternalIndexChange}
              onApply={handleApply}
            />
          )}
        </div>
      </div>
    </PopWindow>
  );
}
