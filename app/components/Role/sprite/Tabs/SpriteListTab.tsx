import type { RoleAvatar } from "api";
import type { Role } from "../../types";
import { useUploadAvatarMutation } from "@/../api/queryHooks";
import { AvatarPreview } from "@/components/Role/Preview/AvatarPreview";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { tuanchat } from "api/instance";
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
  /** 角色信息（用于删除逻辑） */
  role?: Role;
  /** 所有头像列表（包括没有立绘的） */
  allAvatars?: RoleAvatar[];
  /** 头像选择回调 */
  onAvatarSelect?: (avatarId: number) => void;
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
  role,
  allAvatars,
  onAvatarSelect,
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

  // Avatar upload mutation
  const queryClient = useQueryClient();
  const { mutate: uploadAvatar } = useUploadAvatarMutation();

  // Notification state for upload feedback
  const [uploadNotification, setUploadNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Auto-dismiss notification after 3 seconds
  useEffect(() => {
    if (uploadNotification) {
      const timer = setTimeout(() => {
        setUploadNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [uploadNotification]);

  // Update avatar title mutation for first avatar auto-naming
  const { mutate: updateAvatarTitle } = useMutation({
    mutationKey: ["updateAvatarTitle"],
    mutationFn: async ({ avatarId, title }: { avatarId: number; title: string }) => {
      const avatarsForUpdate = allAvatars || spritesAvatars;
      const targetAvatar = avatarsForUpdate.find((a: RoleAvatar) => a.avatarId === avatarId);
      if (!targetAvatar) {
        console.error("未找到要更新的头像");
        return;
      }

      const res = await tuanchat.avatarController.updateRoleAvatar({
        ...targetAvatar,
        avatarTitle: {
          ...targetAvatar.avatarTitle,
          label: title,
        },
      });

      if (res.success) {
        console.warn("更新头像名称成功");
        queryClient.invalidateQueries({
          queryKey: ["getRoleAvatars", role?.id],
          exact: true,
        });
      }
      else {
        console.error("更新头像名称失败");
      }
    },
  });

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

  // Handle avatar upload
  const handleAvatarUpload = async (data: any) => {
    if (!role?.id) {
      setUploadNotification({
        type: "error",
        message: "角色信息缺失，无法上传头像",
      });
      return;
    }

    try {
      // Upload avatar with transform data
      uploadAvatar(
        { ...data, roleId: role.id },
        {
          onSuccess: async () => {
            try {
              // Refresh avatar list
              await queryClient.invalidateQueries({
                queryKey: ["getRoleAvatars", role.id],
                exact: true,
              });

              // Get updated avatar list
              const list = await tuanchat.avatarController.getRoleAvatars(role.id);
              const avatars = list?.data ?? [];

              // If this is the first avatar, auto-name it "默认"
              if (avatars.length === 1) {
                const firstAvatar = avatars[0];
                const currentLabel = firstAvatar?.avatarTitle?.label;

                // Only set default name if no label exists
                if (!currentLabel || currentLabel.trim() === "") {
                  updateAvatarTitle(
                    { avatarId: firstAvatar.avatarId!, title: "默认" },
                  );
                }
              }

              setUploadNotification({
                type: "success",
                message: "头像上传成功",
              });
            }
            catch (error) {
              console.error("首次头像自动命名失败", error);
              setUploadNotification({
                type: "success",
                message: "头像上传成功",
              });
            }
          },
          onError: (error) => {
            console.error("头像上传失败:", error);
            setUploadNotification({
              type: "error",
              message: "头像上传失败，请重试",
            });
          },
        },
      );
    }
    catch (error) {
      console.error("头像上传处理失败:", error);
      setUploadNotification({
        type: "error",
        message: "头像上传失败，请重试",
      });
    }
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
    <div className="mt-2 md:mt-4 flex justify-between gap-2 flex-shrink-0">
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
      <div className="flex gap-2">
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
    </div>
  );

  return (
    <>
      {/* Upload notification toast */}
      {uploadNotification && (
        <div className="toast toast-top toast-center z-50">
          <div className={`alert ${uploadNotification.type === "success" ? "alert-success" : "alert-error"} shadow-lg flex flex-row items-center gap-2`}>
            {uploadNotification.type === "success"
              ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )
              : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
            <span>{uploadNotification.message}</span>
          </div>
        </div>
      )}

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
          <div className="flex-1 min-h-0 overflow-auto">
            <SpriteListGrid
              avatars={spritesAvatars}
              selectedIndex={selectedIndex}
              onSelect={onIndexChange}
              mode="manage"
              className="h-full"
              onUpload={handleAvatarUpload}
              fileName={role?.id ? `avatar-${role.id}-${Date.now()}` : undefined}
              role={role}
              onAvatarChange={onAvatarChange}
              onAvatarSelect={onAvatarSelect}
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
    </>
  );
}
