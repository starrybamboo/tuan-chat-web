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
  // 是否禁用控制
  disabled?: boolean;
}

const REFERENCE_HEIGHT = 720;

/**
 * Transform控制组件
 * 提供缩放、位置、透明度、旋转等控制功能
 */
export function TransformControl({ transform, setTransform, disabled = false }: TransformControlProps) {
  /**
   * 重置所有Transform参数到默认值
   */
  const handleReset = () => {
    setTransform({ scale: 1, positionX: 0, positionY: 0, alpha: 1, rotation: 0 });
  };

  /**
   * 计算并执行贴底对齐 (已修复)
   * 在参考坐标系中计算，不再依赖DOM测量
   */
  const handleBottomAlign = () => {
    // 我们的画布在参考坐标系中的中心点是 Y = REFERENCE_HEIGHT / 2
    // 画布缩放后的半高是 (REFERENCE_HEIGHT * transform.scale) / 2
    // 我们需要计算一个 positionY，使得：
    // 中心点 + positionY + 缩放后半高 = 参考系底部 (REFERENCE_HEIGHT)
    // (REFERENCE_HEIGHT / 2) + positionY + (REFERENCE_HEIGHT * transform.scale / 2) = REFERENCE_HEIGHT
    // 解出 positionY:
    const newPositionY = (REFERENCE_HEIGHT / 2) - ((REFERENCE_HEIGHT * transform.scale) / 2);
    // 简化后: const newPositionY = (REFERENCE_HEIGHT / 2) * (1 - transform.scale);

    setTransform(prev => ({
      ...prev,
      positionY: Math.round(newPositionY),
      rotation: 0,
    }));
  };

  return (
    <div className={`w-full p-4 bg-base-200 rounded-lg space-y-3 ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
      <h3 className="text-sm font-semibold text-center">Transform 控制</h3>

      {/* Scale控制 - 调整范围和步长，提供更精细的控制 */}
      <div className="flex items-center gap-3">
        <label className="text-xs w-16 flex-shrink-0">缩放:</label>
        <input
          type="range"
          min="0.1" // (修改) 避免完全消失
          max="4" // (修改) 提供更大的放大范围
          step="0.05" // (修改) 更精细的步长
          value={transform.scale}
          onChange={e => setTransform(prev => ({ ...prev, scale: Number.parseFloat(e.target.value) }))}
          className="range range-xs range-info flex-1"
          disabled={disabled}
        />
        <span className="text-xs w-12 text-right">{transform.scale.toFixed(2)}</span>
      </div>

      {/* Position X控制 - 扩大范围以适应1280px的基准宽度 */}
      <div className="flex items-center gap-3">
        <label className="text-xs w-16 flex-shrink-0">X位置:</label>
        <input
          type="range"
          min="-600" // (修改) 允许移动到屏幕外
          max="600" // (修改)
          step="5"
          value={transform.positionX}
          onChange={e => setTransform(prev => ({ ...prev, positionX: Number.parseInt(e.target.value) }))}
          className="range range-xs range-info flex-1"
          disabled={disabled}
        />
        <span className="text-xs w-12 text-right">{transform.positionX}</span>
      </div>

      {/* Position Y控制 - 扩大范围以适应720px的基准高度 */}
      <div className="flex items-center gap-3">
        <label className="text-xs w-16 flex-shrink-0">Y位置:</label>
        <input
          type="range"
          min="-400" // (修改)
          max="400" // (修改)
          step="5"
          value={transform.positionY}
          onChange={e => setTransform(prev => ({ ...prev, positionY: Number.parseInt(e.target.value) }))}
          className="range range-xs range-info flex-1"
          disabled={disabled}
        />
        <span className="text-xs w-12 text-right">{transform.positionY}</span>
      </div>

      {/* Alpha控制 - 步长改为0.05 */}
      <div className="flex items-center gap-3">
        <label className="text-xs w-16 flex-shrink-0">透明度:</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05" // (修改)
          value={transform.alpha}
          onChange={e => setTransform(prev => ({ ...prev, alpha: Number.parseFloat(e.target.value) }))}
          className="range range-xs range-info flex-1"
          disabled={disabled}
        />
        <span className="text-xs w-12 text-right">{transform.alpha.toFixed(2)}</span>
      </div>

      {/* Rotation控制 - 步长改为5度 */}
      <div className="flex items-center gap-3">
        <label className="text-xs w-16 flex-shrink-0">旋转:</label>
        <input
          type="range"
          min="0"
          max="360"
          step="5" // (修改)
          value={transform.rotation}
          onChange={e => setTransform(prev => ({ ...prev, rotation: Number.parseInt(e.target.value) }))}
          className="range range-xs range-info flex-1"
          disabled={disabled}
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
          disabled={disabled}
        >
          重置Transform
        </button>
        <button
          className="btn btn-xs btn-outline"
          onClick={handleBottomAlign}
          type="button"
          disabled={disabled}
        >
          贴底对齐
        </button>
      </div>
    </div>
  );
}
