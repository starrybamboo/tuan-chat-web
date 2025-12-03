import type { FigurePosition } from "@/types/voiceRenderTypes";

import { RoomContext } from "@/components/chat/roomContext";
import { EMOTION_LABELS, emotionRecordToVector, normalizeEmotionVector } from "@/types/voiceRenderTypes";
import { use, useCallback, useEffect, useMemo, useState } from "react";

interface VoiceRenderPanelProps {
  /** 当前情感向量（消息级别设置） */
  emotionVector?: number[];
  /** 当前立绘位置 */
  figurePosition?: FigurePosition;
  /** 头像的 avatarTitle，用于获取默认情感向量 */
  avatarTitle?: Record<string, string>;
  /** 此话不停顿（-notend） */
  notend?: boolean;
  /** 续接上段话（-concat） */
  concat?: boolean;
  /** 设置变更回调 */
  onChange: (emotionVector: number[], figurePosition: FigurePosition, notend: boolean, concat: boolean) => void;
  /** 是否可编辑 */
  canEdit?: boolean;
}

// 预设情感 - 使用中文标签
const emotionPresets: { name: string; vector: number[] }[] = [
  { name: "平静", vector: [0, 0, 0, 0, 0, 0, 0, 0.5] },
  { name: "开心", vector: [0.8, 0, 0, 0, 0, 0, 0.2, 0] },
  { name: "愤怒", vector: [0, 0.8, 0, 0, 0.2, 0, 0, 0] },
  { name: "悲伤", vector: [0, 0, 0.8, 0, 0, 0.2, 0, 0] },
  { name: "恐惧", vector: [0, 0, 0, 0.8, 0, 0.2, 0, 0] },
  { name: "惊讶", vector: [0, 0, 0, 0.2, 0, 0, 0.8, 0] },
  { name: "厌恶", vector: [0, 0, 0, 0, 0.8, 0.2, 0, 0] },
  { name: "低落", vector: [0, 0, 0.2, 0, 0, 0.8, 0, 0] },
];

/**
 * 内嵌的语音渲染设置面板
 * 立绘和情感直接显示，高级调节放在折叠里
 */
