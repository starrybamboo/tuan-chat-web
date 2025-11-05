import type { MoodRegulatorHandle } from "@/components/common/MoodRegulator";
import type { RoleAvatar } from "api";
import type { Transform } from "./TransformControl";
import MoodRegulator from "@/components/common/MoodRegulator";
import { PopWindow } from "@/components/common/popWindow";
import { useUpdateAvatarTitleMutation } from "api/queryHooks";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  // 弹窗显示状态
  const [isPopWindowOpen, setIsPopWindowOpen] = useState(false);
  // 头像语音弹窗状态
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  // 立绘列表面板收起/展开状态 - 桌面端默认打开，移动端默认关闭
  const [isSpritePanelOpen, setIsSpritePanelOpen] = useState(false);

  // 情绪调节组件需要
  const { mutate: updateAvatarTitle } = useUpdateAvatarTitleMutation();
  // 将 onChange 包装为稳定引用，避免作为 props 变化触发子组件重渲染
  const moodChangeRef = useRef<(m: Record<string, string>) => void>(() => { });
  const handleMoodChange = useCallback((m: Record<string, string>) => moodChangeRef.current(m), []);

  // 标题的变化监控
  const avatarTitleRef = useRef<Record<string, string>>({});
  const moodControlRef = useRef<MoodRegulatorHandle | null>(null);

  // 情绪调节器兜底标签（当当前头像没有定义 avatarTitle 时使用）
  const DEFAULT_MOOD_LABELS = useMemo(
    () => ["喜", "怒", "哀", "惧", "厌恶", "低落", "惊喜", "平静"],
    [],
  );
  // 根据当前选中头像的情绪键生成 labels，若为空则回退到默认 8 项
  const moodLabels = useMemo(() => {
    const keys = Object.keys((roleAvatars[currentSpriteIndex]?.avatarTitle as Record<string, string>) || {});
    return keys.length > 0 ? keys : DEFAULT_MOOD_LABELS;
  }, [roleAvatars, currentSpriteIndex, DEFAULT_MOOD_LABELS]);

  // 将 onChange 包装为稳定引用，避免作为 props 变化触发子组件重渲染
  useEffect(() => {
    moodChangeRef.current = (moodMap: Record<string, string>) => {
      updateAvatarTitle({ roleId: roleAvatars[currentSpriteIndex].roleId!, avatarId: roleAvatars[currentSpriteIndex].avatarId!, avatarTitle: moodMap });
    };
  }, [updateAvatarTitle, roleAvatars, currentSpriteIndex]);

  // 当外部选中头像变化时，查找对应头像并同步调节器（不触发渲染）
  useEffect(() => {
    const curr = roleAvatars.find(a => a.avatarId === roleAvatars[currentSpriteIndex]?.avatarId);
    if (curr) {
      const t = (curr.avatarTitle as Record<string, string>) || {};
      avatarTitleRef.current = t;
      moodControlRef.current?.setValue(t);
    }
  }, [roleAvatars, currentSpriteIndex]);

  // 处理立绘索引同步 - 当initialAvatarId变化时重置手动偏移
  useEffect(() => {
    moodControlRef.current?.setValue(avatarTitleRef.current || {});
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
        avatarTitleRef.current = roleAvatars[currentSpriteIndex].avatarTitle || {};
        // 通过 ref 直接同步到调节器，避免通过 props 传值导致重建
        moodControlRef.current?.setValue(avatarTitleRef.current);
        return sprite;
      }
      // 手动模式下直接返回
      return sprite;
    }
    return null;
  }, [currentSpriteIndex, spritesAvatars, initialAvatarId, manualIndexOffset, roleAvatars]);

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
      return; // 提前退出
    }

    // --- 这是修复的关键部分 ---
    let isActive = true; // 标志位，表示当前 effect 是否仍然“有效”
    let timeoutId: number | null = null;

    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      setIsImageLoading(true);
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        // 只有当这个 effect 仍然是“活跃”的，才执行操作
        if (isActive) {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);

          const newTransform = parseTransformFromAvatar(currentSprite);
          setDisplayTransform(newTransform);
          timeoutId = window.setTimeout(() => setIsImageLoading(false), 200);
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
      isActive = false; // 将上一个 effect 标记为“无效”
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };
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
        {/* 按钮 - 定位到右上角，移动端自动缩小 */}
        <button
          type="button"
          className="absolute top-2 left-2 sm:right-2 sm:left-auto btn btn-sm md:btn-md btn-accent w-10 md:w-36 z-30"
          onClick={handleOpenPopWindow}
        >
          <span className="flex items-center gap-2">
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
                className="btn btn-sm md:btn-md w-10 md:w-36 items-center justify-center bg-base-100/90 border border-base-300 shadow-lg hover:bg-base-200 transition-all"
                title="展开立绘列表"
                onClick={() => setIsSpritePanelOpen(true)}
              >
                <svg className="w-6 md:w-5 h-6 md:h-5 text-base-content/70" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                  <path d="M8 12h8M12 8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <span className="hidden sm:inline">立绘列表</span>
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
                            <div className="w-full h-full bg-base-200"></div>
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

        {/* 头像语音按钮 */}
        {spritesAvatars.length > 0 && (
          <div className="absolute top-12 md:top-26 right-2 z-20">
            <button
              type="button"
              className="btn btn-sm md:btn-md w-10 md:w-36 items-center justify-center bg-base-100/90 border border-base-300 shadow-lg hover:bg-base-200 transition-all"
              title="头像语音设置"
              onClick={() => setIsVoiceModalOpen(true)}
            >
              <svg className="w-4 h-4 text-base-content/70" viewBox="0 0 24 24" fill="none">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" stroke="currentColor" strokeWidth="2" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 19v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M8 23h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="hidden sm:inline ml-2">情感设定</span>
            </button>
          </div>
        )}

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

      {/* 头像语音设置弹窗 */}
      {isVoiceModalOpen && (
        <PopWindow
          isOpen={isVoiceModalOpen}
          onClose={() => setIsVoiceModalOpen(false)}
          fullScreen={typeof window !== "undefined" ? window.innerWidth < 768 : false}
        >
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">调整当前立绘语音参数</h3>
            </div>
            <div className="bg-info/10 p-4 rounded-md">
              <MoodRegulator
                controlRef={moodControlRef}
                onChange={handleMoodChange}
                // 显式传入 labels，避免在没有值时不渲染控件
                labels={moodLabels}
                // 仅用于初始显示，不参与受控更新；后续都通过 ref.setValue 同步
                defaultValue={(roleAvatars[currentSpriteIndex]?.avatarTitle as Record<string, string>) || undefined}
                fallbackDefaultLabels={true}
              />
            </div>
          </div>
        </PopWindow>
      )}
    </div>
  );
}
