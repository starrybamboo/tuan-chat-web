import type { Transform } from "./TransformControl";
import React, { useEffect, useMemo, useRef, useState } from "react"; // 引入 React Hooks

// --- 关键步骤 1: 定义你的基准尺寸 ---
// 假设所有的 transform 值都是在 1280x720 (16:9) 的画布上设定的
const REFERENCE_WIDTH = 2560;
const REFERENCE_HEIGHT = 1440;

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
  // --- 关键步骤 2: 创建 ref 和 state ---
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // --- 关键步骤 3: 使用 ResizeObserver 监听容器尺寸变化 ---
  useEffect(() => {
    const container = containerRef.current;
    if (!container)
      return;

    // 创建一个观察者实例，当容器尺寸变化时更新 state
    const resizeObserver = new ResizeObserver((entries) => {
      // 通常只有一个 entry
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
      }
    });

    // 开始观察目标元素
    resizeObserver.observe(container);

    // 组件卸载时停止观察，防止内存泄漏
    return () => resizeObserver.disconnect();
  }, []); // 空依赖数组，确保 effect 只运行一次来设置观察者

  // 计算缩放比例, 二者应该是相等的
  const scaleX = containerSize.width / REFERENCE_WIDTH;
  const scaleY = containerSize.height / REFERENCE_HEIGHT;

  // --- 关键步骤 4: 根据当前容器尺寸计算缩放后的 transform ---
  const scaledTransform = useMemo(() => {
    // 在容器尺寸未知时（初始渲染），避免除以0，直接返回原始transform
    if (containerSize.width === 0 || containerSize.height === 0) {
      return transform;
    }

    // 返回一个新的 transform 对象，其中位置信息已被缩放
    // 注意：scale, rotation, alpha 保持不变，因为它们本身就是相对值
    return {
      ...transform,
      positionX: transform.positionX * scaleX,
      positionY: transform.positionY * scaleY,
    };
  }, [transform, containerSize]); // 当 transform 或 containerSize 变化时重新计算

  return (
    <>
      <div ref={containerRef} className="relative aspect-video overflow-hidden bg-black">
        {/* 裁剪后的图像 - 左侧显示 */}
        <canvas
          ref={previewCanvasRef}
          className="absolute left-0 h-full object-contain"
          style={{
            objectPosition: "left center",
            transform: `translate(${scaledTransform.positionX}px, ${scaledTransform.positionY}px) scale(${scaledTransform.scale}) rotate(${scaledTransform.rotation}deg)`,
            opacity: scaledTransform.alpha,
          }}
        />
        {/* 底部1/3的黑色半透明遮罩 */}
        <div className="absolute bottom-[1%] left-[1%] right-[1%] h-[29%] bg-black/30 rounded">
          <div className="absolute top-0 left-[8%] text-white">
            <p className="text-white leading-snug">
              <span className="block font-medium mt-[3%] text-transparent bg-clip-text bg-gradient-to-b from-white to-cyan-100" style={{ fontSize: `${55 * scaleX}px` }}>{characterName}</span>
              <span className="block mt-[1%]" style={{ fontSize: `${55 * scaleX}px` }}>{dialogContent}</span>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
