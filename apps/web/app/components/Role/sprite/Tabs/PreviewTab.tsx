import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import type { RoleAvatar } from "api";

import { Button } from "@/components/common/Button";
import { MediaImage } from "@/components/common/mediaImage";
import { AvatarPreview } from "@/components/Role/Preview/AvatarPreview";
import { RenderPreview } from "@/components/Role/Preview/RenderPreview";

import { loadPreviewSpriteImage, preloadPreviewSpriteImages } from "../previewSpriteImageCache";
import { getEffectiveAvatarThumbUrl, getEffectiveAvatarUrl, getEffectiveSpriteUrl, parseTransformFromAvatar } from "../utils";

type RenderTransform = {
  scale: number;
  positionX: number;
  positionY: number;
  alpha: number;
  rotation: number;
}

const DEFAULT_TRANSFORM: RenderTransform = {
  scale: 1,
  positionX: 0,
  positionY: 0,
  alpha: 1,
  rotation: 0,
};

type PreviewTabProps = {
  /** 当前选中的头像数据 */
  currentAvatar: RoleAvatar | null;
  /** 用于预热渲染预览的候选头像列表 */
  preloadAvatars?: RoleAvatar[];
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
  preloadAvatars = [],
  characterName,
  onAvatarChange,
  onPreview,
  onApply,
}: PreviewTabProps) {
  // 预览模式: 'sprite' | 'avatar' | 'render'
  const [previewMode, setPreviewMode] = useState<"sprite" | "avatar" | "render">("render");

  const spriteUrl = currentAvatar ? (getEffectiveSpriteUrl(currentAvatar) || null) : null;
  const avatarUrl = currentAvatar ? (getEffectiveAvatarUrl(currentAvatar) || null) : null;
  const spritePreviewUrl = spriteUrl;
  const renderSpriteRequestUrl = spriteUrl;

  // Canvas ref for render preview
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const computedTransform = useMemo<RenderTransform>(() => {
    return currentAvatar
      ? (parseTransformFromAvatar(currentAvatar) as RenderTransform)
      : DEFAULT_TRANSFORM;
  }, [currentAvatar]);
  // Render preview should avoid showing: old image + new transform (or vice versa).
  // So we only update the transform after the new sprite image is ready to draw.
  const [renderTransform, setRenderTransform] = useState<RenderTransform>(() => computedTransform);
  const [renderSpriteUrl, setRenderSpriteUrl] = useState<string | null>(() => spriteUrl);
  const pendingRenderImageRef = useRef<HTMLImageElement | null>(null);
  const pendingRenderBitmapRef = useRef<ImageBitmap | null>(null);
  const pendingRenderSpriteUrlRef = useRef<string | null>(null);
  const [renderDrawVersion, setRenderDrawVersion] = useState(0);
  const [isRenderSpriteLoading, setIsRenderSpriteLoading] = useState(false);
  const displayRenderTransform = renderSpriteUrl === renderSpriteRequestUrl ? computedTransform : renderTransform;

  useEffect(() => {
    if (preloadAvatars.length === 0)
      return;

    preloadPreviewSpriteImages(preloadAvatars.map(avatar => getEffectiveSpriteUrl(avatar) || null));
  }, [preloadAvatars]);

  // Load sprite image for render preview.
  // Important: switching avatars quickly can cause async image loads to resolve out of order.
  // We cancel stale loads and only commit (transform + draw) for the latest selection.
  useEffect(() => {
    if (previewMode !== "render")
      return;

    // No sprite: reset to computed transform and clear pending work.
    if (!renderSpriteRequestUrl) {
      pendingRenderImageRef.current = null;
      pendingRenderBitmapRef.current = null;
      pendingRenderSpriteUrlRef.current = null;
      setIsRenderSpriteLoading(false);
      return;
    }

    let active = true;
    let rafId: number | null = null;
    const targetSpriteUrl = renderSpriteRequestUrl;
    const targetTransform = computedTransform;

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

      setIsRenderSpriteLoading(targetSpriteUrl !== renderSpriteUrl);
      loadPreviewSpriteImage(targetSpriteUrl).then(({ image, bitmap }) => {
        if (!active)
          return;
        // Stash the decoded image and commit the transform first.
        // Then we draw in a layout effect (paint-safe) to avoid showing a mismatched frame.
        pendingRenderImageRef.current = image;
        pendingRenderBitmapRef.current = bitmap;
        pendingRenderSpriteUrlRef.current = targetSpriteUrl;
        setRenderTransform(targetTransform);
        setRenderDrawVersion(v => v + 1);
      }).catch((error) => {
        if (!active)
          return;
        setIsRenderSpriteLoading(false);
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
  }, [previewMode, renderSpriteRequestUrl, computedTransform, renderSpriteUrl]);

  // Draw pending render sprite *after* renderTransform has been committed (layout effect runs before paint).
  useLayoutEffect(() => {
    if (previewMode !== "render")
      return;

    const pendingUrl = pendingRenderSpriteUrlRef.current;
    const pendingImg = pendingRenderImageRef.current;
    const pendingBitmap = pendingRenderBitmapRef.current;
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
    ctx.drawImage(pendingBitmap ?? pendingImg, 0, 0);

    setRenderSpriteUrl(pendingUrl);
    setIsRenderSpriteLoading(false);
    pendingRenderImageRef.current = null;
    pendingRenderBitmapRef.current = null;
    pendingRenderSpriteUrlRef.current = null;
  }, [renderDrawVersion, previewMode, renderSpriteRequestUrl]);

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

  // 处理展示预览（同步外部索引并关闭弹窗）
  const handlePreview = () => {
    onPreview?.();
    onApply?.();
  };

  // 处理应用头像（真正更改角色头像）
  const handleApplyAvatar = () => {
    if (currentAvatar && onAvatarChange) {
      onAvatarChange(getEffectiveAvatarThumbUrl(currentAvatar) || getEffectiveAvatarUrl(currentAvatar), currentAvatar.avatarId || 0);
    }
    onApply?.();
  };

  return (
    <div className="h-full flex flex-col">
      {/* 预览标题和切换按钮 */}
      <div className="mb-2 shrink-0 flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {getPreviewModeLabel()}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 rounded-md"
          onClick={cyclePreviewMode}
          aria-label={`切换预览模式，当前 ${getPreviewModeLabel()}，将切换至 ${getNextModeLabel()}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="size-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
          </svg>
          切换至
          {getNextModeLabel()}
        </Button>
      </div>

      {/* 预览内容区域 */}
      <div className="
        flex-1 min-h-0 relative bg-base-200 rounded-lg overflow-hidden
      ">
        {previewMode === "sprite" && (
          spriteUrl
            ? (
                <div className="size-full flex items-center justify-center p-4">
                  <MediaImage
                    src={spritePreviewUrl ?? spriteUrl}
                    alt="立绘预览"
                    className="max-w-full max-h-full object-contain"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              )
            : (
                <div className="
                  absolute inset-0 flex items-center justify-center
                  text-base-content/50
                ">
                  <div className="text-center">
                    <svg className="size-16 mx-auto mb-2 opacity-50" viewBox="0 0 24 24" fill="none">
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
                <div className="size-full flex items-center justify-center p-4">
                  <AvatarPreview
                    currentAvatarUrl={avatarUrl}
                    characterName={characterName}
                    mode="full"
                    className="h-full"
                    hideTitle={true}
                    layout="vertical"
                  />
                </div>
              )
            : (
                <div className="
                  absolute inset-0 flex items-center justify-center
                  text-base-content/50
                ">
                  <div className="text-center">
                    <svg className="size-16 mx-auto mb-2 opacity-50" viewBox="0 0 24 24" fill="none">
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
                <div className="size-full p-4 flex items-center justify-center relative">
                  <div className="w-full max-w-4xl">
                    <RenderPreview
                      previewCanvasRef={previewCanvasRef}
                      transform={displayRenderTransform}
                      characterName={characterName}
                      dialogContent="点击进行立绘矫正"
                    />
                  </div>
                  {isRenderSpriteLoading && (
                    <div className="
                      absolute inset-4 rounded-lg bg-base-300/20
                      backdrop-blur-[1px] flex items-center justify-center
                      text-base-content/70
                    ">
                      <span
                        className="size-5 animate-spin rounded-full border-2 border-base-content/20 border-t-base-content/70"
                        role="status"
                        aria-label="正在加载预览"
                      />
                    </div>
                  )}
                </div>
              )
            : (
                <div className="
                  absolute inset-0 flex items-center justify-center
                  text-base-content/50
                ">
                  <div className="text-center">
                    <svg className="size-16 mx-auto mb-2 opacity-50" viewBox="0 0 24 24" fill="none">
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
      <div className="mt-4 flex shrink-0 items-center justify-end gap-2">
        <Button
          variant="outline"
          className="rounded-md"
          onClick={handlePreview}
          disabled={!currentAvatar}
          title={currentAvatar ? "展示预览" : "请先选择头像"}
        >
          展示预览
        </Button>
        <Button
          variant="primary"
          className="rounded-md"
          onClick={handleApplyAvatar}
          disabled={!currentAvatar}
          title={currentAvatar ? "应用头像" : "请先选择头像"}
        >
          应用头像
        </Button>
      </div>
    </div>
  );
}
