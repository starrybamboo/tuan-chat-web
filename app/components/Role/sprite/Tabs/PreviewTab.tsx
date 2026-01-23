import type { RoleAvatar } from "api";
import type { Transform } from "../TransformControl";
import { useUpdateRoleAvatarMutation } from "api/hooks/RoleAndAvatarHooks";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { AvatarPreview } from "@/components/Role/Preview/AvatarPreview";
import { RenderPreview } from "@/components/Role/Preview/RenderPreview";
import { CharacterCopper } from "../../RoleInfoCard/AvatarUploadCropper";
import { isMobileScreen } from "@/utils/getScreenSize";
import { withOssResizeProcess } from "@/utils/ossImageProcess";
import { getEffectiveSpriteUrl, parseTransformFromAvatar } from "../utils";

interface RenderTransform {
  scale: number;
  positionX: number;
  positionY: number;
  alpha: number;
  rotation: number;
}

type ReplaceAvatarPayload = {
  avatarUrl: string;
  spriteUrl: string;
  originUrl?: string;
  transform?: Transform;
};

const DEFAULT_TRANSFORM: RenderTransform = {
  scale: 1,
  positionX: 0,
  positionY: 0,
  alpha: 1,
  rotation: 0,
};

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
  // 预览模式: 'sprite' | 'avatar' | 'render'
  const [previewMode, setPreviewMode] = useState<"sprite" | "avatar" | "render">("sprite");

  const spriteUrl = currentAvatar ? (getEffectiveSpriteUrl(currentAvatar) || null) : null;
  const avatarUrl = currentAvatar?.avatarUrl || null;

  const MAX_PREVIEW_WIDTH = 1440;

  // Sprite 预览使用 OSS resize，减少首次加载体积（最大宽度限制为 1440）
  const spritePreviewUrl = useMemo(() => {
    if (!spriteUrl)
      return null;

    const desiredWidth = isMobileScreen() ? 960 : 1440;
    const width = Math.min(MAX_PREVIEW_WIDTH, desiredWidth);
    return withOssResizeProcess(spriteUrl, width);
  }, [spriteUrl]);

  // Render 预览也使用 resize 后的 URL（同样限制到 1440，便于做对比实验）
  const renderSpriteRequestUrl = useMemo(() => {
    if (!spriteUrl)
      return null;
    return withOssResizeProcess(spriteUrl, MAX_PREVIEW_WIDTH);
  }, [spriteUrl]);

  // Canvas ref for render preview
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const computedTransform = useMemo<RenderTransform>(() => {
    return currentAvatar
      ? (parseTransformFromAvatar(currentAvatar) as RenderTransform)
      : DEFAULT_TRANSFORM;
  }, [currentAvatar]);
  const roleIdForMutation = currentAvatar?.roleId ?? 0;
  const { mutateAsync: updateAvatar, isPending: isReplacing } = useUpdateRoleAvatarMutation(roleIdForMutation);
  const replaceStateKey = useMemo(
    () => `roleAvatarReplacePreview-${currentAvatar?.avatarId ?? "unknown"}`,
    [currentAvatar?.avatarId],
  );

  // Render preview should avoid showing: old image + new transform (or vice versa).
  // So we only update the transform after the new sprite image is ready to draw.
  const [renderTransform, setRenderTransform] = useState<RenderTransform>(() => computedTransform);
  const [renderSpriteUrl, setRenderSpriteUrl] = useState<string | null>(() => spriteUrl);
  const pendingRenderImageRef = useRef<HTMLImageElement | null>(null);
  const pendingRenderSpriteUrlRef = useRef<string | null>(null);
  const [renderDrawVersion, setRenderDrawVersion] = useState(0);

  // 图片加载缓存：同一 URL 只加载一次（含 in-flight 复用）
  const imageLoadCacheRef = useRef<Map<string, Promise<HTMLImageElement>>>(new Map());

  // Load sprite image for render preview.
  // Important: switching avatars quickly can cause async image loads to resolve out of order.
  // We cancel stale loads and only commit (transform + draw) for the latest selection.
  useEffect(() => {
    if (previewMode !== "render")
      return;

    // No sprite: reset to computed transform and clear pending work.
    if (!renderSpriteRequestUrl) {
      pendingRenderImageRef.current = null;
      pendingRenderSpriteUrlRef.current = null;
      setRenderSpriteUrl(null);
      setRenderTransform(computedTransform);
      return;
    }

    let active = true;
    let rafId: number | null = null;
    const targetSpriteUrl = renderSpriteRequestUrl;
    const targetTransform = computedTransform;

    const loadImageCached = (url: string) => {
      const cached = imageLoadCacheRef.current.get(url);
      if (cached)
        return cached;

      const promise = new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";

        img.onload = () => {
          resolve(img);
        };

        img.onerror = (error) => {
          reject(error);
        };

        img.src = url;
      }).catch((error) => {
        // 失败的条目不缓存，方便下次重试
        imageLoadCacheRef.current.delete(url);
        throw error;
      });

      imageLoadCacheRef.current.set(url, promise);
      return promise;
    };

    const tryStartLoad = (attemptsLeft: number) => {
      if (!active)
        return;

      const canvas = previewCanvasRef.current;
      if (!canvas) {
        if (attemptsLeft <= 0) {
          console.error("Canvas not found - RenderPreview may not have created it yet");
          return;
        }
        rafId = requestAnimationFrame(() => tryStartLoad(attemptsLeft - 1));
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        console.error("Failed to get canvas context");
        return;
      }

      loadImageCached(targetSpriteUrl).then((img) => {
        if (!active)
          return;
        // Stash the image and commit the transform first.
        // Then we draw in a layout effect (paint-safe) to avoid showing a mismatched frame.
        pendingRenderImageRef.current = img;
        pendingRenderSpriteUrlRef.current = targetSpriteUrl;
        setRenderTransform(targetTransform);
        setRenderDrawVersion(v => v + 1);
      }).catch((error) => {
        if (!active)
          return;
        console.error("Failed to load sprite image:", error, targetSpriteUrl);
      });
    };

    // Wait a few frames for RenderPreview to mount the canvas.
    tryStartLoad(10);

    return () => {
      active = false;
      if (rafId != null)
        cancelAnimationFrame(rafId);
    };
  }, [previewMode, renderSpriteRequestUrl, computedTransform]);

  // Draw pending render sprite *after* renderTransform has been committed (layout effect runs before paint).
  useLayoutEffect(() => {
    if (previewMode !== "render")
      return;

    const pendingUrl = pendingRenderSpriteUrlRef.current;
    const pendingImg = pendingRenderImageRef.current;
    if (!pendingUrl || !pendingImg)
      return;

    // Only draw if this pending image matches the current selection.
    if (pendingUrl !== renderSpriteRequestUrl)
      return;

    const canvas = previewCanvasRef.current;
    if (!canvas)
      return;

    const ctx = canvas.getContext("2d");
    if (!ctx)
      return;

    canvas.width = pendingImg.width;
    canvas.height = pendingImg.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(pendingImg, 0, 0);

    setRenderSpriteUrl(pendingUrl);
    pendingRenderImageRef.current = null;
    pendingRenderSpriteUrlRef.current = null;
  }, [renderDrawVersion, previewMode, renderSpriteRequestUrl]);

  // If only the transform changes but sprite stays the same, apply immediately.
  useEffect(() => {
    if (previewMode !== "render")
      return;
    if (!renderSpriteRequestUrl)
      return;
    if (renderSpriteRequestUrl !== renderSpriteUrl)
      return;
    setRenderTransform(computedTransform);
  }, [previewMode, renderSpriteRequestUrl, renderSpriteUrl, computedTransform]);

  // Cycle through preview modes
  const cyclePreviewMode = () => {
    setPreviewMode((current) => {
      if (current === "sprite")
        return "avatar";
      if (current === "avatar")
        return "render";
      return "sprite";
    });
  };

  const getPreviewModeLabel = () => {
    if (previewMode === "sprite")
      return "立绘预览";
    if (previewMode === "avatar")
      return "头像预览";
    return "渲染预览";
  };

  const getNextModeLabel = () => {
    if (previewMode === "sprite")
      return "头像";
    if (previewMode === "avatar")
      return "渲染";
    return "立绘";
  };

  const handleReplaceAvatar = useCallback(async (payload: ReplaceAvatarPayload) => {
    if (!currentAvatar?.avatarId || !roleIdForMutation) {
      toast.error("当前头像信息缺失，无法修改");
      return;
    }

    const nextTransform = payload.transform ?? {
      scale: currentAvatar.spriteScale ?? 1,
      positionX: currentAvatar.spriteXPosition ?? 0,
      positionY: currentAvatar.spriteYPosition ?? 0,
      alpha: currentAvatar.spriteTransparency ?? 1,
      rotation: currentAvatar.spriteRotation ?? 0,
    };

    try {
      await updateAvatar({
        ...currentAvatar,
        roleId: roleIdForMutation,
        avatarId: currentAvatar.avatarId,
        avatarUrl: payload.avatarUrl || currentAvatar.avatarUrl || "",
        spriteUrl: payload.spriteUrl || currentAvatar.spriteUrl || "",
        originUrl: payload.originUrl ?? currentAvatar.originUrl,
        spriteXPosition: nextTransform.positionX,
        spriteYPosition: nextTransform.positionY,
        spriteScale: nextTransform.scale,
        spriteTransparency: nextTransform.alpha,
        spriteRotation: nextTransform.rotation,
      });
      toast.success("头像已修改");
    }
    catch (error) {
      console.error("修改头像失败:", error);
      toast.error("修改失败，请稍后重试");
    }
  }, [currentAvatar, roleIdForMutation, updateAvatar]);

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
      <div className="flex justify-between items-center mb-2 flex-shrink-0">
        <h3 className="text-lg font-semibold">
          {getPreviewModeLabel()}
        </h3>
        <button
          type="button"
          className="btn btn-sm btn-ghost gap-2"
          onClick={cyclePreviewMode}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
          </svg>
          切换至
          {getNextModeLabel()}
        </button>
      </div>

      {/* 预览内容区域 */}
      <div className="flex-1 min-h-0 relative bg-base-200 rounded-lg overflow-hidden">
        {previewMode === "sprite" && (
          spriteUrl
            ? (
                <div className="w-full h-full flex items-center justify-center p-4">
                  <img
                    src={spritePreviewUrl ?? spriteUrl}
                    alt="立绘预览"
                    className="max-w-full max-h-full object-contain"
                    loading="lazy"
                    decoding="async"
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
        )}

        {previewMode === "avatar" && (
          avatarUrl
            ? (
                <div className="w-full h-full flex items-center justify-center p-4">
                  <AvatarPreview
                    currentAvatarUrl={avatarUrl}
                    characterName={characterName}
                    mode="full"
                    className="h-full"
                    hideTitle={true}
                    layout={isMobileScreen() ? "toggle" : "horizontal"}
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

        {previewMode === "render" && (
          spriteUrl
            ? (
                <div className="w-full h-full p-4 flex items-center justify-center relative">
                  <div className="w-full max-w-4xl">
                    <RenderPreview
                      previewCanvasRef={previewCanvasRef}
                      transform={renderTransform}
                      characterName={characterName}
                      dialogContent="这是一段示例对话内容。"
                    />
                  </div>
                  {currentAvatar?.avatarId && (
                    <div className="absolute right-4 bottom-4">
                      <CharacterCopper
                        fileName={`avatar-replace-${currentAvatar.avatarId}-${Date.now()}`}
                        scene={3}
                        mutate={handleReplaceAvatar}
                        stateKey={replaceStateKey}
                      >
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          disabled={isReplacing}
                        >
                          {isReplacing ? "修改中..." : "修改头像"}
                        </button>
                      </CharacterCopper>
                    </div>
                  )}
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
