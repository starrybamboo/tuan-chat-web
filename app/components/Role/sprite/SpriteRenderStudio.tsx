import type { RoleAvatar } from "api";
import type { Role } from "../types";
import { useEffect, useMemo, useRef, useState } from "react";
import { RenderPreview } from "../Preview/RenderPreview";
import { SpriteSettingsPopup } from "./SpriteSettingsPopup";
import { parseTransformFromAvatar } from "./utils";

interface SpriteRenderStudioProps {
  characterName: string;
  roleAvatars: RoleAvatar[];
  initialAvatarId?: number;
  className?: string;
  // 可选的外部 canvas 引用，用于从外部 canvas 获取立绘内容
  externalCanvasRef?: React.RefObject<HTMLCanvasElement | null>;
  // 应用头像回调（真正更改角色头像，调用接口）
  onAvatarChange?: (avatarUrl: string, avatarId: number) => void;
  // 角色信息（用于删除功能）
  role?: Role;
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
  onAvatarChange,
  role,
}: SpriteRenderStudioProps) {
  // 内部状态管理
  const internalCanvasRef = useRef<HTMLCanvasElement>(null);
  // 优先使用外部Canvas引用，否则使用内部引用
  const previewCanvasRef = externalCanvasRef || internalCanvasRef;

  // 过滤出有立绘的头像
  const spritesAvatars = roleAvatars.filter(avatar => avatar.spriteUrl);

  // 使用useMemo计算正确的立绘索引，响应数据变化
  const correctSpriteIndex = useMemo(() => {
    if (spritesAvatars.length === 0) {
      return 0;
    }
    if (!initialAvatarId) {
      return 0;
    }
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
  // 设置弹窗显示状态
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
      if (!!initialAvatarId && manualIndexOffset === null) {
        // 在自动模式下，验证当前立绘是否匹配initialAvatarId
        if (sprite?.avatarId === initialAvatarId) {
          return sprite;
        }
        // 如果不匹配，尝试找到匹配的立绘
        const matchingSprite = spritesAvatars.find(s => s.avatarId === initialAvatarId);
        if (matchingSprite) {
          return matchingSprite;
        }
        return sprite;
      }
      // 手动模式下直接返回
      return sprite;
    }
    return null;
  }, [currentSpriteIndex, spritesAvatars, initialAvatarId, manualIndexOffset]);

  const spriteUrl = currentSprite?.spriteUrl || null;

  // 直接从 currentSprite 计算 transform,无需状态
  const transform = useMemo(() => {
    if (!currentSprite) {
      return {
        scale: 1,
        positionX: 0,
        positionY: 0,
        alpha: 1,
        rotation: 0,
      };
    }
    return parseTransformFromAvatar(currentSprite);
  }, [currentSprite]);

  // 记录上一个currentSpriteIndex,用于检测立绘切换
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
  const [isImageLoading, setIsImageLoading] = useState(true);

  // Canvas 强制刷新 key
  const [canvasRefreshKey, setCanvasRefreshKey] = useState(0);

  // 当 spriteUrl 变化时，立即设置加载状态为 true
  useEffect(() => {
    if (spriteUrl) {
      // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
      setIsImageLoading(true);
    }
  }, [spriteUrl]);

  // 当立绘URL变化时，加载到预览Canvas (已修复)
  useEffect(() => {
    // 如果没有 spriteUrl，直接清空并返回，简化逻辑
    if (!spriteUrl || !previewCanvasRef.current || !currentSprite) {
      if (previewCanvasRef.current) {
        const canvas = previewCanvasRef.current;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
      // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
      setIsImageLoading(false);
      return; // 提前退出
    }

    // --- 这是修复的关键部分 ---
    let isActive = true; // 标志位，表示当前 effect 是否仍然“有效”

    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        // 只有当这个 effect 仍然是“活跃”的，才执行操作
        if (isActive) {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          setIsImageLoading(false);
        }
      };

      img.onerror = () => {
        if (isActive) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          setIsImageLoading(false);
        }
      };

      img.src = spriteUrl;
    }

    // 清理函数：当组件卸载或 spriteUrl 变化导致 useEffect 重新运行时，
    // 上一个 effect 的清理函数会被调用。
    return () => {
      isActive = false; // 将上一个 effect 标记为"无效"
    };
  }, [spriteUrl, previewCanvasRef, currentSprite, canvasRefreshKey]);

  // 处理打开设置弹窗
  const handleOpenSettings = () => {
    setIsSettingsOpen(true);
  };

  // 处理关闭设置弹窗
  const handleCloseSettings = () => {
    setIsSettingsOpen(false);
  };

  return (
    <div className={`${className} flex-col`}>
      <div className="relative flex-1 min-h-0">
        {/* 设置按钮 - 齿轮图标，定位到右上角 */}
        <button
          type="button"
          className="absolute top-2 right-2 btn btn-sm md:btn-md btn-circle border border-base-300 shadow-lg hover:bg-base-200 z-31"
          onClick={handleOpenSettings}
          title="立绘设置"
        >
          <svg className="w-5 h-5 text-base-content/70" viewBox="0 0 24 24" fill="none">
            <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* 数据加载中的提示 */}
        {!!initialAvatarId && !currentSprite && spritesAvatars.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-base-200 z-10">
            <div className="flex flex-col items-center gap-2">
              <span className="loading loading-spinner loading-md"></span>
              <span className="text-sm text-base-content/70">加载立绘数据中...</span>
            </div>
          </div>
        )}

        {/* 图片切换加载指示器 */}
        {isImageLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-base-200 z-15">
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
        <div className="absolute top-2 right-2 bg-black/70 text-white text-xs p-2 rounded z-30 hidden sm:block">
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
          <div>
            情感:
            {(() => {
              const currentAvatar = roleAvatars[currentSpriteIndex];
              const avatarTitle = currentAvatar?.avatarTitle as Record<string, string> || {};
              const entries = Object.entries(avatarTitle);
              return entries.length > 0
                ? entries.map(([key, value]) => `${key}:${value}`).join(", ")
                : "无";
            })()}
          </div>
        </div>

        {/* 立绘切换箭头 - 只在有多个立绘时显示 */}
        {spritesAvatars.length > 1 && (
          <>
            {/* 左箭头（移动端缩小） */}

            <button
              type="button"
              onClick={handlePreviousSprite}
              className="absolute left-2 top-1/2 btn btn-circle btn-xs bg-black/50 border-none text-white hover:bg-black/70 z-20 hidden sm:block items-center justify-center"
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
              className="absolute right-2 top-1/2 btn btn-circle btn-xs bg-black/50 border-none text-white hover:bg-black/70 z-20 hidden sm:block items-center justify-center"
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

      {/* 设置弹窗 - 包含四个 tab：立绘校正、头像校正、立绘列表、情感设定 */}
      <SpriteSettingsPopup
        isOpen={isSettingsOpen}
        onClose={handleCloseSettings}
        spritesAvatars={spritesAvatars}
        roleAvatars={roleAvatars}
        currentSpriteIndex={currentSpriteIndex}
        characterName={characterName}
        onAvatarChange={onAvatarChange}
        onSpriteIndexChange={(index) => {
          setIsManualSwitch(true);
          setManualIndexOffset(index);
          // 强制刷新 canvas
          setCanvasRefreshKey(prev => prev + 1);
        }}
        role={role}
      />
    </div>
  );
}
