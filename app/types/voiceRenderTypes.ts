/**
 * 语音渲染相关的类型定义
 * 用于消息级别的情感向量和立绘位置控制
 */

/**
 * 情感向量 - 8维情感控制
 * 对应顺序: [喜, 怒, 哀, 惧, 厌恶, 低落, 惊喜, 平静]
 */
export type EmotionVector = [number, number, number, number, number, number, number, number];

/**
 * 情感标签名称（与 IndexTTS 接口一致）
 */
export const EMOTION_LABELS = ["喜", "怒", "哀", "惧", "厌恶", "低落", "惊喜", "平静"] as const;

export type EmotionLabel = typeof EMOTION_LABELS[number];

/**
 * WebGAL 立绘位置
 * left: 左侧 (对应 -left 参数)
 * center: 中间 (对应 -center 或默认)
 * right: 右侧 (对应 -right 参数)
 */
export type FigurePosition = "left" | "center" | "right";

/**
 * 语音渲染设置
 * 可以添加到 MessageExtra 中
 */
export type VoiceRenderSettings = {
  /**
   * 情感向量 - 8维数组
   * 如果设置，渲染时会使用这个向量而不是从 avatarTitle 推断
   */
  emotionVector?: number[];

  /**
   * 立绘位置
   * 如果设置，渲染时会使用指定的位置
   */
  figurePosition?: FigurePosition;
};

/**
 * 扩展的 MessageExtra 类型（本地使用）
 * 与后端 MessageExtra 合并使用
 */
export type ExtendedMessageExtra = {
  voiceRenderSettings?: VoiceRenderSettings;
};

/**
 * 将情感向量对象转换为数组
 */
export function emotionRecordToVector(record: Record<string, string | number>): number[] {
  return EMOTION_LABELS.map((label) => {
    const value = record[label];
    if (typeof value === "number")
      return value;
    if (typeof value === "string")
      return Number.parseFloat(value) || 0;
    return 0;
  });
}

/**
 * 将情感向量数组转换为对象
 */
export function emotionVectorToRecord(vector: number[]): Record<EmotionLabel, number> {
  const record: Record<string, number> = {};
  EMOTION_LABELS.forEach((label, index) => {
    record[label] = vector[index] ?? 0;
  });
  return record as Record<EmotionLabel, number>;
}

/**
 * 归一化情感向量，确保总和不超过最大值
 */
export function normalizeEmotionVector(vector: number[], maxSum = 1.5): number[] {
  const currentSum = vector.reduce((sum, val) => sum + val, 0);
  if (currentSum <= maxSum)
    return vector;
  const scaleFactor = maxSum / currentSum;
  return vector.map(val => Math.round(val * scaleFactor * 10000) / 10000);
}

/**
 * 创建默认的情感向量（平静）
 */
export function createDefaultEmotionVector(): number[] {
  return [0, 0, 0, 0, 0, 0, 0, 0.5]; // 默认平静
}
