export { MESSAGE_TYPE } from "@tuanchat/domain/message-type";

/**
 * WebGAL 立绘位置（自定义 5 槽位）
 * left: 左
 * left-center: 左中
 * center: 中
 * right-center: 右中
 * right: 右
 * undefined: 不显示立绘
 */
export const FIGURE_POSITION_ORDER = ["left", "left-center", "center", "right-center", "right"] as const;

export type FigurePositionKey = typeof FIGURE_POSITION_ORDER[number];

export type FigurePosition = FigurePositionKey | undefined;

export const FIGURE_POSITION_LABELS: Record<FigurePositionKey, string> = {
  "left": "左",
  "left-center": "左中",
  "center": "中",
  "right-center": "右中",
  "right": "右",
};

/** 自定义立绘位置 -> 位置 ID（1-5） */
export const FIGURE_POSITION_IDS: Record<FigurePositionKey, 1 | 2 | 3 | 4 | 5> = {
  "left": 1,
  "left-center": 2,
  "center": 3,
  "right-center": 4,
  "right": 5,
};

export type FigurePositionId = typeof FIGURE_POSITION_IDS[FigurePositionKey];

export function isFigurePosition(value: string | undefined): value is FigurePositionKey {
  return FIGURE_POSITION_ORDER.includes(value as FigurePositionKey);
}

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
  "1", // 左
  "2", // 左中
  "3", // 中
  "4", // 右中
  "5", // 右
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
