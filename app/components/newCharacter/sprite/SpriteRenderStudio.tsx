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
  }, [spriteUrl, avatarId, previewCanvasRef]);

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
      />
    </div>
  );
}
