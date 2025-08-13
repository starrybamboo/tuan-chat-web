import type { Transform } from "./TransformControl";
import { useEffect, useRef, useState } from "react";
import { RenderPreview } from "./RenderPreview";
import { TransformControl } from "./TransformControl";

interface SpriteRenderStudioProps {
  characterName: string;
  spriteUrl?: string | null;
  dialogContent?: string;
  className?: string;
  // 可选的外部 canvas 引用，用于从外部 canvas 获取立绘内容
  externalCanvasRef?: React.RefObject<HTMLCanvasElement | null>;
  // 头像ID，用于触发重新加载
  avatarId?: number;
}

/**
 * 立绘渲染工作室组件
 * 结合了渲染预览和变换控制功能，内部管理所有相关状态
 */
export function SpriteRenderStudio({
  characterName,
  spriteUrl,
  dialogContent = "这是一段示例对话内容。",
  className = "",
  externalCanvasRef,
  avatarId,
}: SpriteRenderStudioProps) {
  // 内部状态管理
  const internalCanvasRef = useRef<HTMLCanvasElement>(null);
  // 优先使用外部Canvas引用，否则使用内部引用
  const previewCanvasRef = externalCanvasRef || internalCanvasRef;

  const [transform, setTransform] = useState<Transform>({
    scale: 1,
    positionX: 0,
    positionY: 0,
    alpha: 1,
    rotation: 0,
  });

  // 图片加载状态
  const [isImageLoading, setIsImageLoading] = useState(false);
  // 记录上一个avatarId，用于检测角色切换
  const [lastAvatarId, setLastAvatarId] = useState(avatarId);
  // 记录加载开始时间，确保至少显示0.3秒
  const loadingStartTimeRef = useRef<number | null>(null);

  // 当角色切换时，重置Transform
  useEffect(() => {
    if (avatarId !== lastAvatarId) {
      // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
      setTransform({
        scale: 1,
        positionX: 0,
        positionY: 0,
        alpha: 1,
        rotation: 0,
      });
      // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
      setLastAvatarId(avatarId);
    }
  }, [avatarId, lastAvatarId]);

  // 当立绘URL变化时，加载到预览Canvas
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;

    if (spriteUrl && previewCanvasRef.current) {
      // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
      setIsImageLoading(true);
      loadingStartTimeRef.current = Date.now();

      const canvas = previewCanvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const img = new Image();
        img.crossOrigin = "anonymous";

        const finishLoading = () => {
          const elapsed = Date.now() - (loadingStartTimeRef.current || 0);
          const minLoadingTime = 300; // 最小加载时间300ms
          const remainingTime = Math.max(0, minLoadingTime - elapsed);

          timeoutId = setTimeout(() => {
            setIsImageLoading(false);
          }, remainingTime);
        };

        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          finishLoading();
        };

        img.onerror = () => {
          finishLoading();
        };

        img.src = spriteUrl;
      }
    }
    else if (!spriteUrl) {
      // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
      setIsImageLoading(false);
    }

    // 清理函数
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [spriteUrl, previewCanvasRef]);

  return (
    <div className={className}>
      <RenderPreview
        previewCanvasRef={previewCanvasRef}
        transform={transform}
        characterName={characterName}
        dialogContent={dialogContent}
      />
      <TransformControl
        transform={transform}
        setTransform={setTransform}
        previewCanvasRef={previewCanvasRef}
        disabled={isImageLoading}
      />
    </div>
  );
}
