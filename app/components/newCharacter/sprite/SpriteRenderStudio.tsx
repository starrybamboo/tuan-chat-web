import type { RoleAvatar } from "api";
import type { Transform } from "./TransformControl";
import { PopWindow } from "@/components/common/popWindow";
import { useEffect, useMemo, useRef, useState } from "react";
import { RenderPreview } from "./RenderPreview";
import { SpriteCropper } from "./SpriteCropper";
import { parseTransformFromAvatar } from "./utils";
// import { TransformControl } from "./TransformControl";

interface SpriteRenderStudioProps {
  characterName: string;
  roleAvatars: RoleAvatar[];
  initialAvatarId?: number;
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
  // 立绘列表面板收起/展开状态
  const [isSpritePanelOpen, setIsSpritePanelOpen] = useState(false);

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
        // 如果不匹配，尝试找到匹配的立绘
        const matchingSprite = spritesAvatars.find(s => s.avatarId === initialAvatarId);
        if (matchingSprite) {
          return matchingSprite;
        }
        // 如果找不到匹配的，返回当前索引的立绘（回退策略）
        return sprite;
      }
      // 手动模式下直接返回
      return sprite;
    }
    return null;
  }, [spritesAvatars, currentSpriteIndex, initialAvatarId, manualIndexOffset]);

  const spriteUrl = currentSprite?.spriteUrl || null;

  // 当前显示的transform状态，用于平滑切换
  const [displayTransform, setDisplayTransform] = useState<Transform>(() => ({
    scale: 1,
    positionX: 0,
    positionY: 0,
    alpha: 1,
    rotation: 0,
  }));

  // 当currentSprite变化时，如果没有spriteUrl则立即更新transform
  useEffect(() => {
    if (currentSprite && !currentSprite.spriteUrl) {
      const newTransform = parseTransformFromAvatar(currentSprite);
      setDisplayTransform(newTransform);
    }
  }, [currentSprite]);

  // 使用displayTransform作为实际的transform
  const transform = displayTransform;

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

  // 图片加载状态
  const [isImageLoading, setIsImageLoading] = useState(false);

  // 当立绘URL变化时，加载到预览Canvas
  useEffect(() => {
    // 加载立绘到预览Canvas
    if (spriteUrl && previewCanvasRef.current && currentSprite) {
      const canvas = previewCanvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        setIsImageLoading(true);
        const img = new Image();
        img.crossOrigin = "anonymous";

        img.onload = () => {
          // 确保这个回调对应的还是当前的spriteUrl（避免竞态条件）
          if (img.src === spriteUrl) {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);

            // 图片加载完成后，确保transform已经更新
            const newTransform = parseTransformFromAvatar(currentSprite);
            setDisplayTransform(newTransform);
          }
          setIsImageLoading(false);
        };

        img.onerror = () => {
          // 图片加载失败时清空canvas
          if (img.src === spriteUrl) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
          setIsImageLoading(false);
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
      setIsImageLoading(false);
    }
  }, [spriteUrl, previewCanvasRef, currentSprite]);

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
        {/* 编辑按钮 - 定位到右上角，移动端自动缩小 */}
        <button
          type="button"
          className="absolute top-2 left-2 sm:right-2 sm:left-auto btn btn-sm md:btn-md btn-accent z-30"
          onClick={handleOpenPopWindow}
        >
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
              <path d="M11 4H4v14a2 2 0 002 2h12a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" />
              <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z" stroke="currentColor" strokeWidth="2" />
            </svg>
            <span className="hidden sm:inline">立绘校正</span>
          </span>
        </button>

        {/* 立绘列表面板 - 可收起/展开 */}
        {spritesAvatars.length > 0 && (
          <div className="absolute top-2 md:top-14 right-2 z-30">
            {/* 收起时显示icon */}
            {!isSpritePanelOpen && (
              <button
                type="button"
                className="w-8 h-8 flex items-center justify-center rounded-full bg-base-100/90 border border-base-300 shadow-lg hover:bg-base-200 transition-all"
                title="展开立绘列表"
                onClick={() => setIsSpritePanelOpen(true)}
              >
                <svg className="w-5 h-5 text-base-content/70" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                  <path d="M8 12h8M12 8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            )}
            {/* 展开时显示面板 */}
            {isSpritePanelOpen && (
              <div className="bg-base-100/90 backdrop-blur-sm rounded-lg shadow-lg border border-base-300 p-2 max-w-xs relative max-h-[20vh] md:max-h-[40vh] overflow-y-auto">
                <button
                  type="button"
                  className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-base-200 hover:bg-base-300 text-base-content/70"
                  title="收起立绘列表"
                  onClick={() => setIsSpritePanelOpen(false)}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
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

        {/* 图片切换加载指示器 */}
        {isImageLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-base-200/30 z-15">
            <div className="flex flex-col items-center gap-2">
              <span className="loading loading-spinner loading-sm"></span>
              <span className="text-xs text-base-content/70">切换立绘中...</span>
            </div>
          </div>
        )}

        {/* 根据屏幕宽度动态调整字号 */}
        <RenderPreview
          previewCanvasRef={previewCanvasRef}
          transform={transform}
          characterName={characterName}
          dialogContent="这是一段示例对话内容。"
        />

        {/* 调试信息 - 显示当前状态（移动端隐藏，桌面端显示） */}
        <div className="absolute top-2 left-2 bg-black/70 text-white text-xs p-2 rounded z-30 hidden sm:block">
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
            {isImageLoading && " (加载中)"}
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
            {/* 左箭头（移动端缩小） */}

            <button
              type="button"
              onClick={handlePreviousSprite}
              className="absolute left-2 top-1/2 btn btn-circle btn-xs bg-black/50 border-none text-white hover:bg-black/70 z-20 hidden sm:block flex items-center justify-center"
              title="上一个立绘"
            >
              <span className="flex items-center justify-center w-full h-full">
                <svg className="w-4 h-4 m-auto" viewBox="0 0 24 24" fill="none">
                  <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </button>

            {/* 右箭头（移动端缩小） */}
            <button
              type="button"
              onClick={handleNextSprite}
              className="absolute right-2 top-1/2 btn btn-circle btn-xs bg-black/50 border-none text-white hover:bg-black/70 z-20 hidden sm:block flex items-center justify-center"
              title="下一个立绘"
            >
              <span className="flex items-center justify-center w-full h-full">
                <svg className="w-4 h-4 m-auto" viewBox="0 0 24 24" fill="none">
                  <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </button>

            {/* 立绘指示器（移动端缩小） */}
            <div className="absolute -bottom-3 md:bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-20">
              {spritesAvatars.map((avatar, index) => (
                <button
                  type="button"
                  key={avatar.avatarId}
                  onClick={() => {
                    setIsManualSwitch(true);
                    setManualIndexOffset(index);
                  }}
                  className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-all
                    ${index === currentSpriteIndex
                  ? "bg-black sm:bg-white scale-125"
                  : "bg-black/30 sm:bg-white/50 hover:bg-black/50 sm:hover:bg-white/70"}
                  `}
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
          fullScreen={typeof window !== "undefined" ? window.innerWidth < 768 : false}
        >
          {spriteUrl
            ? (
                <SpriteCropper
                  spriteUrl={spriteUrl}
                  roleAvatars={roleAvatars}
                  initialSpriteIndex={currentSpriteIndex}
                  characterName={characterName}
                  onCropComplete={(croppedImageUrl) => {
                    console.warn("单体裁剪完成:", croppedImageUrl);
                    handleClosePopWindow();
                  }}
                  onBatchCropComplete={(croppedImages) => {
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
