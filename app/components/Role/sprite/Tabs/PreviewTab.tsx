import type { RoleAvatar } from "api";
import { AvatarPreview } from "@/components/Role/Preview/AvatarPreview";
import { useState } from "react";

interface PreviewTabProps {
  /** 当前选中的头像数据 */
  currentAvatar: RoleAvatar | null;
  /** 角色名称 */
  characterName: string;
  /** 应用头像回调 */
  onAvatarChange?: (avatarUrl: string, avatarId: number) => void;
  /** 展示预览回调 */
  onPreview?: () => void;
  /** 应用完成后的回调 */
  onApply?: () => void;
}

/**
 * 预览 Tab 组件
 * 显示当前选中头像的立绘和头像预览
 */
export function PreviewTab({
  currentAvatar,
  characterName,
  onAvatarChange,
  onPreview,
  onApply,
}: PreviewTabProps) {
  // 是否显示立绘预览（true）还是头像预览（false）
  const [showSpritePreview, setShowSpritePreview] = useState(true);

  const spriteUrl = currentAvatar?.spriteUrl || null;
  const avatarUrl = currentAvatar?.avatarUrl || null;

  // 处理展示预览（同步外部索引并关闭弹窗）
  const handlePreview = () => {
    onPreview?.();
    onApply?.();
  };

  // 处理应用头像（真正更改角色头像）
  const handleApplyAvatar = () => {
    if (currentAvatar && onAvatarChange) {
      onAvatarChange(currentAvatar.avatarUrl || "", currentAvatar.avatarId || 0);
    }
    onApply?.();
  };

  return (
    <div className="h-full flex flex-col">
      {/* 预览标题和切换按钮 */}
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <h3 className="text-lg font-semibold">
          {showSpritePreview ? "立绘预览" : "头像预览"}
        </h3>
        <button
          type="button"
          className="btn btn-sm btn-ghost gap-2"
          onClick={() => setShowSpritePreview(!showSpritePreview)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
          </svg>
          切换至
          {showSpritePreview ? "头像" : "立绘"}
        </button>
      </div>

      {/* 预览内容区域 */}
      <div className="flex-1 min-h-0 relative bg-base-200 rounded-lg overflow-hidden">
        {showSpritePreview
          ? (
              spriteUrl
                ? (
                    <div className="w-full h-full flex items-center justify-center p-4">
                      <img
                        src={spriteUrl}
                        alt="立绘预览"
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  )
                : (
                    <div className="absolute inset-0 flex items-center justify-center text-base-content/50">
                      <div className="text-center">
                        <svg className="w-16 h-16 mx-auto mb-2 opacity-50" viewBox="0 0 24 24" fill="none">
                          <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                          <path d="M3 16l5-5 4 4 5-5 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <p>暂无立绘</p>
                      </div>
                    </div>
                  )
            )
          : (
              avatarUrl
                ? (
                    <div className="w-full h-full flex items-center justify-center p-4">
                      <AvatarPreview
                        currentAvatarUrl={avatarUrl}
                        characterName={characterName}
                        mode="full"
                        className="h-full"
                        hideTitle={true}
                      />
                    </div>
                  )
                : (
                    <div className="absolute inset-0 flex items-center justify-center text-base-content/50">
                      <div className="text-center">
                        <svg className="w-16 h-16 mx-auto mb-2 opacity-50" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                          <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2" />
                          <path d="M6 21v-1a6 6 0 0112 0v1" stroke="currentColor" strokeWidth="2" />
                        </svg>
                        <p>暂无头像</p>
                      </div>
                    </div>
                  )
            )}
      </div>

      {/* 操作按钮 */}
      <div className="mt-4 flex justify-end gap-2 flex-shrink-0">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handlePreview}
          disabled={!currentAvatar}
        >
          展示预览
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleApplyAvatar}
          disabled={!currentAvatar}
        >
          应用头像
        </button>
      </div>
    </div>
  );
}
