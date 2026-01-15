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
 * undefined: 不显示立绘
 */
export type FigurePosition = "left" | "center" | "right" | undefined;

/**
 * 消息类型常量
 * 与后端 MessageTypeEnum 保持一致
 */
export const MESSAGE_TYPE = {
  TEXT: 1,
  IMG: 2,
  FILE: 3,
  SYSTEM: 4,
  FORWARD: 5,
  DICE: 6,
  SOUND: 7,
  EFFECT: 8,
  /** 黑屏文字消息 - WebGAL intro 语法 */
  INTRO_TEXT: 9,
  /** WebGAL 指令消息（显式类型，不再使用 % 前缀协议） */
  WEBGAL_COMMAND: 10,
  /** WebGAL 变量变更消息（结构化，用于和 space 级持久化同步） */
  WEBGAL_VAR: 11,
  /** 跑团：检定/指令请求消息（点击后由他人“一键发送”执行） */
  COMMAND_REQUEST: 12,
  CLUE_CARD: 1000,
  READ_LINE: 10000,
  /** Thread 根消息（在主消息流里展示 thread 标题） */
  THREAD_ROOT: 10001,
} as const;

/**
 * WebGAL 预置动画名称
 */
export const PREDEFINED_ANIMATIONS = [
  "enter", // 淡入
  "exit", // 淡出
  "shake", // 摇动
  "enter-from-bottom", // 从下进入
  "enter-from-left", // 从左进入
  "enter-from-right", // 从右进入
  "move-front-and-back", // 前后移动
] as const;

export type PredefinedAnimation = typeof PREDEFINED_ANIMATIONS[number];

/**
 * WebGAL 动画目标（自动根据立绘位置推断）
 */
export const ANIMATION_TARGETS = [
  "fig-left", // 左侧立绘
  "fig-center", // 中间立绘
  "fig-right", // 右侧立绘
  "bg-main", // 主背景
] as const;

export type AnimationTarget = typeof ANIMATION_TARGETS[number] | string;

/**
 * 立绘动画设置
 * 可以附加到任意消息上，控制立绘的动画效果
 */
export type FigureAnimationSettings = {
  /**
   * 一次性动画效果（如 shake）
   * 对应 WebGAL: setAnimation:animationName -target=目标 -next;
   */
  animation?: PredefinedAnimation | string;

  /**
   * 进场动画
   * 对应 WebGAL: setTransition 的 -enter 参数
   */
  enterAnimation?: PredefinedAnimation | string;

  /**
   * 出场动画
   * 对应 WebGAL: setTransition 的 -exit 参数
   */
  exitAnimation?: PredefinedAnimation | string;
};

/**
 * 语音渲染设置（WebGAL 渲染配置）
 * 可以添加到 MessageExtra 中，控制消息的渲染效果
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

  /**
   * 立绘动画设置
   * 可以设置一次性动画（如 shake）或进出场动画
   */
  figureAnimation?: FigureAnimationSettings;
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
