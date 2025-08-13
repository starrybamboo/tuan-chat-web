import type { RoleAvatar } from "api";
import type { Transform } from "./TransformControl";
import { PopWindow } from "@/components/common/popWindow";
import { useEffect, useRef, useState } from "react";
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

  // 当前选中的立绘索引
  const [currentSpriteIndex, setCurrentSpriteIndex] = useState(0);
  // 记录上一次的initialAvatarId，用于检测外部变化
  const [lastInitialAvatarId, setLastInitialAvatarId] = useState(initialAvatarId);
  // 标记是否是用户手动切换（而非外部initialAvatarId变化）
  const [isManualSwitch, setIsManualSwitch] = useState(false);
  // 弹窗显示状态
  const [isPopWindowOpen, setIsPopWindowOpen] = useState(false);

  // 根据initialAvatarId找到初始索引，只在外部initialAvatarId变化时执行
  useEffect(() => {
    // 只有当initialAvatarId真正变化且不是用户手动切换时才更新
    if (initialAvatarId !== lastInitialAvatarId && !isManualSwitch) {
      if (initialAvatarId && spritesAvatars.length > 0) {
        const index = spritesAvatars.findIndex(avatar => avatar.avatarId === initialAvatarId);
        if (index !== -1) {
          // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
          setCurrentSpriteIndex(index);
        }
        else {
          // 如果找不到匹配的avatarId，使用第一个立绘
          // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
          setCurrentSpriteIndex(0);
        }
      }
      else if (spritesAvatars.length > 0) {
        // 如果没有initialAvatarId但有立绘，使用第一个
        // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
        setCurrentSpriteIndex(0);
      }
      // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
      setLastInitialAvatarId(initialAvatarId);
    }
    // 如果是手动切换触发的，重置标记
    if (isManualSwitch) {
      // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
      setIsManualSwitch(false);
    }
  }, [initialAvatarId, spritesAvatars, lastInitialAvatarId, isManualSwitch]); // 依赖所有相关状态

  // 获取当前立绘
  const currentSprite = spritesAvatars[currentSpriteIndex];
  const spriteUrl = currentSprite?.spriteUrl || null;

  const [transform, setTransform] = useState<Transform>({
    scale: 1,
    positionX: 0,
    positionY: 0,
    alpha: 1,
    rotation: 0,
  });

  // 记录上一个currentSpriteIndex，用于检测立绘切换
  const [lastSpriteIndex, setLastSpriteIndex] = useState(currentSpriteIndex);

  // 切换到上一个立绘
  const handlePreviousSprite = () => {
    if (spritesAvatars.length > 1) {
      setIsManualSwitch(true);
      setCurrentSpriteIndex(prev => (prev - 1 + spritesAvatars.length) % spritesAvatars.length);
    }
  };

  // 切换到下一个立绘
  const handleNextSprite = () => {
    if (spritesAvatars.length > 1) {
      setIsManualSwitch(true);
      setCurrentSpriteIndex(prev => (prev + 1) % spritesAvatars.length);
    }
  };

  // 当立绘切换时，重置Transform
  useEffect(() => {
    if (currentSpriteIndex !== lastSpriteIndex) {
      // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
      setTransform({
        scale: 1,
        positionX: 0,
        positionY: 0,
        alpha: 1,
        rotation: 0,
      });
      // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
      setLastSpriteIndex(currentSpriteIndex);
    }
  }, [currentSpriteIndex, lastSpriteIndex]);

  // 当立绘URL变化时，加载到预览Canvas
  useEffect(() => {
    if (spriteUrl && previewCanvasRef.current) {
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

        img.src = spriteUrl;
      }
    }
  }, [spriteUrl, previewCanvasRef]);

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
                    setCurrentSpriteIndex(index);
                  }}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentSpriteIndex
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
                  characterName={characterName}
                  dialogContent={dialogContent}
                  onCropComplete={(croppedImageUrl) => {
                    // TODO: 处理裁剪完成的图片
                    console.warn("裁剪完成:", croppedImageUrl);
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
