import type { RoleAvatar } from "api";
import type { Transform } from "./TransformControl";
import { PopWindow } from "@/components/common/popWindow";
import { useEffect, useMemo, useRef, useState } from "react";
import { RenderPreview } from "./RenderPreview";
import { SpriteCropper } from "./SpriteCropper";
// import { TransformControl } from "./TransformControl";

interface SpriteRenderStudioProps {
  characterName: string;
  roleAvatars: RoleAvatar[];
  initialAvatarId?: number;
  dialogContent?: string;
  className?: string;
  // 可选的外部 canvas 引用，用于从外部 canvas 获取立绘内容
  externalCanvasRef?: React.RefObject<HTMLCanvasElement | null>;
}

/**
 * 立绘渲染工作室组件
 * 结合了渲染预览和变换控制功能，内部管理所有相关状态
 */
export function SpriteRenderStudio({
  characterName,
  roleAvatars,
  initialAvatarId,
  dialogContent = "这是一段示例对话内容。",
  className = "",
  externalCanvasRef,
}: SpriteRenderStudioProps) {
  // 内部状态管理
  const internalCanvasRef = useRef<HTMLCanvasElement>(null);
  // 优先使用外部Canvas引用，否则使用内部引用
  const previewCanvasRef = externalCanvasRef || internalCanvasRef;

  // 过滤出有立绘的头像
  const spritesAvatars = roleAvatars.filter(avatar => avatar.spriteUrl);

  // 使用useMemo计算正确的立绘索引，响应数据变化
  const correctSpriteIndex = useMemo(() => {
    if (spritesAvatars.length === 0)
      return 0;
    if (!initialAvatarId)
      return 0;

    const index = spritesAvatars.findIndex(avatar => avatar.avatarId === initialAvatarId);
    return index !== -1 ? index : 0;
  }, [spritesAvatars, initialAvatarId]);

  // 手动切换的立绘索引偏移量，默认为null表示使用自动计算的索引
  const [manualIndexOffset, setManualIndexOffset] = useState<number | null>(null);

  // 当前实际使用的立绘索引
  const currentSpriteIndex = manualIndexOffset !== null ? manualIndexOffset : correctSpriteIndex;
  // 记录上一次的initialAvatarId，用于检测外部变化
  const [lastInitialAvatarId, setLastInitialAvatarId] = useState(initialAvatarId);
  // 标记是否是用户手动切换（而非外部initialAvatarId变化）
  const [isManualSwitch, setIsManualSwitch] = useState(false);
  // 弹窗显示状态
  const [isPopWindowOpen, setIsPopWindowOpen] = useState(false);

  // 处理立绘索引同步 - 当initialAvatarId变化时重置手动偏移
  useEffect(() => {
    // 当initialAvatarId变化时，清除手动偏移，回到自动计算的索引
    if (initialAvatarId !== lastInitialAvatarId) {
      // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
      setManualIndexOffset(null);
      // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
      setLastInitialAvatarId(initialAvatarId);
    }

    // 如果是手动切换触发的，重置标记
    if (isManualSwitch) {
      // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
      setIsManualSwitch(false);
    }
  }, [initialAvatarId, lastInitialAvatarId, isManualSwitch]);

  // 获取当前立绘 - 添加数据一致性检查
  const currentSprite = useMemo(() => {
    // 确保索引有效且数据一致
    if (currentSpriteIndex >= 0 && currentSpriteIndex < spritesAvatars.length) {
      const sprite = spritesAvatars[currentSpriteIndex];
      // 如果有initialAvatarId，验证当前立绘是否匹配
      if (initialAvatarId && manualIndexOffset === null) {
        // 在自动模式下，验证当前立绘是否匹配initialAvatarId
        if (sprite?.avatarId === initialAvatarId) {
          return sprite;
        }
        // 如果不匹配，可能是数据还没同步，返回null等待
        return null;
      }
      // 手动模式下直接返回
      return sprite;
    }
    return null;
  }, [spritesAvatars, currentSpriteIndex, initialAvatarId, manualIndexOffset]);

  const spriteUrl = currentSprite?.spriteUrl || null;

  // Helper function to parse transform data from API response
  const parseTransformFromAvatar = (avatar: RoleAvatar | null): Transform => {
    if (!avatar) {
      return {
        scale: 1,
        positionX: 0,
        positionY: 0,
        alpha: 1,
        rotation: 0,
      };
    }

    // Parse transform parameters from string values, with fallbacks to defaults
    const scale = avatar.spriteScale ? Number.parseFloat(avatar.spriteScale) : 1;
    const positionX = avatar.spriteXPosition ? Number.parseFloat(avatar.spriteXPosition) : 0;
    const positionY = avatar.spriteYPosition ? Number.parseFloat(avatar.spriteYPosition) : 0;
    const alpha = avatar.spriteTransparency ? Number.parseFloat(avatar.spriteTransparency) : 1;
    const rotation = avatar.spriteRotation ? Number.parseFloat(avatar.spriteRotation) : 0;

    // Validate and clamp values to acceptable ranges
    return {
      scale: Math.max(0, Math.min(2, Number.isNaN(scale) ? 1 : scale)),
      positionX: Math.max(-300, Math.min(300, Number.isNaN(positionX) ? 0 : positionX)),
      positionY: Math.max(-300, Math.min(300, Number.isNaN(positionY) ? 0 : positionY)),
      alpha: Math.max(0, Math.min(1, Number.isNaN(alpha) ? 1 : alpha)),
      rotation: Math.max(0, Math.min(360, Number.isNaN(rotation) ? 0 : rotation)),
    };
  };

  // Get transform data from current sprite, or use defaults
  const transform = useMemo(() => {
    return parseTransformFromAvatar(currentSprite);
  }, [currentSprite]);

  // 记录上一个currentSpriteIndex，用于检测立绘切换
  const [lastSpriteIndex, setLastSpriteIndex] = useState(currentSpriteIndex);

  // 切换到上一个立绘
  const handlePreviousSprite = () => {
    if (spritesAvatars.length > 1) {
      setIsManualSwitch(true);
      setManualIndexOffset((prev) => {
        const currentIndex = prev !== null ? prev : correctSpriteIndex;
        return (currentIndex - 1 + spritesAvatars.length) % spritesAvatars.length;
      });
    }
  };

  // 切换到下一个立绘
  const handleNextSprite = () => {
    if (spritesAvatars.length > 1) {
      setIsManualSwitch(true);
      setManualIndexOffset((prev) => {
        const currentIndex = prev !== null ? prev : correctSpriteIndex;
        return (currentIndex + 1) % spritesAvatars.length;
      });
    }
  };

  // Track sprite index changes for debugging
  useEffect(() => {
    if (currentSpriteIndex !== lastSpriteIndex) {
      console.warn("SpriteRenderStudio: Sprite switched", {
        from: lastSpriteIndex,
        to: currentSpriteIndex,
        currentSprite,
        transform: parseTransformFromAvatar(currentSprite),
      });
      // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
      setLastSpriteIndex(currentSpriteIndex);
    }
  }, [currentSpriteIndex, lastSpriteIndex, currentSprite]);

  // 当立绘URL变化时，加载到预览Canvas
  useEffect(() => {
    // 添加数据一致性检查，确保spriteUrl对应正确的角色
    if (spriteUrl && previewCanvasRef.current && currentSprite) {
      // 在自动模式下，验证当前立绘确实属于当前角色
      if (initialAvatarId && manualIndexOffset === null && currentSprite.avatarId !== initialAvatarId) {
        // 数据不一致，不渲染，等待正确数据
        return;
      }

      const canvas = previewCanvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const img = new Image();
        img.crossOrigin = "anonymous";

        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        };

        img.onerror = () => {
          // 图片加载失败时清空canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        };

        img.src = spriteUrl;
      }
    }
    else if (!spriteUrl && previewCanvasRef.current) {
      // 没有spriteUrl时清空canvas
      const canvas = previewCanvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [spriteUrl, previewCanvasRef, currentSprite, initialAvatarId, manualIndexOffset]);

  // 处理打开弹窗
  const handleOpenPopWindow = () => {
    setIsPopWindowOpen(true);
  };

  // 处理关闭弹窗
  const handleClosePopWindow = () => {
    setIsPopWindowOpen(false);
  };

  return (
    <div className={`${className} flex-col`}>
      <div className="relative flex-1 min-h-0">
        {/* 编辑按钮 - 定位到右上角 */}
        <button
          type="button"
          className="absolute top-2 right-2 btn btn-accent z-30"
          onClick={handleOpenPopWindow}
        >
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
              <path d="M11 4H4v14a2 2 0 002 2h12a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" />
              <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z" stroke="currentColor" strokeWidth="2" />
            </svg>
            立绘校正
          </span>
        </button>

        {/* 头像列表面板 - 位于编辑按钮下方 */}
        {spritesAvatars.length > 0 && (
          <div className="absolute top-14 right-2 bg-base-100/90 backdrop-blur-sm rounded-lg shadow-lg border border-base-300 p-2 z-30 max-w-xs">
            <h4 className="text-sm font-semibold mb-2 text-center">立绘列表</h4>
            <div className="grid grid-cols-4 gap-2 overflow-y-auto">
              {spritesAvatars.map((avatar, index) => (
                <button
                  type="button"
                  key={avatar.avatarId}
                  onClick={() => {
                    setIsManualSwitch(true);
                    setManualIndexOffset(index);
                  }}
                  className={`relative aspect-square rounded-md overflow-hidden border-2 transition-[border-color,box-shadow] duration-200 ${index === currentSpriteIndex
                    ? "border-primary shadow-lg"
                    : "border-base-300 hover:border-primary/50 hover:shadow-md"
                  }`}
                  title={`切换到立绘 ${index + 1}`}
                >
                  {avatar.avatarUrl
                    ? (
                        <img
                          src={avatar.avatarUrl}
                          alt={`头像 ${index + 1}`}
                          className="w-full h-full object-cover pointer-events-none"
                          loading="lazy"
                          style={{ aspectRatio: "1 / 1" }}
                        />
                      )
                    : (
                        <div className="w-full h-full bg-base-200 flex items-center justify-center">
                          <svg className="w-4 h-4 text-base-content/50" viewBox="0 0 24 24" fill="none">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" />
                            <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
                          </svg>
                        </div>
                      )}
                </button>
              ))}
            </div>
            <div className="text-xs text-center mt-2 text-base-content/70">
              {currentSpriteIndex + 1}
              {" "}
              /
              {spritesAvatars.length}
            </div>
          </div>
        )}

        {/* 数据加载中的提示 */}
        {initialAvatarId && !currentSprite && spritesAvatars.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-base-200/50 z-10">
            <div className="flex flex-col items-center gap-2">
              <span className="loading loading-spinner loading-md"></span>
              <span className="text-sm text-base-content/70">加载立绘数据中...</span>
            </div>
          </div>
        )}

        <RenderPreview
          previewCanvasRef={previewCanvasRef}
          transform={transform}
          characterName={characterName}
          dialogContent={dialogContent}
          characterNameTextSize="text-2xl"
          dialogTextSize="text-xl"
        />

        {/* 调试信息 - 显示当前状态 */}
        <div className="absolute top-2 left-2 bg-black/70 text-white text-xs p-2 rounded z-30">
          <div>
            立绘数量:
            {spritesAvatars.length}
          </div>
          <div>
            当前索引:
            {currentSpriteIndex}
          </div>
          <div>
            spriteUrl:
            {spriteUrl ? "有" : "无"}
          </div>
          <div>
            Transform: S:
            {transform.scale.toFixed(2)}
            {" "}
            X:
            {transform.positionX}
            {" "}
            Y:
            {transform.positionY}
            {" "}
            A:
            {transform.alpha.toFixed(2)}
            {" "}
            R:
            {transform.rotation}
            °
          </div>
        </div>

        {/* 立绘切换箭头 - 只在有多个立绘时显示 */}
        {spritesAvatars.length > 1 && (
          <>
            {/* 左箭头 */}
            <button
              type="button"
              onClick={handlePreviousSprite}
              className="absolute left-2 top-1/2 btn btn-circle btn-sm bg-black/50 border-none text-white hover:bg-black/70 z-20"
              title="上一个立绘"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* 右箭头 */}
            <button
              type="button"
              onClick={handleNextSprite}
              className="absolute right-2 top-1/2 btn btn-circle btn-sm bg-black/50 border-none text-white hover:bg-black/70 z-20 "
              title="下一个立绘"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* 立绘指示器 */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-20">
              {spritesAvatars.map((avatar, index) => (
                <button
                  type="button"
                  key={avatar.avatarId}
                  onClick={() => {
                    setIsManualSwitch(true);
                    setManualIndexOffset(index);
                  }}
                  className={`w-2 h-2 rounded-full transition-all ${index === currentSpriteIndex
                    ? "bg-white scale-125"
                    : "bg-white/50 hover:bg-white/70"
                  }`}
                  title={`立绘 ${index + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* 立绘校正弹窗 */}
      {isPopWindowOpen && (
        <PopWindow
          isOpen={isPopWindowOpen}
          onClose={handleClosePopWindow}
        >
          {spriteUrl
            ? (
                <SpriteCropper
                  spriteUrl={spriteUrl}
                  roleAvatars={roleAvatars}
                  initialSpriteIndex={currentSpriteIndex}
                  characterName={characterName}
                  dialogContent={dialogContent}
                  onCropComplete={(croppedImageUrl) => {
                  // TODO: 处理单体裁剪完成的图片
                    console.warn("单体裁剪完成:", croppedImageUrl);
                    handleClosePopWindow();
                  }}
                  onBatchCropComplete={(croppedImages) => {
                  // TODO: 处理批量裁剪完成的图片
                    console.warn("批量裁剪完成:", croppedImages);
                    handleClosePopWindow();
                  }}
                  onClose={handleClosePopWindow}
                />
              )
            : (
                <div className="p-4">
                  <h3 className="text-lg font-semibold mb-4">立绘校正</h3>
                  <p>当前没有可用的立绘进行裁剪</p>
                </div>
              )}
        </PopWindow>
      )}
    </div>
  );
}