export function VoiceRenderPanel({
  emotionVector: initialVector,
  figurePosition: initialPosition,
  avatarTitle,
  notend: initialNotend,
  concat: initialConcat,
  onChange,
  canEdit = true,
}: VoiceRenderPanelProps) {
  const roomContext = use(RoomContext);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [localNotend, setLocalNotend] = useState(initialNotend ?? false);
  const [localConcat, setLocalConcat] = useState(initialConcat ?? false);

  // 从 avatarTitle 获取头像的默认情感向量
  const defaultVectorFromAvatar = useMemo(() => {
    if (!avatarTitle)
      return [0, 0, 0, 0, 0, 0, 0, 0];
    return emotionRecordToVector(avatarTitle);
  }, [avatarTitle]);

  // 当前使用的向量：优先使用消息级别设置，否则使用头像默认
  const effectiveVector = initialVector ?? defaultVectorFromAvatar;
  const hasMessageLevelVector = !!initialVector && initialVector.some(v => v > 0);

  const [localVector, setLocalVector] = useState<number[]>(effectiveVector);
  const [localPosition, setLocalPosition] = useState<FigurePosition>(initialPosition ?? "left");

  // 同步外部传入的值
  useEffect(() => {
    if (initialVector) {
      setLocalVector(initialVector);
    }
    else if (avatarTitle) {
      setLocalVector(emotionRecordToVector(avatarTitle));
    }
    if (initialPosition)
      setLocalPosition(initialPosition);
    setLocalNotend(initialNotend ?? false);
    setLocalConcat(initialConcat ?? false);
  }, [initialVector, initialPosition, avatarTitle, initialNotend, initialConcat]);

  const handleEmotionChange = useCallback((index: number, value: number) => {
    setLocalVector((prev) => {
      const newVector = [...prev];
      newVector[index] = Math.max(0, Math.min(1.4, value));
      return newVector;
    });
  }, []);

  const applyPreset = useCallback((vector: number[]) => {
    const newVector = [...vector];
    setLocalVector(newVector);
    onChange(normalizeEmotionVector(newVector, 1.5), localPosition, localNotend, localConcat);
  }, [localPosition, localNotend, localConcat, onChange]);

  const handlePositionChange = useCallback((pos: FigurePosition) => {
    setLocalPosition(pos);
    onChange(normalizeEmotionVector(localVector, 1.5), pos, localNotend, localConcat);
  }, [localVector, localNotend, localConcat, onChange]);

  const handleNotendChange = useCallback((checked: boolean) => {
    setLocalNotend(checked);
    onChange(normalizeEmotionVector(localVector, 1.5), localPosition, checked, localConcat);
  }, [localVector, localPosition, localConcat, onChange]);

  const handleConcatChange = useCallback((checked: boolean) => {
    setLocalConcat(checked);
    onChange(normalizeEmotionVector(localVector, 1.5), localPosition, localNotend, checked);
  }, [localVector, localPosition, localNotend, onChange]);

  const handleSave = useCallback(() => {
    onChange(normalizeEmotionVector(localVector, 1.5), localPosition, localNotend, localConcat);
  }, [localVector, localPosition, localNotend, localConcat, onChange]);

  const handleClear = useCallback(() => {
    setLocalVector([0, 0, 0, 0, 0, 0, 0, 0]);
    setLocalPosition("left");
    setLocalNotend(false);
    setLocalConcat(false);
    onChange([0, 0, 0, 0, 0, 0, 0, 0], "left", false, false);
  }, [onChange]);

  // 如果未开启 WebGAL 联动模式，不显示面板
  if (!roomContext.webgalLinkMode) {
    return null;
  }

  // hasSettings 只检查消息级别是否有自定义设置
  const hasCustomSettings = hasMessageLevelVector || initialPosition;
  // 当前是否有情感（包括头像默认的）
  const hasEmotion = localVector.some(v => v > 0);

  // 找出最主要的情感
  const mainEmotionIndex = localVector.indexOf(Math.max(...localVector));
  const mainEmotion = localVector[mainEmotionIndex] > 0 ? EMOTION_LABELS[mainEmotionIndex] : null;

  // 计算当前总和
  const currentSum = localVector.reduce((sum, val) => sum + val, 0);
  const isOverLimit = currentSum > 1.5;

  // 判断当前选中的预设
  const currentPreset = emotionPresets.find(
    p => JSON.stringify(localVector) === JSON.stringify(p.vector),
  );

  if (!canEdit) {
    // 只读模式：显示当前设置的简要信息
    if (!hasEmotion && !initialPosition)
      return null;
    return (
      <div className="flex items-center gap-1 text-xs text-base-content/60 mt-1">
        <span className="opacity-60">
          {localPosition === "left" ? "←" : localPosition === "center" ? "○" : "→"}
        </span>
        {mainEmotion && (
          <span>
            {mainEmotion}
            {!hasMessageLevelVector && <span className="opacity-50">(默认)</span>}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="mt-2 text-xs">
      {/* 第一行：立绘位置 + 情感预设 */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* 立绘位置 - 紧凑的按钮组 */}
        <div className="flex items-center gap-1">
          <span className="text-base-content/60">位置</span>
          <div className="join">
            {(["left", "center", "right"] as FigurePosition[]).map(pos => (
              <button
                key={pos}
                type="button"
                className={`join-item btn btn-xs px-2 ${localPosition === pos ? "btn-primary" : "btn-ghost"}`}
                onClick={() => handlePositionChange(pos)}
              >
                {pos === "left" ? "左" : pos === "center" ? "中" : "右"}
              </button>
            ))}
          </div>
        </div>

        <span className="text-base-content/30">|</span>

        {/* 对话参数：-notend 和 -concat */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 cursor-pointer select-none hover:text-primary transition-colors">
            <input
              type="checkbox"
              className="checkbox checkbox-xs checkbox-primary rounded-none"
              checked={localNotend}
              onChange={e => handleNotendChange(e.target.checked)}
            />
            <span className="tooltip tooltip-bottom" data-tip="此话不停顿，文字展示完立即执行下一句">不停顿</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer select-none hover:text-primary transition-colors">
            <input
              type="checkbox"
              className="checkbox checkbox-xs checkbox-primary rounded-none"
              checked={localConcat}
              onChange={e => handleConcatChange(e.target.checked)}
            />
            <span className="tooltip tooltip-bottom" data-tip="续接上段话，本句对话连接在上一句对话之后">续接</span>
          </label>
        </div>

        <span className="text-base-content/30">|</span>

        {/* 情感预设 - 紧凑的按钮组 */}
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-base-content/60">情感</span>
          {emotionPresets.map(preset => (
            <button
              key={preset.name}
              type="button"
              className={`btn btn-xs px-2 ${
                currentPreset?.name === preset.name ? "btn-primary" : "btn-ghost"
              }`}
              onClick={() => applyPreset(preset.vector)}
            >
              {preset.name}
            </button>
          ))}
        </div>

        {/* 高级调节触发器 + 清除按钮 */}
        <div className="flex items-center gap-1 ml-auto">
          <button
            type="button"
            className={`btn btn-xs btn-ghost ${showAdvanced ? "text-primary" : ""}`}
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            高级
            <span className={`transition-transform ${showAdvanced ? "rotate-180" : ""}`}>▼</span>
          </button>
          {hasCustomSettings && (
            <button
              type="button"
              className="btn btn-xs btn-ghost text-error"
              onClick={handleClear}
              title="清除自定义设置，恢复头像默认"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 高级调节面板（折叠） */}
      {showAdvanced && (
        <div className="mt-2 p-2 bg-base-200/50 rounded-lg border border-base-300 space-y-2">
          {EMOTION_LABELS.map((label, index) => (
            <div key={label} className="flex items-center gap-2">
              <span className="w-8 text-xs text-base-content/70">{label}</span>
              <input
                type="range"
                min="0"
                max="1.4"
                step="0.1"
                title={`${label}情感强度`}
                value={localVector[index] ?? 0}
                onChange={e => handleEmotionChange(index, Number.parseFloat(e.target.value))}
                className="range range-xs range-primary flex-1"
              />
              <span className="w-6 text-xs text-right tabular-nums text-base-content/60">
                {(localVector[index] ?? 0).toFixed(1)}
              </span>
            </div>
          ))}

          {/* 总和提示和应用按钮 */}
          <div className={`flex justify-between items-center pt-1 ${isOverLimit ? "text-error" : "text-base-content/50"}`}>
            <span className="text-xs">
              总和:
              {currentSum.toFixed(2)}
              /1.5
            </span>
            <button
              type="button"
              className="btn btn-xs btn-primary"
              onClick={handleSave}
            >
              应用
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
