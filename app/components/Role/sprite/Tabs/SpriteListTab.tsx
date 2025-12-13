import type { RoleAvatar } from "api";
import { AvatarPreview } from "@/components/Role/Preview/AvatarPreview";
import { useEffect, useRef, useState } from "react";
import { SpriteListGrid } from "./SpriteListGrid";

interface SpriteListTabProps {
  /** 有立绘的头像列表 */
  spritesAvatars: RoleAvatar[];
  /** 当前选中的索引 */
  selectedIndex: number;
  /** 索引变更回调（内部切换） */
  onIndexChange: (index: number) => void;
  /** 角色名称 */
  characterName: string;
  /** 应用头像回调（真正更改角色头像） */
  onAvatarChange?: (avatarUrl: string, avatarId: number) => void;
  /** 展示预览回调（仅同步外部索引） */
  onPreview?: () => void;
  /** 应用完成后的回调（用于关闭弹窗等） */
  onApply?: () => void;
  /** 打开立绘校正面板的回调 */
  onOpenSpriteCorrection?: () => void;
  /** 打开头像校正面板的回调 */
  onOpenAvatarCorrection?: () => void;
  /** 打开情感设定面板的回调 */
  onOpenEmotionSettings?: () => void;
}

/**
 * 立绘列表 Tab 内容组件
 * 包含左侧立绘网格、右侧预览区域、底部操作按钮
 */
export function SpriteListTab({
  spritesAvatars,
  selectedIndex,
  onIndexChange,
  characterName,
  onAvatarChange,
  onPreview,
  onApply,
  onOpenSpriteCorrection,
  onOpenAvatarCorrection,
  onOpenEmotionSettings,
}: SpriteListTabProps) {
  // 是否显示立绘预览（true）还是头像预览（false）
  const [showSpritePreview, setShowSpritePreview] = useState(true);
  // 图片加载状态
  const [isImageLoading, setIsImageLoading] = useState(false);
  // 用于存储加载的立绘图片
  const spriteImgRef = useRef<HTMLImageElement | null>(null);

  // 当前选中的头像数据
  const currentAvatar = spritesAvatars[selectedIndex] || null;
  const spriteUrl = currentAvatar?.spriteUrl || null;
  const avatarUrl = currentAvatar?.avatarUrl || null;

  // 当 spriteUrl 变化时重置加载状态
  useEffect(() => {
    if (spriteUrl) {
      // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
      setIsImageLoading(true);
    }
  }, [spriteUrl]);

  // 加载立绘图片
  useEffect(() => {
    if (!spriteUrl) {
      spriteImgRef.current = null;
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      spriteImgRef.current = img;
      setIsImageLoading(false);
    };
    img.onerror = () => {
      spriteImgRef.current = null;
      setIsImageLoading(false);
    };
    img.src = spriteUrl;
  }, [spriteUrl]);

  // 处理展示预览（同步外部索引并关闭弹窗）
  const handlePreview = () => {
    onPreview?.();
    // 展示预览后关闭弹窗
    onApply?.();
  };

  // 处理应用头像（真正更改角色头像，调用接口）
  const handleApplyAvatar = () => {
    if (currentAvatar && onAvatarChange) {
      onAvatarChange(currentAvatar.avatarUrl || "", currentAvatar.avatarId || 0);
    }
    // 应用头像后关闭弹窗
    onApply?.();
  };

  // 预览区域内容渲染
  const renderPreviewContent = () => (
    <>
      {isImageLoading && spriteUrl && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <span className="loading loading-spinner loading-md"></span>
        </div>
      )}

      {showSpritePreview
        ? (
            spriteUrl
              ? (
                  <div className="w-full h-full flex items-center justify-center p-2 md:p-4">
                    <img
                      src={spriteUrl}
                      alt="立绘预览"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                )
              : (
                  <div className="absolute inset-0 flex items-center justify-center text-base-content/50">
                    <p>暂无立绘</p>
                  </div>
                )
          )
        : (
            avatarUrl
              ? (
                  <div className="w-full h-full flex items-center justify-center p-2 md:p-4">
                    <AvatarPreview
                      currentAvatarUrl={avatarUrl}
                      characterName={characterName}
                      mode="full"
                      className="h-full md:space-y-4"
                      hideTitle={true}
                    />
                  </div>
                )
              : (
                  <div className="absolute inset-0 flex items-center justify-center text-base-content/50">
                    <p>暂无头像</p>
                  </div>
                )
          )}
    </>
  );

  // 预览标题和切换按钮
  const renderPreviewHeader = () => (
    <div className="flex justify-between items-center mb-2 md:mb-4 flex-shrink-0">
      <h3 className="text-lg font-semibold">
        {showSpritePreview ? "立绘预览" : "头像预览"}
      </h3>
      <button
        type="button"
        className="btn btn-sm btn-ghost"
        onClick={() => setShowSpritePreview(!showSpritePreview)}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
        </svg>
        切换至
        {showSpritePreview ? "头像" : "立绘"}
      </button>
    </div>
  );

  // 操作按钮
  const renderActionButtons = () => (
    <div className="mt-2 md:mt-4 flex justify-end gap-2 flex-shrink-0">
      <div className="flex gap-2 items-center">
        <button
          type="button"
          className="btn btn-ghost btn-sm md:btn-sm"
          onClick={() => onOpenSpriteCorrection?.()}
          title="前往立绘校正"
        >
          立绘校正
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm md:btn-sm"
          onClick={() => onOpenAvatarCorrection?.()}
          title="前往头像校正"
        >
          头像校正
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm md:btn-sm"
          onClick={() => onOpenEmotionSettings?.()}
          title="前往情感设定"
        >
          情感设定
        </button>
      </div>
      <button
        type="button"
        className="btn btn-secondary btn-sm md:btn-md"
        onClick={handlePreview}
        disabled={!currentAvatar}
      >
        展示预览
      </button>
      <button
        type="button"
        className="btn btn-primary btn-sm md:btn-md"
        onClick={handleApplyAvatar}
        disabled={!currentAvatar}
      >
        应用头像
      </button>
    </div>
  );

  return (
    <div className="h-full flex flex-col md:flex-row gap-4">
      {/* 移动端：预览区域在上方，固定高度 */}
      <div className="md:hidden flex flex-col flex-shrink-0">
        {renderPreviewHeader()}
        <div className="h-48 relative bg-base-200 rounded-lg overflow-hidden flex-shrink-0">
          {renderPreviewContent()}
        </div>
        {renderActionButtons()}
      </div>

      {/* 立绘列表 - 移动端可滚动，桌面端固定宽度 */}
      <div className="flex-1 md:w-1/3 md:flex-none flex flex-col min-h-0 border-t md:border-t-0 border-base-300 pt-4 md:pt-0">
        <h3 className="text-lg font-semibold mb-4 flex-shrink-0">头像列表</h3>
        <div className="flex-1 min-h-0 overflow-auto">
          <SpriteListGrid
            avatars={spritesAvatars}
            selectedIndex={selectedIndex}
            onSelect={onIndexChange}
            showUpload={true}
            className="h-full"
          />
        </div>
      </div>

      {/* 桌面端：右侧预览区域 */}
      <div className="hidden md:flex flex-1 min-h-0 flex-col border-l border-base-300 pl-4">
        {renderPreviewHeader()}
        <div className="flex-1 min-h-0 relative bg-base-200 rounded-lg overflow-hidden">
          {renderPreviewContent()}
        </div>
        {renderActionButtons()}
      </div>
    </div>
  );
}
