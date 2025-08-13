import type { Transform } from "./TransformControl";
import React from "react";

/**
 * 渲染预览组件的属性接口
 */
interface RenderPreviewProps {
  // 预览Canvas引用
  previewCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  // Transform状态
  transform: Transform;
  // 角色名称，用于遮罩中的显示
  characterName?: string;
  // 对话内容，用于遮罩中的显示
  dialogContent?: string;
}

/**
 * 渲染结果预览组件
 * 显示应用了Transform效果的立绘预览
 */
export function RenderPreview({
  previewCanvasRef,
  transform,
  characterName = "角色名",
  dialogContent = "对话内容",
}: RenderPreviewProps) {
  return (
    <>
      <div className="relative w-full aspect-video overflow-hidden bg-base-200">
        {/* 裁剪后的图像 - 左侧显示 */}
        <canvas
          ref={previewCanvasRef}
          className="absolute left-0 h-full object-contain"
          style={{
            objectPosition: "left center",
            transform: `scale(${transform.scale}) translate(${transform.positionX}px, ${transform.positionY}px) rotate(${transform.rotation}deg)`,
            opacity: transform.alpha,
          }}
        />
        {/* 底部1/3的黑色半透明遮罩 */}
        <div className="absolute bottom-0 w-full h-[30%] bg-black/50">
          <div className="absolute top-0 left-[6%] text-white">
            <p className="text-white leading-snug">
              <span className="block text-xs font-medium">{characterName}</span>
              <span className="block text-xs mt-1">{dialogContent}</span>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
