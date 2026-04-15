export type DicerMessageVisibility = "public" | "kp_and_sender";

export function resolveCommandMessageVisibility(
  replyVisibilities: readonly DicerMessageVisibility[],
): DicerMessageVisibility {
  void replyVisibilities;
  // 原始指令消息需要保留在公屏里作为操作痕迹，暗骰只隐藏骰娘回复本身。
  return "public";
}
