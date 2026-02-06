import React from "react";

import { DoubleClickEditableText } from "@/components/common/DoubleClickEditableText";

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
  // 当前Transform״̬
  transform: Transform;
  // Transform状态更新函数
  setTransform: React.Dispatch<React.SetStateAction<Transform>>;
  // 是否禁用控制
  disabled?: boolean;
}

const REFERENCE_HEIGHT = 1440;
const REFERENCE_WIDTH = 2560;
const clampNumber = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Transform控制组件
 * 提供缩放、位置、透明度、旋转等控制功能
 */
export function TransformControl({
  transform,
  setTransform,
  disabled = false,
}: TransformControlProps) {
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
      {/* Scale控制 - 调整范围和步长，提供更精细的控制 */}
      <div className="flex items-center gap-3">
        <label className="text-xs w-16 shrink-0">缩放:</label>
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
        <DoubleClickEditableText
          value={transform.scale}
          disabled={disabled}
          className="w-12"
          displayClassName="block text-xs text-right"
          inputClassName="input input-xs w-full text-right"
          formatDisplay={value => value.toFixed(2)}
          formatInput={value => String(value)}
          parse={(rawValue) => {
            const nextValue = Number.parseFloat(rawValue);
            return Number.isFinite(nextValue) ? nextValue : null;
          }}
          invalidBehavior="revert"
          onCommit={nextValue => setTransform(prev => ({
            ...prev,
            scale: clampNumber(nextValue, 0.1, 4),
          }))}
          inputProps={{
            inputMode: "decimal",
            min: 0.1,
            max: 4,
            step: 0.05,
          }}
        />
      </div>

      {/* Position X控制 - 扩大范围以适应1280px的基准宽度 */}
      <div className="flex items-center gap-3">
        <label className="text-xs w-16 shrink-0">X位移:</label>
        <input
          type="range"
          min={-REFERENCE_WIDTH}
          max={REFERENCE_WIDTH}
          step="5"
          value={transform.positionX}
          onChange={e => setTransform(prev => ({ ...prev, positionX: Number.parseInt(e.target.value) }))}
          className="range range-xs range-info flex-1"
          disabled={disabled}
        />
        <DoubleClickEditableText
          value={transform.positionX}
          disabled={disabled}
          className="w-12"
          displayClassName="block text-xs text-right"
          inputClassName="input input-xs w-full text-right"
          formatDisplay={value => String(value)}
          formatInput={value => String(value)}
          parse={(rawValue) => {
            const nextValue = Number.parseInt(rawValue);
            return Number.isFinite(nextValue) ? nextValue : null;
          }}
          invalidBehavior="revert"
          onCommit={nextValue => setTransform(prev => ({
            ...prev,
            positionX: clampNumber(nextValue, -REFERENCE_WIDTH, REFERENCE_WIDTH),
          }))}
          inputProps={{
            inputMode: "numeric",
            min: -REFERENCE_WIDTH,
            max: REFERENCE_WIDTH,
            step: 5,
          }}
        />
      </div>

      {/* Position Y控制 - 扩大范围以适应720px的基准高度 */}
      <div className="flex items-center gap-3">
        <label className="text-xs w-16 shrink-0">Y位移:</label>
        <input
          type="range"
          min={-REFERENCE_HEIGHT}
          max={REFERENCE_HEIGHT}
          step="5"
          value={transform.positionY}
          onChange={e => setTransform(prev => ({ ...prev, positionY: Number.parseInt(e.target.value) }))}
          className="range range-xs range-info flex-1"
          disabled={disabled}
        />
        <DoubleClickEditableText
          value={transform.positionY}
          disabled={disabled}
          className="w-12"
          displayClassName="block text-xs text-right"
          inputClassName="input input-xs w-full text-right"
          formatDisplay={value => String(value)}
          formatInput={value => String(value)}
          parse={(rawValue) => {
            const nextValue = Number.parseInt(rawValue);
            return Number.isFinite(nextValue) ? nextValue : null;
          }}
          invalidBehavior="revert"
          onCommit={nextValue => setTransform(prev => ({
            ...prev,
            positionY: clampNumber(nextValue, -REFERENCE_HEIGHT, REFERENCE_HEIGHT),
          }))}
          inputProps={{
            inputMode: "numeric",
            min: -REFERENCE_HEIGHT,
            max: REFERENCE_HEIGHT,
            step: 5,
          }}
        />
      </div>

      {/* Alpha控制 - 步长改为0.05 */}
      <div className="flex items-center gap-3">
        <label className="text-xs w-16 shrink-0">透明度:</label>
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
        <DoubleClickEditableText
          value={transform.alpha}
          disabled={disabled}
          className="w-12"
          displayClassName="block text-xs text-right"
          inputClassName="input input-xs w-full text-right"
          formatDisplay={value => value.toFixed(2)}
          formatInput={value => String(value)}
          parse={(rawValue) => {
            const nextValue = Number.parseFloat(rawValue);
            return Number.isFinite(nextValue) ? nextValue : null;
          }}
          invalidBehavior="revert"
          onCommit={nextValue => setTransform(prev => ({
            ...prev,
            alpha: clampNumber(nextValue, 0, 1),
          }))}
          inputProps={{
            inputMode: "decimal",
            min: 0,
            max: 1,
            step: 0.05,
          }}
        />
      </div>

      {/* Rotation控制 - 步长改为5度 */}
      <div className="flex items-center gap-3">
        <label className="text-xs w-16 shrink-0">旋转:</label>
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
        <DoubleClickEditableText
          value={transform.rotation}
          disabled={disabled}
          className="w-12"
          displayClassName="block text-xs text-right"
          inputClassName="input input-xs w-full text-right"
          formatDisplay={value => `${value}°`}
          formatInput={value => String(value)}
          parse={(rawValue) => {
            const nextValue = Number.parseInt(rawValue);
            return Number.isFinite(nextValue) ? nextValue : null;
          }}
          invalidBehavior="revert"
          onCommit={nextValue => setTransform(prev => ({
            ...prev,
            rotation: clampNumber(nextValue, 0, 360),
          }))}
          inputProps={{
            inputMode: "numeric",
            min: 0,
            max: 360,
            step: 5,
          }}
        />
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
