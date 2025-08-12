import type { Transform } from "./TransformControl";
import { useRef, useState } from "react";
import { RenderPreview } from "./RenderPreview";
import { TransformControl } from "./TransformControl";

interface SpriteRenderStudioProps {
  characterName: string;
  spriteUrl?: string | null;
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
  dialogContent = "这是一段示例对话内容。",
  className = "",
  externalCanvasRef,
}: SpriteRenderStudioProps) {
  // 内部状态管理
  const previewCanvasRef = useRef<HTMLCanvasElement>(externalCanvasRef?.current || null);
  const [transform, setTransform] = useState<Transform>({
    scale: 1,
    positionX: 0,
    positionY: 0,
    alpha: 1,
    rotation: 0,
  });

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
