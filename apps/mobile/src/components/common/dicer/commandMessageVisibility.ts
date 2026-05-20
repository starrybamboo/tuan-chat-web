export type DicerMessageVisibility = "public" | "kp_and_sender";

export function resolveCommandMessageVisibility(
  replyVisibilities: readonly DicerMessageVisibility[],
): DicerMessageVisibility {
  void replyVisibilities;
  return "public";
}
