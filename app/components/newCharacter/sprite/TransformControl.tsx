import React from "react";

/**
 * Transform状态接口
 */
export interface Transform {
  scale: number;
  positionX: number;
  positionY: number;
  alpha: number;
  rotation: number;
}

/**
 * Transform控制组件的属性接口
 */
interface TransformControlProps {
  // 当前Transform状态
  transform: Transform;
  // Transform状态更新函数
  setTransform: React.Dispatch<React.SetStateAction<Transform>>;
  // 预览Canvas引用，用于贴底对齐计算
  previewCanvasRef: React.RefObject<HTMLCanvasElement | null>;
}

/**
 * Transform控制组件
 * 提供缩放、位置、透明度、旋转等控制功能
 */
export function TransformControl({ transform, setTransform, previewCanvasRef }: TransformControlProps) {
  /**
   * 重置所有Transform参数到默认值
   */
  const handleReset = () => {
    setTransform({ scale: 1, positionX: 0, positionY: 0, alpha: 1, rotation: 0 });
  };

  /**
   * 计算并执行贴底对齐
   * 将图片底部对齐到容器底部
   */
  const handleBottomAlign = () => {
    const canvas = previewCanvasRef.current;
    if (canvas) {
      // 获取canvas的实际显示尺寸和父容器尺寸
      const canvasRect = canvas.getBoundingClientRect();
      const parentRect = canvas.parentElement?.getBoundingClientRect();

      if (parentRect) {
        // 计算需要的Y偏移，使图片底部贴到容器底部
        const containerHeight = parentRect.height;
        const scaledCanvasHeight = canvasRect.height * transform.scale;
        const yOffset = (containerHeight - scaledCanvasHeight) / 2;

        setTransform(prev => ({
          ...prev,
          positionY: Math.round(yOffset),
          rotation: 0,
        }));
      }
    }
  };

  return (
    <div className="w-full mt-4 p-4 bg-base-200 rounded-lg space-y-3">
      <h3 className="text-sm font-semibold text-center">Transform 控制</h3>

      {/* Scale控制 */}
      <div className="flex items-center gap-3">
        <label className="text-xs w-16 flex-shrink-0">Scale:</label>
        <input
          type="range"
          min="0.5"
          max="2"
          step="0.1"
          value={transform.scale}
          onChange={e => setTransform(prev => ({ ...prev, scale: Number.parseFloat(e.target.value) }))}
          className="range range-xs range-info flex-1"
        />
        <span className="text-xs w-12 text-right">{transform.scale.toFixed(1)}</span>
      </div>

      {/* Position X控制 */}
      <div className="flex items-center gap-3">
        <label className="text-xs w-16 flex-shrink-0">X位置:</label>
        <input
          type="range"
          min="-100"
          max="100"
          step="5"
          value={transform.positionX}
          onChange={e => setTransform(prev => ({ ...prev, positionX: Number.parseInt(e.target.value) }))}
          className="range range-xs range-info flex-1"
        />
        <span className="text-xs w-12 text-right">{transform.positionX}</span>
      </div>

      {/* Position Y控制 */}
      <div className="flex items-center gap-3">
        <label className="text-xs w-16 flex-shrink-0">Y位置:</label>
        <input
          type="range"
          min="-100"
          max="100"
          step="5"
          value={transform.positionY}
          onChange={e => setTransform(prev => ({ ...prev, positionY: Number.parseInt(e.target.value) }))}
          className="range range-xs range-info flex-1"
        />
        <span className="text-xs w-12 text-right">{transform.positionY}</span>
      </div>

      {/* Alpha控制 */}
      <div className="flex items-center gap-3">
        <label className="text-xs w-16 flex-shrink-0">透明度:</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={transform.alpha}
          onChange={e => setTransform(prev => ({ ...prev, alpha: Number.parseFloat(e.target.value) }))}
          className="range range-xs range-info flex-1"
        />
        <span className="text-xs w-12 text-right">{transform.alpha.toFixed(1)}</span>
      </div>

      {/* Rotation控制 */}
      <div className="flex items-center gap-3">
        <label className="text-xs w-16 flex-shrink-0">旋转:</label>
        <input
          type="range"
          min="0"
          max="360"
          step="15"
          value={transform.rotation}
          onChange={e => setTransform(prev => ({ ...prev, rotation: Number.parseInt(e.target.value) }))}
          className="range range-xs range-info flex-1"
        />
        <span className="text-xs w-12 text-right">
          {transform.rotation}
          °
        </span>
      </div>

      {/* 控制按钮组 */}
      <div className="flex justify-center gap-2 mt-3">
        <button
          className="btn btn-xs btn-outline"
          onClick={handleReset}
          type="button"
        >
          重置Transform
        </button>
        <button
          className="btn btn-xs btn-outline"
          onClick={handleBottomAlign}
          type="button"
        >
          贴底对齐
        </button>
      </div>
    </div>
  );
}
